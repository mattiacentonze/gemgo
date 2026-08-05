export const offlinePlaces = {
  aosta: { label: "Aosta", lat: 45.737, lng: 7.321 },
  torgnon: { label: "Torgnon", lat: 45.803, lng: 7.569 },
  munich: { label: "Munich", lat: 48.137, lng: 11.576 },
  münchen: { label: "München", lat: 48.137, lng: 11.576 },
  fussen: { label: "Füssen", lat: 47.57, lng: 10.701 },
  füssen: { label: "Füssen", lat: 47.57, lng: 10.701 },
};

const normalized = (value) => value.trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export async function geocodePlace(query, signal) {
  const local = offlinePlaces[normalized(query)];
  if (local) return local;
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("geocoder-unavailable");
  const [result] = await response.json();
  if (!result) return null;
  return { label: result.display_name, lat: Number(result.lat), lng: Number(result.lon) };
}

export const osrmProfile = (mode) => mode === "driving" ? "driving" : mode === "cycling" || mode === "e_bike" ? "cycling" : "walking";

export async function fetchRoadGeometry(from, to, mode, signal) {
  if (mode === "public_transport") return null;
  const profile = osrmProfile(mode);
  const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("routing-unavailable");
  const route = (await response.json()).routes?.[0];
  if (!route) return null;
  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
  };
}
