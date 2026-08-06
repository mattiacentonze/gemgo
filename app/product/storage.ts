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

export type GemPointEvent = {
  id: string;
  amount: number;
  type: "visit" | "gemdrop" | "mobility" | "partner" | "redemption";
  label: string;
  createdAt: string;
  balanceAfter: number;
  status: "demo" | "verified";
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
const LEGACY_TRIP_KEYS = ["gemgo-demo-trip", "gemgo-saved-plans", "gemgo-saved-plans-v2"];

const read = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is optional in private browsing and restricted webviews.
  }
};

export const loadSavedTrips = (): SavedTrip[] => read<SavedTrip[]>(TRIPS_KEY, []);
export const saveTrips = (trips: SavedTrip[]) => write(TRIPS_KEY, trips);

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
      plannedDeparture,
      acceptedGemDrop: false,
      verified: false,
    },
  };
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
