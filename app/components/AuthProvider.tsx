"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "../../lib/supabase/client";
import {
  loadAccountCollections,
  loadAccountCollectionTombstones,
  loadAccountSavedTrips,
  loadAccountTripTombstones,
  loadGuestCollections,
  loadGuestSavedTrips,
  persistenceEventName,
  saveAccountCollections,
  saveAccountCollectionTombstones,
  saveAccountTrips,
  saveAccountTripTombstones,
  setPersistenceScope,
  type SavedCollection,
  type SavedTrip,
  type PersistenceTombstone,
} from "../product/storage";

export type AppRole = "member" | "content_editor" | "admin" | "owner";

type AuthContextValue = {
  user: User | null;
  displayName: string;
  role: AppRole;
  verifiedBalance: number;
  loading: boolean;
  syncError: boolean;
  refreshAccount: () => Promise<void>;
  signOut: () => Promise<void>;
};

type TripRow = {
  trip_id: string;
  name: string;
  payload: unknown;
  created_at: string;
  updated_at: string;
};

type CollectionRow = {
  collection_id: string;
  name: string;
  region: string;
  experience_ids: unknown;
  updated_at: string;
};

type TombstoneRow = {
  entity_type: "trip" | "collection";
  entity_id: string;
  deleted_at: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const timestamp = (value: string | undefined) => {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const mergeByFreshness = <T extends { id: string; updatedAt: string }>(
  first: T[],
  second: T[],
) => {
  const merged = new Map<string, T>();
  for (const item of [...first, ...second]) {
    const previous = merged.get(item.id);
    if (!previous || timestamp(item.updatedAt) >= timestamp(previous.updatedAt)) {
      merged.set(item.id, item);
    }
  }
  return [...merged.values()].sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt));
};

const mergeTombstones = (...groups: PersistenceTombstone[][]) => {
  const merged = new Map<string, PersistenceTombstone>();
  for (const item of groups.flat()) {
    const previous = merged.get(item.id);
    if (!previous || timestamp(item.deletedAt) > timestamp(previous.deletedAt)) {
      merged.set(item.id, item);
    }
  }
  return [...merged.values()].sort(
    (a, b) => timestamp(b.deletedAt) - timestamp(a.deletedAt),
  );
};

const mergeWithTombstones = <T extends { id: string; updatedAt: string }>(
  first: T[],
  second: T[],
  ...tombstoneGroups: PersistenceTombstone[][]
) => {
  const items = mergeByFreshness(first, second);
  const tombstones = mergeTombstones(...tombstoneGroups);
  const deletedAt = new Map(
    tombstones.map((item) => [item.id, timestamp(item.deletedAt)]),
  );
  return {
    items: items.filter(
      (item) => timestamp(item.updatedAt) > (deletedAt.get(item.id) ?? 0),
    ),
    tombstones,
  };
};

const safeLocalStorageGet = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Cloud sync still works when a restricted webview denies localStorage.
  }
};

const rowToTrip = (row: TripRow): SavedTrip | null => {
  if (!row.payload || typeof row.payload !== "object") return null;
  const payload = row.payload as Partial<SavedTrip>;
  if (!payload.preferences || !payload.trip?.experienceId) return null;
  return {
    ...(payload as SavedTrip),
    id: row.trip_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const rowToCollection = (row: CollectionRow): SavedCollection | null => {
  if (!Array.isArray(row.experience_ids)) return null;
  return {
    id: row.collection_id,
    name: row.name,
    region: row.region,
    experienceIds: row.experience_ids.filter((value): value is string => typeof value === "string"),
    updatedAt: row.updated_at,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>("member");
  const [verifiedBalance, setVerifiedBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(false);
  const syncTailRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSyncsRef = useRef(new Map<string, Promise<void>>());
  const suppressPersistenceEventsRef = useRef(false);
  const persistenceRevisionRef = useRef(0);
  const loadGenerationRef = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    currentUserIdRef.current = loading ? null : user?.id ?? null;
  }, [loading, user?.id]);

  const performPersistenceSync = useCallback(async (account: User) => {
    setSyncError(false);
    const startingRevision = persistenceRevisionRef.current;

    const importMarker = `gemgo-cloud-import-v1:${account.id}`;
    const lastGuestImport = timestamp(safeLocalStorageGet(importMarker) ?? undefined);
    const cachedTrips = loadAccountSavedTrips(account.id);
    const cachedCollections = loadAccountCollections(account.id);
    const cachedTripTombstones = loadAccountTripTombstones(account.id);
    const cachedCollectionTombstones = loadAccountCollectionTombstones(account.id);
    const newGuestTrips = loadGuestSavedTrips().filter((item) => timestamp(item.updatedAt) > lastGuestImport);
    const newGuestCollections = loadGuestCollections().filter((item) => timestamp(item.updatedAt) > lastGuestImport);
    const localTrips = mergeByFreshness(cachedTrips, newGuestTrips);
    const localCollections = mergeByFreshness(cachedCollections, newGuestCollections);

    setPersistenceScope(account.id);

    try {
      const [tripResult, collectionResult, tombstoneResult] = await Promise.all([
        supabase
          .from("saved_trips")
          .select("trip_id,name,payload,created_at,updated_at")
          .eq("user_id", account.id),
        supabase
          .from("saved_collections")
          .select("collection_id,name,region,experience_ids,updated_at")
          .eq("user_id", account.id),
        supabase
          .from("persistence_tombstones")
          .select("entity_type,entity_id,deleted_at")
          .eq("user_id", account.id),
      ]);
      if (tripResult.error) throw tripResult.error;
      if (collectionResult.error) throw collectionResult.error;
      if (tombstoneResult.error) throw tombstoneResult.error;

      const remoteTrips = (tripResult.data as TripRow[]).map(rowToTrip).filter((item): item is SavedTrip => Boolean(item));
      const remoteCollections = (collectionResult.data as CollectionRow[]).map(rowToCollection).filter((item): item is SavedCollection => Boolean(item));
      const tombstoneRows = (tombstoneResult.data ?? []) as TombstoneRow[];
      const remoteTripTombstones = tombstoneRows
        .filter((item) => item.entity_type === "trip")
        .map((item) => ({ id: item.entity_id, deletedAt: item.deleted_at }));
      const remoteCollectionTombstones = tombstoneRows
        .filter((item) => item.entity_type === "collection")
        .map((item) => ({ id: item.entity_id, deletedAt: item.deleted_at }));
      const tripState = mergeWithTombstones(
        remoteTrips,
        localTrips,
        remoteTripTombstones,
        cachedTripTombstones,
      );
      const collectionState = mergeWithTombstones(
        remoteCollections,
        localCollections,
        remoteCollectionTombstones,
        cachedCollectionTombstones,
      );
      const trips = tripState.items;
      const collections = collectionState.items;

      if (trips.length > 0) {
        const { error } = await supabase.from("saved_trips").upsert(
          trips.map((trip) => ({
            user_id: account.id,
            trip_id: trip.id,
            name: trip.name,
            payload: trip,
            created_at: trip.createdAt,
            updated_at: trip.updatedAt,
          })),
          { onConflict: "user_id,trip_id" },
        );
        if (error) throw error;
      }

      if (collections.length > 0) {
        const { error } = await supabase.from("saved_collections").upsert(
          collections.map((collection) => ({
            user_id: account.id,
            collection_id: collection.id,
            name: collection.name,
            region: collection.region,
            experience_ids: collection.experienceIds,
            updated_at: collection.updatedAt,
          })),
          { onConflict: "user_id,collection_id" },
        );
        if (error) throw error;
      }

      const tombstones = [
        ...tripState.tombstones.map((item) => ({
          user_id: account.id,
          entity_type: "trip",
          entity_id: item.id,
          deleted_at: item.deletedAt,
        })),
        ...collectionState.tombstones.map((item) => ({
          user_id: account.id,
          entity_type: "collection",
          entity_id: item.id,
          deleted_at: item.deletedAt,
        })),
      ];
      if (tombstones.length > 0) {
        const { error } = await supabase.from("persistence_tombstones").upsert(
          tombstones,
          { onConflict: "user_id,entity_type,entity_id" },
        );
        if (error) throw error;
      }

      const deletedTripTombstones = tripState.tombstones
        .filter((item) => !trips.some((trip) => trip.id === item.id))
      if (deletedTripTombstones.length > 0) {
        const results = await Promise.all(
          deletedTripTombstones.map((item) =>
            supabase
              .from("saved_trips")
              .delete()
              .eq("user_id", account.id)
              .eq("trip_id", item.id)
              .lte("updated_at", item.deletedAt),
          ),
        );
        if (results.some((result) => result.error)) {
          throw new Error("trip_tombstone_sync_failed");
        }
      }
      const deletedCollectionTombstones = collectionState.tombstones
        .filter((item) => !collections.some((collection) => collection.id === item.id))
      if (deletedCollectionTombstones.length > 0) {
        const results = await Promise.all(
          deletedCollectionTombstones.map((item) =>
            supabase
              .from("saved_collections")
              .delete()
              .eq("user_id", account.id)
              .eq("collection_id", item.id)
              .lte("updated_at", item.deletedAt),
          ),
        );
        if (results.some((result) => result.error)) {
          throw new Error("collection_tombstone_sync_failed");
        }
      }

      // Do not overwrite a newer local edit made while the network sync was
      // running. Its persistence event schedules the next serialized pass.
      if (persistenceRevisionRef.current === startingRevision) {
        suppressPersistenceEventsRef.current = true;
        try {
          saveAccountTrips(account.id, trips);
          saveAccountCollections(account.id, collections);
          saveAccountTripTombstones(account.id, tripState.tombstones);
          saveAccountCollectionTombstones(account.id, collectionState.tombstones);
        } finally {
          suppressPersistenceEventsRef.current = false;
        }
      }
      safeLocalStorageSet(importMarker, new Date().toISOString());
    } catch {
      setSyncError(true);
      if (persistenceRevisionRef.current === startingRevision) {
        suppressPersistenceEventsRef.current = true;
        try {
          saveAccountTrips(account.id, localTrips);
          saveAccountCollections(account.id, localCollections);
        } finally {
          suppressPersistenceEventsRef.current = false;
        }
      }
    }
  }, [supabase]);

  const syncPersistence = useCallback((account: User): Promise<void> => {
    const existing = pendingSyncsRef.current.get(account.id);
    if (existing) return existing;

    // Every account sync shares one tail because the active persistence scope
    // is global to this tab. Duplicate auth events for the same account await
    // the same promise instead of observing a half-synchronized cache.
    const scheduled = syncTailRef.current
      .catch(() => undefined)
      .then(() => performPersistenceSync(account));
    pendingSyncsRef.current.set(account.id, scheduled);
    syncTailRef.current = scheduled;
    void scheduled.then(
      () => {
        if (pendingSyncsRef.current.get(account.id) === scheduled) {
          pendingSyncsRef.current.delete(account.id);
        }
      },
      () => {
        if (pendingSyncsRef.current.get(account.id) === scheduled) {
          pendingSyncsRef.current.delete(account.id);
        }
      },
    );
    return scheduled;
  }, [performPersistenceSync]);

  const loadAccount = useCallback(async (account?: User | null) => {
    const generation = ++loadGenerationRef.current;
    currentUserIdRef.current = null;
    setLoading(true);
    let current = account;
    if (current === undefined) {
      const { data } = await supabase.auth.getUser();
      current = data.user;
    }
    if (generation !== loadGenerationRef.current) return;

    if (!current) {
      // A sign-out/account transition cannot expose the previous account's
      // cache while one of its serialized writes is still changing scope.
      await syncTailRef.current.catch(() => undefined);
      if (generation !== loadGenerationRef.current) return;
      setUser(null);
      setDisplayName("");
      setRole("member");
      setVerifiedBalance(0);
      setPersistenceScope(null);
      setLoading(false);
      return;
    }

    setUser(current);
    await syncPersistence(current);
    if (generation !== loadGenerationRef.current) return;

    const [profileResult, roleResult, balanceResult] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", current.id).maybeSingle(),
      supabase.rpc("my_app_role"),
      supabase.from("gempoint_balances").select("balance").eq("user_id", current.id).maybeSingle(),
    ]);
    if (generation !== loadGenerationRef.current) return;
    setDisplayName(profileResult.data?.display_name || current.user_metadata?.full_name || current.email || "GemGo traveller");
    const nextRole = roleResult.data;
    setRole(
      nextRole === "owner" || nextRole === "admin" || nextRole === "content_editor"
        ? nextRole
        : "member",
    );
    setVerifiedBalance(Number(balanceResult.data?.balance ?? 0));
    setLoading(false);
  }, [supabase, syncPersistence]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadAccount(), 0);
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void loadAccount(session?.user ?? null), 0);
    });
    return () => {
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, [loadAccount, supabase]);

  useEffect(() => {
    const handlePersistence = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; scope?: string }>).detail;
      if (
        suppressPersistenceEventsRef.current ||
        !user ||
        detail?.scope !== user.id ||
        detail.key === "scope"
      ) return;
      persistenceRevisionRef.current += 1;
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      const targetUser = user;
      syncTimerRef.current = window.setTimeout(() => {
        const runAfterPending = async () => {
          const pending = pendingSyncsRef.current.get(targetUser.id);
          if (pending) await pending.catch(() => undefined);
          if (currentUserIdRef.current !== targetUser.id) return;
          await syncPersistence(targetUser);
        };
        void runAfterPending();
      }, 700);
    };
    window.addEventListener(persistenceEventName, handlePersistence);
    return () => {
      window.removeEventListener(persistenceEventName, handlePersistence);
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [syncPersistence, user]);

  const signOut = useCallback(async () => {
    loadGenerationRef.current += 1;
    currentUserIdRef.current = null;
    setLoading(true);
    await supabase.auth.signOut();
    await loadAccount(null);
  }, [loadAccount, supabase]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    displayName,
    role,
    verifiedBalance,
    loading,
    syncError,
    refreshAccount: () => loadAccount(user),
    signOut,
  }), [displayName, loadAccount, loading, role, signOut, syncError, user, verifiedBalance]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
