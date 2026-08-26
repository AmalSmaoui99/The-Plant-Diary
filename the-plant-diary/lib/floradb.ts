import fs from "fs";
import path from "path";
import Papa from "papaparse";

import { FloraPlant } from "@/types/FloraPlant";

let cachedPlants: FloraPlant[] | null = null;

export function getFloraPlants(): FloraPlant[] {
  if (cachedPlants) {
    return cachedPlants;
  }

  const filePath = path.join(
    process.cwd(),
    "data",
    "floradb_sample.csv"
  );

  const csv = fs.readFileSync(filePath, "utf8");

  const parsed = Papa.parse<FloraPlant>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (parsed.errors.length > 0) {
    console.warn(
      "FloraDB CSV parsing warnings:",
      parsed.errors
    );
  }

  cachedPlants = parsed.data;

  return cachedPlants;
}

export function findFloraPlant(
  scientificName: string
): FloraPlant | null {
  const plants = getFloraPlants();

  const normalizedName =
    scientificName.trim().toLowerCase();

  const match = plants.find((plant) => {
    const scientific =
      plant.scientific_name
        ?.trim()
        .toLowerCase();

    const synonym =
      plant.synonym_scientific_name
        ?.trim()
        .toLowerCase();

    return (
      scientific === normalizedName ||
      synonym === normalizedName
    );
  });

  return match ?? null;
}