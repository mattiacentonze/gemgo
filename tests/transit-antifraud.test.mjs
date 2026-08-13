import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public transport distinguishes static GTFS access from provider routing", async () => {
  const transit = await source("app/product/transit.ts");
  const shell = await source("app/components/IntegratedAppShell.tsx");
  const feed = JSON.parse(
    await source("app/data/gtfs-bavaria-regional-stops.json"),
  );

  assert.ok(feed.stops.length > 800);
  assert.match(transit, /status: "static-gtfs-access"/);
  assert.match(transit, /status: "official-provider-fallback"/);
  assert.match(transit, /travelmode: "transit"/);
  assert.match(transit, /GTFS\.de \/ DELFI/);
  assert.match(transit, /Arriva Italia Valle d’Aosta/);
  assert.match(transit, /BAVARIA_OPERATOR_URL/);
  assert.match(transit, /AOSTA_OPERATOR_URL/);
  assert.match(
    transit,
    /checked-in subset has no trips or stop_times[\s\S]*actual itinerary is always resolved by an external provider/,
  );
  assert.doesNotMatch(transit, /liveDeparture|liveArrival|realtimeTrip/);

  assert.match(shell, /transitAccessPlan/);
  assert.match(shell, /transitStatic/);
  assert.match(shell, /transitAosta/);
  assert.match(shell, /target="_blank"/);
});

test("contribution API gathers separate, bounded evidence and screens automation", async () => {
  const route = await source("app/api/gems/route.ts");

  assert.match(route, /MIN_FORM_AGE_MS = 2_000/);
  assert.match(route, /MAX_FORM_AGE_MS = 4 \* 60 \* 60 \* 1_000/);
  assert.match(route, /honeypot/);
  assert.match(route, /sec-fetch-site/);
  assert.match(route, /cross_site_request/);
  assert.match(route, /locationLatitude/);
  assert.match(route, /locationAccuracy/);
  assert.match(route, /locationCapturedAt/);
  assert.match(route, /greyscale\(\)/);
  assert.match(route, /resize\(9, 8/);
  assert.match(route, /perceptualHash/);
  assert.match(route, /p_photo_perceptual_hash/);
  assert.match(route, /p_location_accuracy_m/);
  assert.doesNotMatch(route, /service_role|SUPABASE_SECRET|sb_secret_/);
});

test("database migration makes anti-fraud checks atomic and rewards review-only", async () => {
  const migration = await source(
    "supabase/migrations/20260813083323_contribution_antifraud_evidence.sql",
  );
  const baseMigration = await source(
    "supabase/migrations/20260812090000_auth_roles_contributions.sql",
  );

  assert.match(migration, /drop function public\.submit_gem_suggestion/);
  assert.match(migration, /location_source = 'device_gps_claim'/);
  assert.match(migration, /p_location_captured_at < now\(\) - interval '20 minutes'/);
  assert.match(migration, /location_outside_region/);
  assert.match(migration, /47\.20 and 48\.30/);
  assert.match(migration, /45\.45 and 46\.10/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /reward_farming_limit/);
  assert.match(migration, />= 3[\s\S]*>= 8[\s\S]*>= 20/);
  assert.match(migration, /bit_count\([\s\S]*<= 6/);
  assert.match(migration, /duplicate_media/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/);

  assert.match(baseMigration, /event_id[\s\S]*'contribution:' \|\| v_gem\.id::text/);
  assert.match(baseMigration, /on conflict \(user_id, event_id\) do nothing/);
  assert.match(
    baseMigration,
    /if v_gem\.status = p_decision then[\s\S]*return query select v_gem\.id, v_gem\.status, 0/,
  );
  assert.doesNotMatch(migration, /insert into public\.gempoint_events/);
});

test("authenticated browser story is local-only and replays approval idempotently", async () => {
  const provider = await source("app/components/AuthProvider.tsx");
  const e2e = await source("tests/authenticated-contribution-flow.spec.ts");
  const packageJson = JSON.parse(await source("package.json"));

  assert.match(provider, /NEXT_PUBLIC_GEMGO_E2E_MOCK_AUTH === "1"/);
  assert.match(provider, /\["127\.0\.0\.1", "localhost"\]\.includes/);
  assert.match(e2e, /page\.route\("\*\*\/\*"/);
  assert.match(e2e, /state\.verifiedBalance\)\.toBe\(0\)/);
  assert.match(e2e, /state\.verifiedBalance\)\.toBe\(70\)/);
  assert.match(e2e, /replay\[0\]\.awarded_now\)\.toBe\(0\)/);
  assert.match(
    packageJson.scripts["test:authenticated"],
    /NEXT_PUBLIC_GEMGO_E2E_MOCK_AUTH=1/,
  );
});
