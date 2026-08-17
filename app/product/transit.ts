import bavariaTransitData from "../data/gtfs-bavaria-regional-stops.json";
import type { Experience } from "./types";

export type TransitPoint = {
  label: string;
  lat: number;
  lng: number;
};

export type NearbyTransitStop = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
};

export type TransitAccessPlan = {
  status: "static-gtfs-access" | "official-provider-fallback";
  originStop: NearbyTransitStop | null;
  destinationStop: NearbyTransitStop | null;
  directionsUrl: string;
  operatorUrl: string;
  sourceLabel: string;
  sourceUpdatedAt: string | null;
};

type TransitStop = Omit<NearbyTransitStop, "distanceKm">;

const BAVARIA_OPERATOR_URL = "https://www.bayern-fahrplan.de/de/auskunft";
const AOSTA_OPERATOR_URL = "https://aosta.arriva.it/orari-e-percorsi/";

const distanceToStop = (point: TransitPoint, stop: TransitStop) => {
  const latitude = (stop.lat - point.lat) * 111;
  const longitude =
    (stop.lon - point.lng) *
    111 *
    Math.cos((point.lat * Math.PI) / 180);
  return Math.hypot(latitude, longitude);
};

export const nearestGtfsStopToPoint = (
  point: TransitPoint,
): NearbyTransitStop | null => {
  let nearest: NearbyTransitStop | null = null;
  for (const stop of (bavariaTransitData as { stops: TransitStop[] }).stops) {
    const distanceKm = distanceToStop(point, stop);
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = { ...stop, distanceKm };
    }
  }
  return nearest;
};

export const nearestGtfsStop = (
  experience: Experience,
): NearbyTransitStop | null => {
  if (experience.country !== "Germany") return null;
  return nearestGtfsStopToPoint({
    label: experience.name,
    lat: experience.latitude,
    lng: experience.longitude,
  });
};

export const googleTransitDirectionsUrl = (
  destination: Experience,
  origin?: TransitPoint | null,
) => {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: "transit",
  });
  if (origin) params.set("origin", `${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const gtfsMetadata = (
  bavariaTransitData as { meta: Record<string, string> }
).meta;

/**
 * Builds an honest public-transport handoff. Bavaria has static open GTFS
 * stops, but the checked-in subset has no trips or stop_times, so GemGo only
 * identifies first/last-mile access points. Valle d'Aosta has no verified
 * reusable GTFS feed in this revision and falls back to its official operator.
 * The actual itinerary is always resolved by an external provider.
 */
export const transitAccessPlan = (
  destination: Experience,
  origin?: TransitPoint | null,
): TransitAccessPlan => {
  const directionsUrl = googleTransitDirectionsUrl(destination, origin);

  if (destination.country === "Germany") {
    return {
      status: "static-gtfs-access",
      originStop: origin ? nearestGtfsStopToPoint(origin) : null,
      destinationStop: nearestGtfsStop(destination),
      directionsUrl,
      operatorUrl: BAVARIA_OPERATOR_URL,
      sourceLabel: "GTFS.de / DELFI",
      sourceUpdatedAt: gtfsMetadata.extractedAt ?? null,
    };
  }

  return {
    status: "official-provider-fallback",
    originStop: null,
    destinationStop: null,
    directionsUrl,
    operatorUrl: AOSTA_OPERATOR_URL,
    sourceLabel: "Arriva Italia Valle d’Aosta",
    sourceUpdatedAt: null,
  };
};
