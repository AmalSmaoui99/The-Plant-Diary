export type PlantSeason =
  | "summer"
  | "winter";

export function getCurrentPlantSeason(): PlantSeason {
  const month =
    new Date().getMonth() + 1;

  if (month >= 4 && month <= 9) {
    return "summer";
  }

  return "winter";
}