const SUPABASE_URL = "https://lhowrxqddjfvzmlwnuoj.supabase.co";
const SUPABASE_KEY = "sb_publishable_9NOhtVr9S-dWmvAdkHtSSQ_EaCI5TLp";
const SESSION_KEY = "gemgo-supabase-session-v1";

export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string };
};

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: SupabaseUser;
};

const authHeaders = (token?: string) => ({
  apikey: SUPABASE_KEY,
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const parseError = async (response: Response) => {
  try {
    const body = await response.json() as { msg?: string; message?: string; error_description?: string; error?: string };
    return body.msg ?? body.message ?? body.error_description ?? body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const requestJson = async <T,>(path: string, init: RequestInit = {}, token?: string): Promise<T> => {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init.headers ?? {}) },
  });
  if (!response.ok) throw new Error(await parseError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const withExpiry = (session: SupabaseSession): SupabaseSession => ({
  ...session,
  expires_at: session.expires_at ?? (session.expires_in ? Math.floor(Date.now() / 1000) + session.expires_in : undefined),
});

export const saveSession = (session: SupabaseSession | null) => {
  if (typeof window === "undefined") return;
  if (!session) window.localStorage.removeItem(SESSION_KEY);
  else window.localStorage.setItem(SESSION_KEY, JSON.stringify(withExpiry(session)));
  window.dispatchEvent(new CustomEvent("gemgo:auth-changed", { detail: session }));
};

export const readSession = (): SupabaseSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as SupabaseSession : null;
  } catch {
    return null;
  }
};

export const consumeOAuthHash = () => {
  if (typeof window === "undefined" || !window.location.hash.includes("access_token=")) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  const session = withExpiry({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: params.get("token_type") ?? "bearer",
    expires_in: Number(params.get("expires_in") ?? 3600),
  });
  saveSession(session);
  window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
  return session;
};

export const refreshSession = async (session = readSession()) => {
  if (!session?.refresh_token) return null;
  const next = await requestJson<SupabaseSession>("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  saveSession(next);
  return withExpiry(next);
};

export const getValidSession = async () => {
  const oauth = consumeOAuthHash();
  const session = oauth ?? readSession();
  if (!session) return null;
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt && expiresAt - Math.floor(Date.now() / 1000) < 90) {
    try { return await refreshSession(session); } catch { saveSession(null); return null; }
  }
  return session;
};

export const getCurrentUser = async (session = readSession()) => {
  if (!session?.access_token) return null;
  try {
    return await requestJson<SupabaseUser>("/auth/v1/user", { method: "GET" }, session.access_token);
  } catch {
    const refreshed = await refreshSession(session);
    return refreshed ? requestJson<SupabaseUser>("/auth/v1/user", { method: "GET" }, refreshed.access_token) : null;
  }
};

export const requestEmailOtp = (email: string) => requestJson<void>("/auth/v1/otp", {
  method: "POST",
  body: JSON.stringify({ email: email.trim().toLowerCase(), create_user: true }),
});

export const verifyEmailOtp = async (email: string, token: string) => {
  const session = await requestJson<SupabaseSession>("/auth/v1/verify", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), token: token.trim(), type: "email" }),
  });
  saveSession(session);
  return session;
};

export const signUpWithPassword = async (name: string, email: string, password: string) => {
  const result = await requestJson<SupabaseSession & { user?: SupabaseUser }>("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password, data: { full_name: name.trim() } }),
  });
  if (result.access_token) saveSession(result);
  return result;
};

export const signInWithPassword = async (email: string, password: string) => {
  const session = await requestJson<SupabaseSession>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  saveSession(session);
  return session;
};

export const signInWithGoogle = () => {
  if (typeof window === "undefined") return;
  const redirectTo = `${window.location.origin}/app/profile`;
  window.location.assign(`${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`);
};

export const signOut = async () => {
  const session = readSession();
  try {
    if (session?.access_token) await requestJson<void>("/auth/v1/logout", { method: "POST" }, session.access_token);
  } finally {
    saveSession(null);
  }
};

const fromBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
};

const toBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const prepareCreationOptions = (options: PublicKeyCredentialCreationOptionsJSON) => ({
  ...options,
  challenge: fromBase64Url(options.challenge),
  user: { ...options.user, id: fromBase64Url(options.user.id) },
  excludeCredentials: options.excludeCredentials?.map((item) => ({ ...item, id: fromBase64Url(item.id) })),
}) as PublicKeyCredentialCreationOptions;

const prepareRequestOptions = (options: PublicKeyCredentialRequestOptionsJSON) => ({
  ...options,
  challenge: fromBase64Url(options.challenge),
  allowCredentials: options.allowCredentials?.map((item) => ({ ...item, id: fromBase64Url(item.id) })),
}) as PublicKeyCredentialRequestOptions;

const serializeCredential = (credential: PublicKeyCredential) => {
  const response = credential.response;
  if (response instanceof AuthenticatorAttestationResponse) {
    return {
      id: credential.id,
      rawId: toBase64Url(credential.rawId),
      type: credential.type,
      clientExtensionResults: credential.getClientExtensionResults(),
      response: {
        clientDataJSON: toBase64Url(response.clientDataJSON),
        attestationObject: toBase64Url(response.attestationObject),
        transports: response.getTransports?.() ?? [],
      },
    };
  }
  const assertion = response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: toBase64Url(assertion.clientDataJSON),
      authenticatorData: toBase64Url(assertion.authenticatorData),
      signature: toBase64Url(assertion.signature),
      userHandle: assertion.userHandle ? toBase64Url(assertion.userHandle) : null,
    },
  };
};

type PublicKeyCredentialDescriptorJSON = Omit<PublicKeyCredentialDescriptor, "id"> & { id: string };
type PublicKeyCredentialCreationOptionsJSON = Omit<PublicKeyCredentialCreationOptions, "challenge" | "user" | "excludeCredentials"> & {
  challenge: string;
  user: Omit<PublicKeyCredentialUserEntity, "id"> & { id: string };
  excludeCredentials?: PublicKeyCredentialDescriptorJSON[];
};
type PublicKeyCredentialRequestOptionsJSON = Omit<PublicKeyCredentialRequestOptions, "challenge" | "allowCredentials"> & {
  challenge: string;
  allowCredentials?: PublicKeyCredentialDescriptorJSON[];
};

type PasskeyOptions<T> = { challenge_id: string; options: T };

export const passkeysSupported = () => typeof window !== "undefined" && "PublicKeyCredential" in window && Boolean(navigator.credentials);

export const registerPasskey = async () => {
  const session = await getValidSession();
  if (!session?.access_token) throw new Error("Sign in before creating a passkey.");
  const start = await requestJson<PasskeyOptions<PublicKeyCredentialCreationOptionsJSON>>("/auth/v1/passkeys/registration/options", { method: "POST", body: "{}" }, session.access_token);
  const credential = await navigator.credentials.create({ publicKey: prepareCreationOptions(start.options) });
  if (!(credential instanceof PublicKeyCredential)) throw new Error("Passkey creation was cancelled.");
  return requestJson<{ id: string; friendly_name?: string; created_at: string }>("/auth/v1/passkeys/registration/verify", {
    method: "POST",
    body: JSON.stringify({ challenge_id: start.challenge_id, credential: serializeCredential(credential) }),
  }, session.access_token);
};

export const signInWithPasskey = async () => {
  const start = await requestJson<PasskeyOptions<PublicKeyCredentialRequestOptionsJSON>>("/auth/v1/passkeys/authentication/options", { method: "POST", body: "{}" });
  const credential = await navigator.credentials.get({ publicKey: prepareRequestOptions(start.options) });
  if (!(credential instanceof PublicKeyCredential)) throw new Error("Passkey sign-in was cancelled.");
  const session = await requestJson<SupabaseSession>("/auth/v1/passkeys/authentication/verify", {
    method: "POST",
    body: JSON.stringify({ challenge_id: start.challenge_id, credential: serializeCredential(credential) }),
  });
  saveSession(session);
  return session;
};

const restHeaders = (token: string, prefer?: string) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  ...(prefer ? { Prefer: prefer } : {}),
});

const restRequest = async <T,>(path: string, init: RequestInit, token: string): Promise<T> => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...restHeaders(token), ...(init.headers ?? {}) } });
  if (!response.ok) throw new Error(await parseError(response));
  if (response.status === 204 || response.headers.get("content-length") === "0") return undefined as T;
  return response.json() as Promise<T>;
};

export const syncAccountData = async (input: {
  user: SupabaseUser;
  displayName: string;
  avatarUrl?: string;
  savedTrips: Array<{ id: string; name: string; createdAt: string; updatedAt: string; [key: string]: unknown }>;
  collections: Array<{ id: string; name: string; region: string; experienceIds: string[]; updatedAt: string }>;
  ledger: Array<{ id: string; amount: number; type: string; label: string; createdAt: string; balanceAfter: number; status: string; metadata?: unknown }>;
}) => {
  const session = await getValidSession();
  if (!session?.access_token) throw new Error("No active session.");
  const token = session.access_token;
  const profile = [{ id: input.user.id, display_name: input.displayName || "GemGo traveller", email: input.user.email ?? null, avatar_url: input.avatarUrl ?? null, updated_at: new Date().toISOString() }];
  await restRequest("profiles?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(profile) }, token);
  if (input.savedTrips.length) await restRequest("saved_trips?on_conflict=user_id,trip_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(input.savedTrips.map((trip) => ({ user_id: input.user.id, trip_id: trip.id, name: trip.name, payload: trip, created_at: trip.createdAt, updated_at: trip.updatedAt }))) }, token);
  if (input.collections.length) await restRequest("saved_collections?on_conflict=user_id,collection_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(input.collections.map((collection) => ({ user_id: input.user.id, collection_id: collection.id, name: collection.name, region: collection.region, experience_ids: collection.experienceIds, updated_at: collection.updatedAt }))) }, token);
  if (input.ledger.length) await restRequest("gempoint_events?on_conflict=user_id,event_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(input.ledger.map((event) => ({ user_id: input.user.id, event_id: event.id, amount: event.amount, event_type: event.type, label: event.label, created_at: event.createdAt, balance_after: event.balanceAfter, status: event.status, metadata: event.metadata ?? null, trust_level: "client" }))) }, token);
};

export const deleteRemoteAccountData = async (userId: string) => {
  const session = await getValidSession();
  if (!session?.access_token) return;
  const token = session.access_token;
  await Promise.all([
    restRequest(`saved_trips?user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }, token),
    restRequest(`saved_collections?user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }, token),
    restRequest(`gempoint_events?user_id=eq.${encodeURIComponent(userId)}&trust_level=eq.client`, { method: "DELETE" }, token),
    restRequest(`connected_accounts?user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }, token),
    restRequest(`verifications?user_id=eq.${encodeURIComponent(userId)}&status=in.(pending,demo)`, { method: "DELETE" }, token),
    restRequest(`profiles?id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }, token),
  ]);
};
