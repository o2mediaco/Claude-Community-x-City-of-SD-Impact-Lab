import { NextRequest, NextResponse } from "next/server";
import { getRecords } from "@/lib/csv-cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const categories = searchParams.getAll("category");

    const records = getRecords();
    const features: any[] = [];

    for (const r of records) {
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lng);
      if (!lat || !lng) continue;

      if (categories.length > 0) {
        const desc = r.naics_description?.trim();
        if (!desc || !categories.includes(desc)) continue;
      }

      // Extract YYYY-MM from creation date
      const dateStr = r.date_account_creation || "";
      const month = dateStr.length >= 7 ? dateStr.slice(0, 7) : "";

      features.push({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [lng, lat] },
        properties: { month, category: r.naics_description?.trim() || "" },
      });
    }

    const geojson = {
      type: "FeatureCollection" as const,
      features,
    };

    return NextResponse.json(geojson);
  } catch {
    return NextResponse.json({ error: "Failed to load locations" }, { status: 500 });
  }
}
