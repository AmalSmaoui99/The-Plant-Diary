export type PlantSpecies = {
  id: number;

  common_name: string;
  scientific_name: string[];

  watering?: string;

  watering_general_benchmark?: {
    value: string | number;
    unit: string;
  } | null;

  sunlight?: string[];

  default_image?: {
    thumbnail?: string;
    small_url?: string;
    medium_url?: string;
    regular_url?: string;
  } | null;
};