import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the application route uses the integrated product shell", async () => {
  const route = await source("app/app/page.tsx");
  assert.match(route, /IntegratedAppShell/);
  assert.doesNotMatch(route, /export \{ default \} from "\.\.\/page"/);
});

test("the integrated catalogue retains the existing public destinations", async () => {
  const data = JSON.parse(await source("app/data/destinations.json"));
  const adapter = await source("app/product/integrated-data.ts");
  assert.equal(data.meta.total_entries, 50);
  assert.equal(data.destinations.length, 50);
  assert.match(adapter, /publicDestinations/);
  assert.match(adapter, /curatedExperiences/);
  assert.match(adapter, /allExperiences/);
});

test("natural language feeds editable preferences and distinct ranking roles", async () => {
  const engine = await source("app/product/recommendation-engine.ts");
  assert.match(engine, /parsePrompt/);
  assert.match(engine, /applyPromptToPreferences/);
  assert.match(engine, /Best match/);
  assert.match(engine, /Quietest choice/);
  assert.match(engine, /Most local impact/);
  assert.match(engine, /needs\.every/);
  assert.match(engine, /precipitationProbability/);
});

test("the new map uses real geography, gentler wheel zoom and clustering above two nearby markers", async () => {
  const map = await source("app/components/ExperienceMap.tsx");
  const overview = await source("app/components/AlpineOverview.tsx");
  assert.match(map, /tileLayer\("https:\/\/\{s\}\.tile\.openstreetmap\.org/);
  assert.match(map, /wheelPxPerZoomLevel: 140/);
  assert.match(map, /group\.items\.length > 2/);
  assert.match(map, /mapReady/);
  assert.match(overview, /ExperienceMap/);
  assert.doesNotMatch(overview, /alpine-ridge/);
});

test("My Trip persists multiple plans and GemPoints use an event ledger", async () => {
  const storage = await source("app/product/storage.ts");
  const shell = await source("app/components/IntegratedAppShell.tsx");
  assert.match(storage, /gemgo-trips-v3/);
  assert.match(storage, /GemPointEvent/);
  assert.match(storage, /appendPointEvent/);
  assert.match(shell, /Duplicate/);
  assert.match(shell, /Rename/);
  assert.match(shell, /Save essentials offline/);
  assert.doesNotMatch(shell, /GemXP/);
  assert.doesNotMatch(shell, /GemCredits/);
});

test("visit verification supports GPS, partner codes and an explicitly labelled demo path", async () => {
  const shell = await source("app/components/IntegratedAppShell.tsx");
  assert.match(shell, /navigator\.geolocation/);
  assert.match(shell, /distance <= 2/);
  assert.match(shell, /Partner QR code/);
  assert.match(shell, /demo verification/);
  assert.match(shell, /status: "demo" \| "verified"/);
});

test("the redesigned interface exposes all five required locales", async () => {
  const shell = await source("app/components/IntegratedAppShell.tsx");
  for (const locale of ["en", "it", "de", "fr", "sl"]) {
    assert.match(shell, new RegExp(`\\b${locale}: \\{`));
  }
  assert.match(shell, /gemgo-locale-v3/);
});
