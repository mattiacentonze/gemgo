import { seasonForDate } from "./catalogue-editorial.ts";
import type { Experience, TransportMode } from "./types";

export const BASE_VISIT_POINTS = 60;
export const OFF_PEAK_BONUS = 15;
export const TRANSPORT_BONUS: Record<TransportMode, number> = {
  walking: 20,
  bicycle: 15,
  public: 10,
  mixed: 5,
  car: 0,
};

export const calculateVisitPoints = (
  experience: Experience,
  transport: TransportMode,
  visitDate?: string,
) => {
  const season = seasonForDate(visitDate);
  const suitable = !experience.seasons?.length || experience.seasons.includes(season);
  const isOffPeak = suitable && Boolean(experience.peakSeasons?.length) && !experience.peakSeasons?.includes(season);
  const base = BASE_VISIT_POINTS;
  const transportBonus = TRANSPORT_BONUS[transport];
  const offPeakBonus = isOffPeak ? OFF_PEAK_BONUS : 0;
  return {
    base,
    transportBonus,
    offPeakBonus,
    total: base + transportBonus + offPeakBonus,
    season,
  };
};
