import Papa from "papaparse";
import fs from "fs";
import path from "path";
import type { BusinessRecord } from "./types";

let cachedRecords: BusinessRecord[] | null = null;

export function getRecords(): BusinessRecord[] {
  if (cachedRecords) return cachedRecords;

  const csvPath = path.join(process.cwd(), "..", "sd_businesses_active_datasd.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");

  const result = Papa.parse<BusinessRecord>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  cachedRecords = result.data;
  return cachedRecords;
}
