import type { SearchPreferences, TripState } from "./types";

export type SavedTrip = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  preferences: SearchPreferences;
  trip: TripState;
  offlineSaved?: boolean;
};

export type SavedCollection = {
  id: string;
  name: string;
  region: string;
  experienceIds: string[];
  updatedAt: string;
};

export type PersistenceTombstone = {
  id: string;
  deletedAt: string;
};

export type GemPointEvent = {
  id: string;
  amount: number;
  type: "visit" | "gemdrop" | "mobility" | "partner" | "contribution" | "redemption" | "demo";
  label: string;
  createdAt: string;
  balanceAfter: number;
  status: "demo" | "verified";
  metadata?: {
    transport?: SearchPreferences["transport"];
    plannedTransport?: SearchPreferences["transport"];
    activityProvider?: "strava" | "garmin" | "apple-health" | "health-connect";
    crowd?: "low" | "moderate" | "high";
    experienceId?: string;
    region?: string;
    basePoints?: number;
    transportBonus?: number;
    offPeakBonus?: number;
  };
};

export type RewardUnlock = {
  id: string;
  rewardId: string;
  code: string;
  createdAt: string;
  expiresAt: string;
};

const TRIPS_KEY = "gemgo-trips-v3";
const ACTIVE_TRIP_KEY = "gemgo-active-trip-v3";
const LEDGER_KEY = "gemgo-points-ledger-v3";
const REWARDS_KEY = "gemgo-reward-unlocks-v1";
const COLLECTIONS_KEY = "gemgo-collections-v1";
const TRIP_TOMBSTONES_KEY = "gemgo-trip-tombstones-v1";
const COLLECTION_TOMBSTONES_KEY = "gemgo-collection-tombstones-v1";
const PERSISTENCE_SCOPE_KEY = "gemgo-persistence-scope-v1";
const PERSISTENCE_EVENT = "gemgo:persistence-change";
const LEGACY_TRIP_KEYS = ["gemgo-demo-trip", "gemgo-saved-plans", "gemgo-saved-plans-v2"];

const currentScope = () => {
  if (typeof window === "undefined") return "guest";
  return window.localStorage.getItem(PERSISTENCE_SCOPE_KEY) || "guest";
};

const scopedKey = (key: string, scope = currentScope()) =>
  scope === "guest" ? key : `${key}:user:${scope}`;

const read = <T,>(key: string, fallback: T, scope?: string): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(scopedKey(key, scope));
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown, scope?: string) => {
  if (typeof window === "undefined") return;
  try {
    const resolvedScope = scope ?? currentScope();
    window.localStorage.setItem(scopedKey(key, resolvedScope), JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(PERSISTENCE_EVENT, {
      detail: { key, scope: resolvedScope },
    }));
  } catch {
    // Persistence is optional in private browsing and restricted webviews.
  }
};

const deletionTombstones = <T extends { id: string; updatedAt: string }>(
  key: string,
  previous: T[],
  next: T[],
  scope: string,
) => {
  const byId = new Map(
    read<PersistenceTombstone[]>(key, [], scope).map((item) => [item.id, item]),
  );
  const nextById = new Map(next.map((item) => [item.id, item]));
  const deletedAt = new Date().toISOString();

  for (const item of previous) {
    if (!nextById.has(item.id)) byId.set(item.id, { id: item.id, deletedAt });
  }
  for (const item of next) {
    const tombstone = byId.get(item.id);
    if (
      tombstone &&
      Date.parse(item.updatedAt) > Date.parse(tombstone.deletedAt)
    ) {
      byId.delete(item.id);
    }
  }

  return [...byId.values()].sort(
    (a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt),
  );
};

export const persistenceEventName = PERSISTENCE_EVENT;
export const getPersistenceScope = currentScope;
export const setPersistenceScope = (scope: string | null) => {
  if (typeof window === "undefined") return;
  const safeScope = scope && /^[0-9a-f-]{36}$/i.test(scope) ? scope : "guest";
  try {
    window.localStorage.setItem(PERSISTENCE_SCOPE_KEY, safeScope);
    window.dispatchEvent(new CustomEvent(PERSISTENCE_EVENT, {
      detail: { key: "scope", scope: safeScope },
    }));
  } catch {
    // The app remains usable without persistence in storage-restricted views.
  }
};

export const loadSavedTrips = (): SavedTrip[] => read<SavedTrip[]>(TRIPS_KEY, []);
export const saveTrips = (trips: SavedTrip[]) => {
  const scope = currentScope();
  const previous = read<SavedTrip[]>(TRIPS_KEY, [], scope);
  write(
    TRIP_TOMBSTONES_KEY,
    deletionTombstones(TRIP_TOMBSTONES_KEY, previous, trips, scope),
    scope,
  );
  write(TRIPS_KEY, trips, scope);
};
export const loadGuestSavedTrips = (): SavedTrip[] => read<SavedTrip[]>(TRIPS_KEY, [], "guest");
export const loadAccountSavedTrips = (userId: string): SavedTrip[] =>
  read<SavedTrip[]>(TRIPS_KEY, [], userId);
export const saveAccountTrips = (userId: string, trips: SavedTrip[]) =>
  write(TRIPS_KEY, trips, userId);
export const loadAccountTripTombstones = (userId: string): PersistenceTombstone[] =>
  read<PersistenceTombstone[]>(TRIP_TOMBSTONES_KEY, [], userId);
export const saveAccountTripTombstones = (
  userId: string,
  tombstones: PersistenceTombstone[],
) => write(TRIP_TOMBSTONES_KEY, tombstones, userId);

export const loadActiveTrip = (): SavedTrip | null => read<SavedTrip | null>(ACTIVE_TRIP_KEY, null);
export const saveActiveTrip = (trip: SavedTrip | null) => write(ACTIVE_TRIP_KEY, trip);

export const loadLedger = (): GemPointEvent[] => read<GemPointEvent[]>(LEDGER_KEY, []);
export const saveLedger = (events: GemPointEvent[]) => write(LEDGER_KEY, events);
export const pointBalance = (events: GemPointEvent[]) => events.at(-1)?.balanceAfter ?? 0;

export const appendPointEvent = (
  events: GemPointEvent[],
  event: Omit<GemPointEvent, "balanceAfter">,
) => {
  if (events.some((item) => item.id === event.id)) return events;
  const nextBalance = Math.max(0, pointBalance(events) + event.amount);
  return [...events, { ...event, balanceAfter: nextBalance }];
};

export const loadRewardUnlocks = (): RewardUnlock[] => read<RewardUnlock[]>(REWARDS_KEY, []);
export const saveRewardUnlocks = (unlocks: RewardUnlock[]) => write(REWARDS_KEY, unlocks);

export const createRewardUnlock = (rewardId: string): RewardUnlock => {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);
  const code = `GEM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return {
    id: `${rewardId}-${createdAt.getTime()}`,
    rewardId,
    code,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
};

export const createSavedTrip = (
  experienceId: string,
  name: string,
  preferences: SearchPreferences,
  plannedDeparture: string,
): SavedTrip => {
  const now = new Date().toISOString();
  return {
    id: `trip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    createdAt: now,
    updatedAt: now,
    preferences,
    trip: {
      experienceId,
      experienceIds: [experienceId],
      plannedDeparture,
      maxLegMinutes: 90,
      legTransport: preferences.transport,
      acceptedGemDrop: false,
      verified: false,
      verifiedExperienceIds: [],
      verificationRecords: [],
    },
  };
};

export const loadCollections = (): SavedCollection[] =>
  read<SavedCollection[]>(COLLECTIONS_KEY, []);
export const saveCollections = (collections: SavedCollection[]) => {
  const scope = currentScope();
  const previous = read<SavedCollection[]>(COLLECTIONS_KEY, [], scope);
  write(
    COLLECTION_TOMBSTONES_KEY,
    deletionTombstones(
      COLLECTION_TOMBSTONES_KEY,
      previous,
      collections,
      scope,
    ),
    scope,
  );
  write(COLLECTIONS_KEY, collections, scope);
};
export const loadGuestCollections = (): SavedCollection[] =>
  read<SavedCollection[]>(COLLECTIONS_KEY, [], "guest");
export const loadAccountCollections = (userId: string): SavedCollection[] =>
  read<SavedCollection[]>(COLLECTIONS_KEY, [], userId);
export const saveAccountCollections = (userId: string, collections: SavedCollection[]) =>
  write(COLLECTIONS_KEY, collections, userId);
export const loadAccountCollectionTombstones = (
  userId: string,
): PersistenceTombstone[] =>
  read<PersistenceTombstone[]>(COLLECTION_TOMBSTONES_KEY, [], userId);
export const saveAccountCollectionTombstones = (
  userId: string,
  tombstones: PersistenceTombstone[],
) => write(COLLECTION_TOMBSTONES_KEY, tombstones, userId);

export const toggleExperienceInCollection = (
  collections: SavedCollection[],
  experienceId: string,
  region: string,
) => {
  const id = `region-${region.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const existing = collections.find((collection) => collection.id === id);
  if (existing) {
    const contains = existing.experienceIds.includes(experienceId);
    const experienceIds = contains
      ? existing.experienceIds.filter((id) => id !== experienceId)
      : [...existing.experienceIds, experienceId];
    if (experienceIds.length === 0) return collections.filter((collection) => collection.id !== id);
    return collections.map((collection) => collection.id === id
      ? { ...collection, experienceIds, updatedAt: new Date().toISOString() }
      : collection);
  }
  return [
    ...collections,
    {
      id,
      name: region,
      region,
      experienceIds: [experienceId],
      updatedAt: new Date().toISOString(),
    },
  ];
};

export const tripExperienceIds = (trip: SavedTrip | null) => {
  if (!trip) return [];
  return trip.trip.experienceIds?.length
    ? trip.trip.experienceIds
    : [trip.trip.experienceId];
};

export const encodeSharedTrip = (trip: SavedTrip) => {
  const payload = JSON.stringify({
    version: 1,
    name: trip.name,
    preferences: trip.preferences,
    trip: trip.trip,
  });
  const bytes = new TextEncoder().encode(payload);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

export const decodeSharedTrip = (value: string): SavedTrip | null => {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(normalized + padding);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
      version?: number;
      name?: string;
      preferences?: SearchPreferences;
      trip?: TripState;
    };
    if (parsed.version !== 1 || !parsed.preferences || !parsed.trip?.experienceId) return null;
    const now = new Date().toISOString();
    return {
      id: `shared-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: parsed.name ? `${parsed.name} · shared copy` : "Shared GemGo trip",
      createdAt: now,
      updatedAt: now,
      preferences: parsed.preferences,
      trip: {
        ...parsed.trip,
        verified: false,
        verifiedExperienceIds: [],
        verificationRecords: [],
      },
    };
  } catch {
    return null;
  }
};

export const migrateLegacyTrip = (
  preferences: SearchPreferences,
  fallbackName = "Imported GemGo trip",
): SavedTrip | null => {
  if (typeof window === "undefined") return null;
  if (loadSavedTrips().length > 0 || loadActiveTrip()) return null;
  for (const key of LEGACY_TRIP_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (key === "gemgo-demo-trip" && parsed && typeof parsed === "object" && "experienceId" in parsed) {
        const now = new Date().toISOString();
        const trip: SavedTrip = {
          id: `legacy-${Date.now()}`,
          name: fallbackName,
          createdAt: now,
          updatedAt: now,
          preferences,
          trip: parsed as TripState,
        };
        saveTrips([trip]);
        saveActiveTrip(trip);
        return trip;
      }
    } catch {
      // Ignore incompatible legacy payloads instead of corrupting new state.
    }
  }
  return null;
};
