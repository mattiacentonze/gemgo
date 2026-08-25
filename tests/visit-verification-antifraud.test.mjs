import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { gemDropAlternativeFor } from "../app/product/gemdrop.ts";
import {
  validateVisitLocation,
  visitDistanceMeters,
} from "../app/lib/visit-verification.ts";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const experience = (overrides) => ({
  id: "original",
  name: "Original",
  region: "Bavaria",
  country: "Germany",
  kind: ["nature"],
  difficulty: "easy",
  latitude: 47.5,
  longitude: 11,
  travel: { walking: 1, bicycle: 1, public: 1, car: 1, mixed: 1 },
  durationMinutes: 90,
  crowd: "high",
  crowdWindow: "static",
  confidence: "Medium",
  updated: "2026-08-25",
  validation: "Data-based suggestion",
  imageTone: "forest",
  promise: "Test",
  summary: "Test",
  reasons: [],
  tradeoffs: [],
  comparison: { original: "", reachDifference: "", advantages: [] },
  itinerary: [],
  mobility: [],
  localBenefit: "",
  safety: [],
  points: 60,
  crowdByHour: [],
  ...overrides,
});

test("GemDrop pairing is deterministic, nearby, relevant and strictly lower-pressure", () => {
  const original = experience({});
  const lowNear = experience({
    id: "low-near",
    name: "Low near",
    crowd: "low",
    latitude: 47.55,
  });
  const lowFar = experience({
    id: "low-far",
    name: "Low far",
    crowd: "low",
    latitude: 49,
  });
  const moderateNear = experience({
    id: "moderate-near",
    name: "Moderate near",
    crowd: "moderate",
    latitude: 47.51,
  });
  const wrongRegion = experience({
    id: "wrong-region",
    name: "Wrong region",
    region: "Valle d’Aosta",
    crowd: "low",
  });
  const unrelated = experience({
    id: "unrelated",
    name: "Unrelated",
    kind: ["museum"],
    crowd: "low",
  });

  assert.equal(
    gemDropAlternativeFor(
      [original, moderateNear, wrongRegion, lowFar, unrelated, lowNear],
      original,
    )?.id,
    "low-near",
  );
  assert.equal(
    gemDropAlternativeFor(
      [experience({ ...original, crowd: "low" }), moderateNear, lowNear],
      experience({ ...original, crowd: "low" }),
    ),
    null,
  );
});

test("location validation enforces coordinate, accuracy, freshness and distance boundaries", () => {
  const now = Date.parse("2026-08-25T10:00:00.000Z");
  const destination = { latitude: 47.5, longitude: 11 };
  const valid = {
    latitude: 47.5005,
    longitude: 11,
    accuracy: 25,
    capturedAt: "2026-08-25T09:58:00.000Z",
  };
  assert.ok(visitDistanceMeters(valid, destination) < 500);
  assert.deepEqual(validateVisitLocation(valid, destination, now).ok, true);
  assert.deepEqual(
    validateVisitLocation({ ...valid, latitude: 91 }, destination, now),
    { ok: false, error: "invalid_visit_evidence" },
  );
  assert.deepEqual(
    validateVisitLocation({ ...valid, accuracy: 101 }, destination, now),
    { ok: false, error: "location_inaccurate" },
  );
  assert.deepEqual(
    validateVisitLocation(
      { ...valid, capturedAt: "2026-08-25T09:56:59.000Z" },
      destination,
      now,
    ),
    { ok: false, error: "location_stale" },
  );
  assert.deepEqual(
    validateVisitLocation({ ...valid, latitude: 47.51 }, destination, now),
    { ok: false, error: "outside_verification_area" },
  );
});

test("visit API validates fresh evidence against server catalogue and private normalized media", async () => {
  const [route, validation] = await Promise.all([
    source("app/api/visits/route.ts"),
    source("app/lib/visit-verification.ts"),
  ]);

  assert.match(route, /suppliedOrigin !== requestOrigin/);
  assert.match(route, /sec-fetch-site/);
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /data\.user\.is_anonymous === true/);
  assert.match(validation, /MAX_LOCATION_AGE_MS = 3 \* 60 \* 1_000/);
  assert.match(validation, /MAX_VISIT_ACCURACY_M = 100/);
  assert.match(validation, /MAX_VISIT_DISTANCE_M = 500/);
  assert.match(route, /allExperiences\.find\(\(item\) => item\.id === experienceId\)/);
  assert.doesNotMatch(
    route,
    /cleanText\(form, "destination(?:Latitude|Longitude)"\)/,
  );
  assert.match(route, /validateVisitLocation/);
  assert.match(route, /\.rotate\(\)/);
  assert.match(route, /\.webp\(/);
  assert.match(route, /\.greyscale\(\)/);
  assert.match(route, /\.resize\(9, 8/);
  assert.match(route, /perceptualHash/);
  assert.match(route, /strips EXIF/);
  assert.match(route, /createHash\("sha256"\)/);
  assert.match(route, /VISIT_EVIDENCE_BUCKET = "visit-evidence"/);
  assert.match(route, /existingObjectMatches/);
  assert.match(route, /uploadedByThisRequest/);
  for (const binding of [
    "trip_id",
    "experience_id",
    "object_path",
    "photo_sha256",
    "photo_perceptual_hash",
    "byte_size",
    "width",
    "height",
    "location_accuracy_m",
    "distance_m",
    "location_captured_at",
    "validation_version",
  ]) {
    assert.match(route, new RegExp(`\\.eq\\("${binding}"`));
  }
  assert.match(route, /if \(recoveryError\)[\s\S]*uploadedByThisRequest = false/);
  assert.match(route, /if \(conflicting\)[\s\S]*idempotency_conflict/);
  assert.match(route, /verification\.verification_id !== clientRequestId/);
  assert.match(
    route,
    /verification\.verification_id !== clientRequestId[\s\S]*uploadedByThisRequest = true;[\s\S]*\.remove\(\[objectPath\]\)[\s\S]*uploadedByThisRequest = false;/,
  );
  assert.match(route, /verification_cleanup_failed/);
  assert.match(route, /record_verified_visit/);
  assert.match(route, /record_gemdrop_acceptance/);
  assert.match(route, /createServiceRoleClient/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("database awards visits atomically and only trusts server-recorded GemDrop acceptance", async () => {
  const migration = await source(
    "supabase/migrations/20260825101548_visit_verification_evidence.sql",
  );

  assert.match(migration, /'visit-evidence',[\s\S]*false/);
  assert.match(migration, /create table if not exists public\.gemdrop_acceptances/);
  assert.match(migration, /create table if not exists public\.visit_verification_evidence/);
  assert.match(migration, /alter table public\.visit_verification_evidence enable row level security/);
  assert.match(migration, /grant select on public\.gemdrop_acceptances, public\.visit_verification_evidence[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete|all)[^;]*visit_verification_evidence[^;]*authenticated/i);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.equal(
    (migration.match(/gemgo:account-delete:/g) ?? []).length,
    2,
    "both service RPCs must serialize with account deletion",
  );
  assert.match(migration, /grant execute on function public\.record_verified_visit[\s\S]*to service_role/);
  assert.doesNotMatch(migration, /grant execute on function public\.record_verified_visit[\s\S]*to authenticated/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /visit_verification_client_key unique/);
  assert.match(migration, /visit_verification_trip_stop_key unique/);
  assert.match(migration, /visit_rate_limit/);
  assert.match(migration, /visit_cooldown/);
  assert.match(migration, /duplicate_visit_photo/);
  assert.match(migration, /gemgo:visit-media-dedup/);
  assert.match(migration, /photo_perceptual_hash/);
  assert.match(migration, /bit_count\([\s\S]*\) <= 6/);
  assert.match(migration, /from storage\.objects/);
  assert.match(migration, /from public\.gemdrop_acceptances/);
  assert.match(migration, /trip_original_stop_not_found/);
  assert.match(
    migration,
    /t\.payload #>> '\{trip,experienceId\}' = p_original_experience_id[\s\S]*stop\.id = p_original_experience_id/,
  );
  assert.match(migration, /v_points := 60 \+ case when v_accepted then 20 else 0 end/);
  assert.match(migration, /'visit:' \|\| p_id::text/);
  assert.match(migration, /'gemdrop:' \|\| p_id::text/);
  assert.match(migration, /'arrival_photo_gps_claim'/);
  assert.doesNotMatch(
    migration,
    /jsonb_build_object\([\s\S]{0,400}'latitude'|jsonb_build_object\([\s\S]{0,400}'longitude'/,
  );
});

test("signed-in proof and every demo fallback are separated in the UI in five locales", async () => {
  const [component, shell, copy, types] = await Promise.all([
    source("app/components/VisitVerificationForm.tsx"),
    source("app/components/IntegratedAppShell.tsx"),
    source("app/i18n/visit-verification.ts"),
    source("app/product/types.ts"),
  ]);

  assert.match(component, /capture="environment"/);
  assert.match(component, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(component, /maximumAge: 0/);
  assert.match(component, /clientRequestId/);
  assert.match(component, /crypto\.randomUUID\(\)/);
  assert.match(component, /\[experienceId, tripId\]/);
  assert.match(
    component,
    /requestIdRef\.current = null;[\s\S]*setLocation\(nextLocation\)/,
  );
  assert.match(component, /await onBeforeSubmit\(\)/);
  assert.match(component, /consent/);
  assert.match(component, /if \(!signedIn \|\| !tripId\)/);
  assert.match(shell, /<VisitVerificationForm/);
  assert.match(shell, /<VerificationModal[\s\S]*onBeforeSubmit=\{auth\.refreshAccount\}/);
  assert.match(shell, /<VisitVerificationForm[\s\S]*onBeforeSubmit=\{onBeforeSubmit\}/);
  assert.match(shell, /completeVerifiedVisit/);
  assert.match(shell, /completeDemoVerification/);
  const demoHandler = shell.slice(
    shell.indexOf("const completeDemoVerification"),
    shell.indexOf("const completeVerifiedVisit"),
  );
  assert.match(demoHandler, /status: "demo"/);
  assert.doesNotMatch(demoHandler, /\[\.\.\.verifiedExperienceIds, experience\.id\]/);
  assert.match(shell, /GEMGO-DEMO-2026/);
  assert.match(shell, /proofText\.demoQrLabel/);
  assert.match(shell, /source: "photo-gps"/);
  assert.match(types, /"photo-gps"/);
  for (const locale of ["en", "it", "de", "fr", "sl"]) {
    assert.match(copy, new RegExp(`\\b${locale}: \\{`));
  }
});

test("account deletion scans the private visit prefix before Auth cascade removes evidence rows", async () => {
  const [worker, migration, exportRoute, privacy] = await Promise.all([
    source("supabase/functions/account-deletion-worker/index.ts"),
    source("supabase/migrations/20260825101548_visit_verification_evidence.sql"),
    source("app/api/account/export/route.ts"),
    source("app/privacy/page.tsx"),
  ]);

  assert.match(worker, /VISIT_EVIDENCE_BUCKET = "visit-evidence"/);
  assert.match(worker, /orphanedPaths\([\s\S]*VISIT_EVIDENCE_BUCKET/);
  assert.match(worker, /removePaths\(supabase, VISIT_EVIDENCE_BUCKET/);
  assert.match(
    migration,
    /user_id uuid not null references auth\.users\(id\) on delete cascade/,
  );
  assert.match(
    migration,
    /verification_id uuid primary key[\s\S]*references public\.verifications\(id\) on delete cascade/,
  );
  assert.match(migration, /account_deletion_pending/);
  assert.match(exportRoute, /visit_verification_evidence/);
  assert.match(exportRoute, /visitVerificationEvidence/);
  assert.doesNotMatch(
    exportRoute,
    /select\([\s\S]{0,300}object_path/,
  );
  assert.match(privacy, /Raw coordinates|coordinate grezze|Rohkoordinaten|coordonnées brutes|surovih koordinat/);
});
