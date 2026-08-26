export type CareEventType =
  | "watered"
  | "soil_still_moist"
  | "fertilized"
  | "repotted"
  | "pruned";

export type CareEvent = {
  id: string;
  plant_id: string;
  event_type: CareEventType;
  event_date: string;
  notes?: string | null;
  created_at?: string;
};