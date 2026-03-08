import { NextRequest, NextResponse } from "next/server";
import { getMonthlyTrends } from "@/lib/aggregations";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const categories = searchParams.getAll("category");
    const startMonth = searchParams.get("startMonth") || undefined;
    const endMonth = searchParams.get("endMonth") || undefined;

    if (categories.length === 0) {
      return NextResponse.json({ error: "At least one category is required" }, { status: 400 });
    }
    if (categories.length > 3) {
      return NextResponse.json({ error: "Maximum 3 categories allowed" }, { status: 400 });
    }

    const result = getMonthlyTrends(categories, startMonth, endMonth);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to compute trends" }, { status: 500 });
  }
}
