const FALLBACK_SUPABASE_URL = "https://lhowrxqddjfvzmlwnuoj.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_9NOhtVr9S-dWmvAdkHtSSQ_EaCI5TLp";

function requireProjectUrl(value: string): string {
  const projectUrl = new URL(value);

  if (projectUrl.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS.");
  }

  return projectUrl.origin;
}

function requirePublishableKey(value: string): string {
  if (!value.startsWith("sb_publishable_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key.",
    );
  }

  return value;
}

export function getSupabaseConfig() {
  const url = requireProjectUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_URL,
  );
  const publishableKey = requirePublishableKey(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      FALLBACK_SUPABASE_PUBLISHABLE_KEY,
  );

  return { url, publishableKey } as const;
}
