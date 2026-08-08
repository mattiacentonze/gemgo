import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyPromptToPreferences,
  getEligibleExperiences,
  rankExperiences,
} from "../app/product/recommendation-engine.ts";
import {
  catalogueEditorial,
  seasonForDate,
} from "../app/product/catalogue-editorial.ts";
import {
  curatedScenarioExperiences,
  curatedScenarios,
  curatedScenarioFor,
} from "../app/product/curated-alternatives.ts";
import {
  BASE_VISIT_POINTS,
  calculateVisitPoints,
} from "../app/product/gempoints.ts";

const source = async (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("catalogue source data has stable identities, coordinates and supported regions", async () => {
  const official = JSON.parse(await source("app/data/destinations.json"));
  const alpify = JSON.parse(await source("app/data/alpify-locations.json"));
  const ids = new Set();
  for (const destination of official.destinations) {
    assert(!ids.has(destination.id), `duplicate official id ${destination.id}`);
    ids.add(destination.id);
    assert(["Bavaria", "Valle d'Aosta"].includes(destination.region));
    assert(destination.latitude >= 44.8 && destination.latitude <= 48.6);
    assert(destination.longitude >= 6.2 && destination.longitude <= 13.4);
    assert(destination.tags.length > 0);
    assert(destination.description.trim().length > 20);
  }
  for (const location of alpify) {
    assert(location.id);
    assert(Number.isFinite(location.lat));
    assert(Number.isFinite(location.lng));
    assert(location.sourceOrNotes);
  }
});

test("catalogue documents acquisition dates, provenance, use limits and EUSALP scope", async () => {
  const catalogue = await source("app/product/catalogue.ts");
  assert.match(catalogue, /catalogueMetadata/);
  assert.match(catalogue, /acquiredAt: "2026-06-07"/);
  assert.match(catalogue, /acquiredAt: "2026-08-07"/);
  assert.match(catalogue, /operational details require local verification/);
  assert.match(catalogue, /memberRegions: 48/);
  assert.match(catalogue, /alpine-region\.eu\/about\/territories/);
});

const experience = ({
  id,
  region = "Bavaria",
  kind = ["nature"],
  crowd = "low",
  difficulty = "easy",
  durationMinutes = 90,
  seasons,
  peakSeasons,
  catalogueSource,
}) => ({
  id,
  name: id,
  promise: id,
  region,
  country: region === "Bavaria" ? "Germany" : "Italy",
  kind,
  difficulty,
  latitude: 47.5,
  longitude: 10.5,
  travel: { walking: 10, bicycle: 10, public: 10, car: 10, mixed: 10 },
  durationMinutes,
  crowd,
  crowdWindow: "10:00–16:00",
  confidence: "Low",
  updated: "test",
  validation: "Data-based suggestion",
  imageTone: "valley",
  summary: "A test destination with enough descriptive content.",
  reasons: ["Test fixture"],
  tradeoffs: [],
  comparison: { original: "Popular place", reachDifference: "10m", advantages: [] },
  itinerary: [],
  mobility: [],
  localBenefit: "Local benefit",
  safety: [],
  points: BASE_VISIT_POINTS,
  seasons,
  peakSeasons,
  catalogueSource,
  crowdByHour: [],
});

const preferences = {
  prompt: "quiet nature in Bavaria for half a day",
  origin: "Start",
  region: "Bavaria",
  maxTravelMinutes: 45,
  transport: "car",
  availableTime: "half",
  availableFrom: "14:00",
  availableTo: "18:00",
  kinds: ["nature"],
  requiredKinds: ["nature"],
  avoidCrowds: true,
  difficulty: "easy",
  needs: [],
};

test("recommendations never backfill across hard region, tag, crowd or time gates", () => {
  const ranked = rankExperiences(
    [
      experience({ id: "eligible" }),
      experience({ id: "wrong-region", region: "Valle d’Aosta" }),
      experience({ id: "wrong-kind", kind: ["culture"] }),
      experience({ id: "too-busy", crowd: "high" }),
      experience({ id: "too-long", durationMinutes: 230 }),
    ],
    preferences,
    {
      origin: null,
      weather: { source: "unavailable" },
      routeTimes: {
        eligible: 10,
        "wrong-region": 10,
        "wrong-kind": 10,
        "too-busy": 10,
        "too-long": 10,
      },
    },
  );
  assert.deepEqual(ranked.map((item) => item.experience.id), ["eligible"]);
});

test("the explicit prompt interpretation synchronises region, tags and crowd preference", () => {
  const interpreted = applyPromptToPreferences(
    "Mezza giornata tra i laghi in Valle d’Aosta senza folla",
    preferences,
  );
  assert.equal(interpreted.region, "Valle d’Aosta");
  assert.equal(interpreted.availableTime, "half");
  assert(interpreted.requiredKinds.includes("water"));
  assert.equal(interpreted.avoidCrowds, true);
});

test("all 66 prototype catalogue locations have factual editorial metadata and seasons", () => {
  const entries = Object.entries(catalogueEditorial);
  const validSeasons = new Set(["spring", "summer", "autumn", "winter"]);
  assert.equal(entries.length, 66);
  for (const [id, editorial] of entries) {
    assert(editorial.caption.trim().length > 35, `${id} caption`);
    assert.match(editorial.sourceUrl, /^https:\/\//, `${id} source URL`);
    assert(editorial.sourceLabel.trim().length > 2, `${id} source label`);
    assert(editorial.seasons.length > 0, `${id} seasons`);
    assert(editorial.seasons.every((season) => validSeasons.has(season)), `${id} season values`);
  }
});

test("every catalogue and expert caption has all four non-English translations", async () => {
  const editorialSource = await source("app/product/catalogue-editorial.ts");
  const expertSource = await source("app/product/curated-alternatives.ts");
  const translationSource = await source("app/i18n/experience-content.ts");
  const editorialIds = [...editorialSource.matchAll(/^\s{2}(?:"([^"]+)"|([a-z0-9_]+)): \{/gm)]
    .map((match) => `catalogue-${match[1] ?? match[2]}`);
  const expertIds = [...expertSource.matchAll(/^\s{2}\{ id: "(expert-[^"]+)"/gm)]
    .map((match) => match[1]);
  const translatedIds = [...translationSource.matchAll(/^\s{2}"([^"]+)": \[$/gm)]
    .map((match) => match[1]);
  assert.equal(editorialIds.length, 66);
  assert.equal(expertIds.length, 21);
  assert.equal(new Set(translatedIds).size, 87);
  assert.deepEqual(
    [...editorialIds, ...expertIds].filter((id) => !translatedIds.includes(id)),
    [],
  );
  assert.match(translationSource, /localizedExperienceCaption/);
  assert.match(translationSource, /localizedExperienceNarrative/);
});

test("season suitability is a hard recommendation gate based on the trip date", () => {
  const summer = experience({ id: "summer", seasons: ["summer"] });
  const winter = experience({ id: "winter", seasons: ["winter"] });
  const ranked = getEligibleExperiences(
    [summer, winter],
    { ...preferences, startsAt: "2026-07-18T10:00:00.000Z" },
    { origin: null, routeTimes: { summer: 10, winter: 10 } },
  );
  assert.equal(seasonForDate("2026-07-18T10:00:00.000Z"), "summer");
  assert.deepEqual(ranked.map((item) => item.id), ["summer"]);
});

test("the tourism-expert sequence takes priority over generic kind and difficulty filters", () => {
  const pontDAel = experience({
    id: "catalogue-vda_013",
    region: "Valle d’Aosta",
    kind: ["culture"],
    difficulty: "moderate",
    seasons: ["summer"],
  });
  const genericCulture = experience({
    id: "generic-culture",
    region: "Valle d’Aosta",
    kind: ["culture"],
    difficulty: "moderate",
    seasons: ["summer"],
  });
  const eligible = getEligibleExperiences(
    [genericCulture, pontDAel],
    {
      ...preferences,
      origin: "Cogne",
      region: "Valle d’Aosta",
      requiredKinds: ["nature"],
      startsAt: "2026-08-09T09:00:00.000Z",
    },
    { origin: null },
  );
  assert.deepEqual(eligible.map((item) => item.id), ["catalogue-vda_013"]);
});

test("all contest alternatives share one base award and the eight expert sequences stay intact", () => {
  assert.equal(curatedScenarios.length, 8);
  assert.equal(curatedScenarioExperiences.length, 21);
  assert(curatedScenarioExperiences.every((item) => item.points === BASE_VISIT_POINTS));
  assert.deepEqual(
    curatedScenarioFor({ origin: "Neuschwanstein", prompt: "" })?.alternatives.map((item) => item.id),
    ["expert-speiden", "expert-eisenberg-ruin", "expert-hohenfreyberg-ruin"],
  );
  assert.deepEqual(
    curatedScenarioFor({ origin: "Aosta", prompt: "" })?.alternatives.map((item) => item.id),
    ["catalogue-vda_022", "expert-etrubles", "catalogue-vda_009", "expert-doues-aqueduct"],
  );
});

test("GemPoints use one base value plus transport and suitable off-peak bonuses", () => {
  const place = experience({
    id: "points",
    seasons: ["spring", "summer", "autumn", "winter"],
    peakSeasons: ["summer"],
  });
  const peakCar = calculateVisitPoints(place, "car", "2026-07-18");
  const offPeakWalk = calculateVisitPoints(place, "walking", "2026-01-18");
  assert.deepEqual(
    { base: peakCar.base, transport: peakCar.transportBonus, offPeak: peakCar.offPeakBonus, total: peakCar.total },
    { base: 60, transport: 0, offPeak: 0, total: 60 },
  );
  assert.deepEqual(
    { base: offPeakWalk.base, transport: offPeakWalk.transportBonus, offPeak: offPeakWalk.offPeakBonus, total: offPeakWalk.total },
    { base: 60, transport: 20, offPeak: 15, total: 95 },
  );
});
