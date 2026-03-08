import { NextResponse } from "next/server";
import { getCategoryList } from "@/lib/aggregations";

export async function GET() {
  try {
    const categories = getCategoryList();
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}
