export type FloraPlant = {
  plant_id: number;

  scientific_name: string;
  synonym_scientific_name?: string | null;
  common_name: string;
  family: string;

  light_requirement_level: string;

  min_lux: number;
  max_lux: number;

  watering_frequency_days: number;

  min_temp_celsius: number;
  max_temp_celsius: number;

  ideal_humidity_percent: number;

  care_confidence: string;

  image_url?: string | null;

  gbif_usage_key?: number;
  gbif_source_url?: string;
};