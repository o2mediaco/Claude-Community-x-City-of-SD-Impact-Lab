import { NextRequest, NextResponse } from "next/server";
import { getMarketOverview } from "@/lib/aggregations";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const startMonth = searchParams.get("startMonth") || undefined;
    const endMonth = searchParams.get("endMonth") || undefined;

    const data = getMarketOverview(startMonth, endMonth);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to compute market overview" }, { status: 500 });
  }
}
