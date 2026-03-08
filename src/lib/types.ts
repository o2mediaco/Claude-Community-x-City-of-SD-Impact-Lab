export interface BusinessRecord {
  account_key: string;
  account_status: string;
  date_account_creation: string;
  date_cert_expiration: string;
  date_cert_effective: string;
  business_owner_name: string;
  ownership_type: string;
  date_business_start: string;
  dba_name: string;
  naics_sector: string;
  naics_code: string;
  naics_description: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  council_district: string;
  lat: string;
  lng: string;
}

export interface MilestoneEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  categories: string[]; // empty = global event
}

export interface MonthlyDataPoint {
  month: string; // YYYY-MM
  [category: string]: number | string;
}

export interface CategoryStat {
  category: string;
  totalActive: number;
  avgMonthlyRate: number;
  peakMonth: string;
  peakCount: number;
  trendDirection: "up" | "down" | "flat";
  recentMonthlyChange: number;
}

export interface LeaderboardEntry {
  category: string;
  count: number;
  rank: number;
}
