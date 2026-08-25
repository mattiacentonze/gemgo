export const MAX_LOCATION_AGE_MS = 3 * 60 * 1_000;
export const MAX_LOCATION_FUTURE_MS = 60 * 1_000;
export const MAX_VISIT_ACCURACY_M = 100;
export const MAX_VISIT_DISTANCE_M = 500;

type Coordinates = { latitude: number; longitude: number };

export type VisitLocationClaim = Coordinates & {
  accuracy: number;
  capturedAt: string;
};
export type VisitLocationValidation =
  | { ok: true; distanceM: number; capturedAt: string }
  | {
      ok: false;
      error:
        | "invalid_visit_evidence"
        | "location_inaccurate"
        | "location_stale"
        | "outside_verification_area";
    };

const radians = (value: number) => (value * Math.PI) / 180;

export const visitDistanceMeters = (
  claimed: Coordinates,
  destination: Coordinates,
) => {
  const latitudeDelta = radians(destination.latitude - claimed.latitude);
  const longitudeDelta = radians(destination.longitude - claimed.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(claimed.latitude)) *
      Math.cos(radians(destination.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(
    6371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  );
};

export const validateVisitLocation = (
  claim: VisitLocationClaim,
  destination: Coordinates,
  now = Date.now(),
): VisitLocationValidation => {
  if (
    !Number.isFinite(claim.latitude) ||
    claim.latitude < -90 ||
    claim.latitude > 90 ||
    !Number.isFinite(claim.longitude) ||
    claim.longitude < -180 ||
    claim.longitude > 180
  ) {
    return { ok: false, error: "invalid_visit_evidence" };
  }
  if (
    !Number.isFinite(claim.accuracy) ||
    claim.accuracy < 1 ||
    claim.accuracy > MAX_VISIT_ACCURACY_M
  ) {
    return { ok: false, error: "location_inaccurate" };
  }
  const capturedTime = Date.parse(claim.capturedAt);
  const age = now - capturedTime;
  if (
    !Number.isFinite(capturedTime) ||
    age > MAX_LOCATION_AGE_MS ||
    age < -MAX_LOCATION_FUTURE_MS
  ) {
    return { ok: false, error: "location_stale" };
  }
  const distanceM = visitDistanceMeters(claim, destination);
  if (distanceM > MAX_VISIT_DISTANCE_M) {
    return { ok: false, error: "outside_verification_area" };
  }
  return {
    ok: true,
    distanceM,
    capturedAt: new Date(capturedTime).toISOString(),
  };
};
