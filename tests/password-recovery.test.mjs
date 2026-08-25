import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("password recovery is localised and the profile exposes the reset entry point", async () => {
  const [profile, copy] = await Promise.all([
    source("app/app/profile/page.tsx"),
    source("app/i18n/auth-recovery.ts"),
  ]);
  for (const locale of ["en", "it", "de", "fr", "sl"]) {
    assert.match(copy, new RegExp(`\\b${locale}: \\{`));
  }
  assert.match(copy, /requestSent/);
  assert.match(copy, /invalidTitle/);
  assert.match(profile, /href="\/auth\/forgot-password"/);
  assert.match(profile, /password_reset.*success/);
  assert.match(profile, /AUTH_RETURN_PATHS/);
  assert.match(profile, /destination\.origin !== current\.origin/);
  assert.match(profile, /reauth.*delete/);
});

test("password-reset requests use the PKCE callback and do not branch on account existence", async () => {
  const page = await source("app/auth/forgot-password/page.tsx");
  assert.match(page, /resetPasswordForEmail/);
  assert.match(page, /\/auth\/callback\?next=\/auth\/update-password/);
  assert.match(page, /finally \{[\s\S]*setState\("sent"\)/);
  assert.match(page, /enumeration oracle/);
  assert.doesNotMatch(page, /result\.error|state === "error"/);
  assert.doesNotMatch(page, /user_not_found|email_not_confirmed|not registered/i);
});

test("the callback and change-password page handle recovery sessions, invalid links and sign-out", async () => {
  const [callback, marker, sessionRoute, page] = await Promise.all([
    source("app/auth/callback/route.ts"),
    source("app/auth/recovery-marker.ts"),
    source("app/api/auth/recovery-session/route.ts"),
    source("app/auth/update-password/page.tsx"),
  ]);
  assert.match(callback, /PASSWORD_UPDATE_PATH/);
  assert.match(callback, /invalid_or_expired/);
  assert.match(callback, /if \(!code\)/);
  assert.match(callback, /"redirectType" in data/);
  assert.match(callback, /redirectType === "recovery"/);
  assert.match(callback, /new URL\(PASSWORD_UPDATE_PATH, requestUrl\.origin\)/);
  assert.match(callback, /if \(isPasswordRecovery\) return invalidRecoveryRedirect/);
  assert.doesNotMatch(callback, /searchParams\.set\("recovery", "1"\)/);
  assert.match(marker, /createHmac\("sha256", signingSecret\(\)\)/);
  assert.match(marker, /userId.*expiresAt/);
  assert.match(marker, /timingSafeEqual/);
  assert.match(marker, /httpOnly: true/);
  assert.match(marker, /maxAge: RECOVERY_MARKER_MAX_AGE_SECONDS/);
  assert.match(sessionRoute, /auth\.getUser\(\)/);
  assert.match(sessionRoute, /isValidRecoveryMarker\(marker, data\.user\.id\)/);
  assert.match(sessionRoute, /isSameOrigin/);
  assert.match(page, /fetch\("\/api\/auth\/recovery-session"/);
  assert.doesNotMatch(page, /params\.get\("recovery"\)/);
  assert.doesNotMatch(page, /PASSWORD_RECOVERY/);
  assert.match(page, /auth\.updateUser\(\{ password \}\)/);
  assert.match(page, /signOut\(\{ scope: "global" \}\)/);
  assert.match(page, /window\.location\.replace\("\/app\/profile\?password_reset=success"\)/);
  assert.match(page, /password !== confirmation/);
});
