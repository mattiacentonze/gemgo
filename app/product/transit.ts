import bavariaTransitData from "../data/gtfs-bavaria-regional-stops.json";
import type { Experience } from "./types";

export type NearbyTransitStop = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
};

type TransitStop = Omit<NearbyTransitStop, "distanceKm">;

export const nearestGtfsStop = (
  experience: Experience,
): NearbyTransitStop | null => {
  if (experience.country !== "Germany") return null;
  let nearest: NearbyTransitStop | null = null;
  for (const stop of (bavariaTransitData as { stops: TransitStop[] }).stops) {
    const latitude = (stop.lat - experience.latitude) * 111;
    const longitude =
      (stop.lon - experience.longitude) *
      111 *
      Math.cos((experience.latitude * Math.PI) / 180);
    const distanceKm = Math.hypot(latitude, longitude);
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = { ...stop, distanceKm };
    }
  }
  return nearest;
};

export const gtfsMetadata = (
  bavariaTransitData as { meta: Record<string, string> }
).meta;
