import type { Experience } from "./types.ts";

const crowdRank = { low: 0, moderate: 1, high: 2 } as const;
const EARTH_RADIUS_KM = 6371;
const MAX_GEMDROP_DISTANCE_KM = 75;

const radians = (value: number) => (value * Math.PI) / 180;

export const distanceBetweenExperiencesKm = (
  first: Pick<Experience, "latitude" | "longitude">,
  second: Pick<Experience, "latitude" | "longitude">,
) => {
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    EARTH_RADIUS_KM *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
};

const sharesKind = (first: Experience, second: Experience) =>
  first.kind.some((kind) => second.kind.includes(kind));

/**
 * One deterministic GemDrop decision shared by the browser and server route.
 * A suggestion must be in the same pilot region, genuinely lower-pressure,
 * relevant to the original experience and close enough to be actionable.
 */
export const gemDropAlternativeFor = (
  experiences: Experience[],
  original: Experience,
) =>
  experiences
    .filter(
      (candidate) =>
        candidate.id !== original.id &&
        candidate.region === original.region &&
        crowdRank[candidate.crowd] < crowdRank[original.crowd] &&
        sharesKind(candidate, original) &&
        distanceBetweenExperiencesKm(original, candidate) <=
          MAX_GEMDROP_DISTANCE_KM,
    )
    .sort((first, second) => {
      const pressure = crowdRank[first.crowd] - crowdRank[second.crowd];
      if (pressure !== 0) return pressure;
      const distance =
        distanceBetweenExperiencesKm(original, first) -
        distanceBetweenExperiencesKm(original, second);
      if (distance !== 0) return distance;
      return (
        first.durationMinutes - second.durationMinutes ||
        first.id.localeCompare(second.id)
      );
    })[0] ?? null;
