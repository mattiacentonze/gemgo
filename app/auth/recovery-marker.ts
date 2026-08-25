import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const RECOVERY_MARKER_COOKIE = "__Host-gemgo-recovery-session";
export const RECOVERY_MARKER_MAX_AGE_SECONDS = 10 * 60;

const MARKER_VERSION = "v1";

function signingSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to sign password-recovery markers.",
    );
  }
  return secret;
}

function markerSignature(userId: string, expiresAt: number) {
  return createHmac("sha256", signingSecret())
    .update(`${MARKER_VERSION}:${userId}:${expiresAt}`)
    .digest("base64url");
}

export function createRecoveryMarker(userId: string, now = Date.now()) {
  const expiresAt =
    Math.floor(now / 1000) + RECOVERY_MARKER_MAX_AGE_SECONDS;
  return `${MARKER_VERSION}.${expiresAt}.${markerSignature(userId, expiresAt)}`;
}

export function isValidRecoveryMarker(
  marker: string | undefined,
  userId: string,
  now = Date.now(),
) {
  if (!marker) return false;

  const [version, expiresAtValue, suppliedSignature, extra] = marker.split(".");
  const expiresAt = Number(expiresAtValue);
  const nowSeconds = Math.floor(now / 1000);

  if (
    extra !== undefined ||
    version !== MARKER_VERSION ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= nowSeconds ||
    expiresAt > nowSeconds + RECOVERY_MARKER_MAX_AGE_SECONDS
  ) {
    return false;
  }

  const expectedSignature = markerSignature(userId, expiresAt);
  const supplied = Buffer.from(suppliedSignature ?? "", "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export const recoveryMarkerCookieOptions = {
  httpOnly: true,
  maxAge: RECOVERY_MARKER_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax",
  secure: true,
} as const;
