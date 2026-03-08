import { getRecords } from "./csv-cache";
import type { BusinessRecord, MonthlyDataPoint, CategoryStat, LeaderboardEntry } from "./types";

function toMonthKey(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : null;
}

export function getCategoryList(): { name: string; count: number }[] {
  const records = getRecords();
  const counts = new Map<string, number>();

  for (const r of records) {
    const desc = r.naics_description?.trim();
    if (!desc) continue;
    counts.set(desc, (counts.get(desc) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function getMonthRange(records: BusinessRecord[], startMonth?: string, endMonth?: string): string[] {
  let minMonth = "9999-99";
  let maxMonth = "0000-00";

  for (const r of records) {
    const mk = toMonthKey(r.date_account_creation);
    if (!mk) continue;
    if (mk < minMonth) minMonth = mk;
    if (mk > maxMonth) maxMonth = mk;
  }

  if (startMonth && startMonth > minMonth) minMonth = startMonth;
  if (endMonth && endMonth < maxMonth) maxMonth = endMonth;

  const months: string[] = [];
  let [year, month] = minMonth.split("-").map(Number);
  const [endYear, endMo] = maxMonth.split("-").map(Number);

  while (year < endYear || (year === endYear && month <= endMo)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

export function getMonthlyTrends(
  categories: string[],
  startMonth?: string,
  endMonth?: string
): { data: MonthlyDataPoint[]; stats: CategoryStat[] } {
  const records = getRecords();

  // Filter records for the requested categories
  const categoryRecords = new Map<string, BusinessRecord[]>();
  for (const cat of categories) {
    categoryRecords.set(cat, []);
  }

  for (const r of records) {
    const desc = r.naics_description?.trim();
    if (desc && categoryRecords.has(desc)) {
      categoryRecords.get(desc)!.push(r);
    }
  }

  // Get month range from ALL records for consistency
  const allMonths = getMonthRange(records, startMonth, endMonth);

  // Build monthly counts per category
  const monthlyCounts = new Map<string, Map<string, number>>();
  for (const cat of categories) {
    const catMonths = new Map<string, number>();
    for (const m of allMonths) catMonths.set(m, 0);

    for (const r of categoryRecords.get(cat)!) {
      const mk = toMonthKey(r.date_account_creation);
      if (mk && catMonths.has(mk)) {
        catMonths.set(mk, (catMonths.get(mk) || 0) + 1);
      }
    }
    monthlyCounts.set(cat, catMonths);
  }

  // Build data points
  const data: MonthlyDataPoint[] = allMonths.map((month) => {
    const point: MonthlyDataPoint = { month };
    for (const cat of categories) {
      point[cat] = monthlyCounts.get(cat)!.get(month) || 0;
    }
    return point;
  });

  // Calculate stats
  const stats: CategoryStat[] = categories.map((cat) => {
    const catMonths = monthlyCounts.get(cat)!;
    const entries = Array.from(catMonths.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const values = entries.map(([, v]) => v);
    const nonZeroValues = values.filter((v) => v > 0);

    let peakMonth = "";
    let peakCount = 0;
    for (const [m, c] of entries) {
      if (c > peakCount) {
        peakCount = c;
        peakMonth = m;
      }
    }

    const totalActive = categoryRecords.get(cat)!.length;
    const avgMonthlyRate = nonZeroValues.length > 0
      ? nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length
      : 0;

    // Trend: compare last 3 months avg vs prior 3 months avg
    const recent3 = values.slice(-3);
    const prior3 = values.slice(-6, -3);
    const recentAvg = recent3.length > 0 ? recent3.reduce((a, b) => a + b, 0) / recent3.length : 0;
    const priorAvg = prior3.length > 0 ? prior3.reduce((a, b) => a + b, 0) / prior3.length : 0;
    const recentMonthlyChange = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : 0;

    let trendDirection: "up" | "down" | "flat" = "flat";
    if (recentMonthlyChange > 10) trendDirection = "up";
    else if (recentMonthlyChange < -10) trendDirection = "down";

    return {
      category: cat,
      totalActive,
      avgMonthlyRate: Math.round(avgMonthlyRate * 10) / 10,
      peakMonth,
      peakCount,
      trendDirection,
      recentMonthlyChange: Math.round(recentMonthlyChange * 10) / 10,
    };
  });

  return { data, stats };
}

export function getMarketOverview(startMonth?: string, endMonth?: string): MonthlyDataPoint[] {
  const records = getRecords();
  const allMonths = getMonthRange(records, startMonth, endMonth);

  const monthlyCounts = new Map<string, number>();
  for (const m of allMonths) monthlyCounts.set(m, 0);

  for (const r of records) {
    const mk = toMonthKey(r.date_account_creation);
    if (mk && monthlyCounts.has(mk)) {
      monthlyCounts.set(mk, (monthlyCounts.get(mk) || 0) + 1);
    }
  }

  return allMonths.map((month) => ({
    month,
    total: monthlyCounts.get(month) || 0,
  }));
}

export function getLeaderboard(months: number = 12, limit: number = 20): LeaderboardEntry[] {
  const records = getRecords();

  // Calculate cutoff month
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}`;

  const counts = new Map<string, number>();
  for (const r of records) {
    const mk = toMonthKey(r.date_account_creation);
    if (!mk || mk < cutoffKey) continue;
    const desc = r.naics_description?.trim();
    if (!desc) continue;
    counts.set(desc, (counts.get(desc) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, count], i) => ({ category, count, rank: i + 1 }));
}
