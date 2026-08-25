import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

const serviceRoleKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side operations.");
  }
  return key;
};

// This client is intentionally server-only. It is used after the request's
// cookie-backed client has authenticated the contributor, so private uploads
// cannot be forged by calling Storage directly with a browser key.
export function createServiceRoleClient() {
  const { url } = getSupabaseConfig();
  return createClient(url, serviceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
