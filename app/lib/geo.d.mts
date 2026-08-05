import type { TransportCode } from "../domain";
export type GeoPoint = { label?: string; lat: number; lng: number };
export function geocodePlace(query: string, signal?: AbortSignal): Promise<(GeoPoint & { label: string }) | null>;
export function fetchRoadGeometry(from: GeoPoint, to: GeoPoint, mode: TransportCode, signal?: AbortSignal): Promise<{ coordinates: [number, number][]; distanceKm: number; durationMinutes: number } | null>;
