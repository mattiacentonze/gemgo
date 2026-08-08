import type { TransportCode } from "../domain";

export type GeoPoint = { label?: string; lat: number; lng: number };

export type RouteGeometry = {
  coordinates: Array<[number, number]>;
  distanceKm: number;
  durationMinutes: number;
};

const ROUTE_CACHE_TTL_MS = 10 * 60 * 1000;
const ROUTE_REQUEST_TIMEOUT_MS = 8_000;
const routeCache = new Map<string, { expiresAt: number; route: RouteGeometry }>();

export const offlinePlaces: Record<string, GeoPoint & { label: string }> = {
  aosta: { label: "Aosta", lat: 45.737, lng: 7.321 },
  torgnon: { label: "Torgnon", lat: 45.803, lng: 7.569 },
  munich: { label: "Munich", lat: 48.137, lng: 11.576 },
  münchen: { label: "München", lat: 48.137, lng: 11.576 },
  fussen: { label: "Füssen", lat: 47.57, lng: 10.701 },
  füssen: { label: "Füssen", lat: 47.57, lng: 10.701 },
};

const normalized = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const fetchWithTimeout = async (url: string, signal?: AbortSignal) => {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(
    () => controller.abort(new DOMException("Routing request timed out", "TimeoutError")),
    ROUTE_REQUEST_TIMEOUT_MS,
  );
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
};

export async function geocodePlace(
  query: string,
  signal?: AbortSignal,
): Promise<(GeoPoint & { label: string }) | null> {
  const local = offlinePlaces[normalized(query)];
  if (local) return local;
  const response = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
    signal,
  );
  if (!response.ok) throw new Error("geocoder-unavailable");
  const [result] = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
  if (!result) return null;
  return {
    label: result.display_name,
    lat: Number(result.lat),
    lng: Number(result.lon),
  };
}

export const osrmProfile = (mode: TransportCode | "public_transport") =>
  mode === "driving"
    ? "driving"
    : mode === "cycling" || mode === "e_bike"
      ? "cycling"
      : "walking";

const routeKey = (from: GeoPoint, to: GeoPoint, profile: string) =>
  [
    profile,
    from.lat.toFixed(5),
    from.lng.toFixed(5),
    to.lat.toFixed(5),
    to.lng.toFixed(5),
  ].join(":");

export async function fetchRoadGeometry(
  from: GeoPoint,
  to: GeoPoint,
  mode: TransportCode | "public_transport",
  signal?: AbortSignal,
): Promise<RouteGeometry | null> {
  if (mode === "public_transport") return null;
  const profile = osrmProfile(mode);
  const key = routeKey(from, to, profile);
  const cached = routeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.route;
  if (cached) routeCache.delete(key);

  const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const response = await fetchWithTimeout(url, signal);
  if (!response.ok) throw new Error("routing-unavailable");
  const payload = (await response.json()) as {
    routes?: Array<{
      geometry: { coordinates: Array<[number, number]> };
      distance: number;
      duration: number;
    }>;
  };
  const route = payload.routes?.[0];
  if (!route) return null;
  const result: RouteGeometry = {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
  };
  routeCache.set(key, {
    expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
    route: result,
  });
  if (routeCache.size > 120) routeCache.delete(routeCache.keys().next().value ?? key);
  return result;
}
