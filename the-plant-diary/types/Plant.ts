export type Plant = {
  id: string;

  nickname: string;
  species: string;

  common_name: string | null;

  perenual_id: number | null;
  flora_plant_id: number | null;

  image_url: string | null;
  image_path: string | null;

  icon: string;
  status: string;

  watering_check_days: number;

  fertilizer_interval_days: number | null;
  fertilizer_enabled: boolean;

  care_source: string | null;
  care_confidence: string | null;

  light_requirement_level: string | null;

  min_lux: number | null;
  max_lux: number | null;

  min_temp_celsius: number | null;
  max_temp_celsius: number | null;

  ideal_humidity_percent: number | null;

  created_at?: string;
};