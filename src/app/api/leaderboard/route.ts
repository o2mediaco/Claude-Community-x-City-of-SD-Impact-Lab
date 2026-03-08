import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/aggregations";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const months = parseInt(searchParams.get("months") || "12", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const data = getLeaderboard(months, limit);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to compute leaderboard" }, { status: 500 });
  }
}
