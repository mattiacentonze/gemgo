import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidParseResult,
  parsePrompt,
} from "../app/lib/prompt-parser.ts";
import { formatDuration, validStartDate } from "../app/lib/travel.ts";

const now = new Date("2026-07-29T12:00:00");

const cases = [
  {
    input: "three days by bike",
    expected: { days: 3, transport: "cycling" },
  },
  {
    input: "tre giorni in bicicletta",
    expected: { days: 3, transport: "cycling" },
  },
  {
    input: "drei ruhige Tage",
    expected: { days: 3, avoidCrowds: true },
  },
  {
    input: "trois jours près des lacs",
    expected: { days: 3, interests: ["lakes"] },
  },
  {
    input: "tri dni z javnim prevozom",
    expected: { days: 3, transport: "public_transport" },
  },
];

for (const { input, expected } of cases) {
  test(`parses required multilingual example: ${input}`, () => {
    const parsed = parsePrompt(input, { now });
    for (const [key, value] of Object.entries(expected)) {
      if (Array.isArray(value)) {
        assert.deepEqual(parsed[key], value);
      } else {
        assert.equal(parsed[key], value);
      }
    }
    assert.equal(isValidParseResult(parsed), true);
  });
}

const multilingualMatrix = [
  {
    locale: "EN",
    input: "tomorrow, three days in Bavaria by train with quiet lakes",
    expected: { days: 3, startDate: "2026-07-30", region: "bavaria", transport: "public_transport", interest: "lakes", avoidCrowds: true },
  },
  {
    locale: "IT",
    input: "domani, due giorni in Valle d’Aosta con i mezzi pubblici, senza folle e facile",
    expected: { days: 2, startDate: "2026-07-30", region: "aosta", transport: "public_transport", avoidCrowds: true, difficulty: "easy" },
  },
  {
    locale: "DE",
    input: "übermorgen drei Tage in Bayern mit öffentlichen Verkehrsmitteln ohne Menschenmengen und leicht",
    expected: { days: 3, startDate: "2026-07-31", region: "bavaria", transport: "public_transport", avoidCrowds: true, difficulty: "easy" },
  },
  {
    locale: "FR",
    input: "demain, deux jours en Vallée d’Aoste en transports publics, sans foule, facile",
    expected: { days: 2, startDate: "2026-07-30", region: "aosta", transport: "public_transport", avoidCrowds: true, difficulty: "easy" },
  },
  {
    locale: "SL",
    input: "jutri, štiri dni na Bavarskem z javnim prevozom, brez gneče in lahko",
    expected: { days: 4, startDate: "2026-07-30", region: "bavaria", transport: "public_transport", avoidCrowds: true, difficulty: "easy" },
  },
];

for (const { locale, input, expected } of multilingualMatrix) {
  test(`parses the complete ${locale} deterministic matrix`, () => {
    const parsed = parsePrompt(input, { now });
    assert.equal(parsed.days, expected.days);
    assert.equal(parsed.startDate, expected.startDate);
    assert.equal(parsed.region, expected.region);
    assert.equal(parsed.transport, expected.transport);
    assert.equal(parsed.avoidCrowds, expected.avoidCrowds);
    if (expected.interest) assert(parsed.interests.includes(expected.interest));
    if (expected.difficulty) assert.equal(parsed.difficulty, expected.difficulty);
    assert.equal(isValidParseResult(parsed), true);
  });
}

test("handles transport and interest negations without inventing defaults", () => {
  const italian = parsePrompt("non voglio la macchina, senza musei", { now });
  assert.equal(italian.transport, undefined);
  assert.deepEqual(italian.excludedTransports, ["driving"]);
  assert.deepEqual(italian.excludedInterests, ["culture"]);

  const german = parsePrompt("kein Auto, drei Tage", { now });
  assert.deepEqual(german.excludedTransports, ["driving"]);
  assert.equal(german.days, 3);

  const french = parsePrompt("pas de voiture, sans musées", { now });
  assert.deepEqual(french.excludedTransports, ["driving"]);
  assert.deepEqual(french.excludedInterests, ["culture"]);

  const slovenian = parsePrompt("brez avta in brez muzejev", { now });
  assert.deepEqual(slovenian.excludedTransports, ["driving"]);
  assert.deepEqual(slovenian.excludedInterests, ["culture"]);
});

test("keeps negation attached to the exact matched span and prefers e-bike phrases", () => {
  const french = parsePrompt("je ne veux pas marcher", { now });
  assert.deepEqual(french.excludedTransports, ["walking"]);
  assert.equal(french.transport, undefined);

  const eBike = parsePrompt("no e-bike", { now });
  assert.deepEqual(eBike.excludedTransports, ["e_bike"]);
  assert.equal(eBike.transport, undefined);
  assert.equal(eBike.ambiguous.includes("transport"), false);

  assert.equal(parsePrompt("non impegnativo", { now }).difficulty, "easy");
  assert.equal(parsePrompt("pas difficile", { now }).difficulty, "easy");
  assert.equal(parsePrompt("ne zahtevno", { now }).difficulty, "easy");
});

test("recognises explicit crowd avoidance before and after crowd terms in every locale", () => {
  for (const input of [
    "avoid crowds",
    "evitare la folla",
    "Menschenmengen vermeiden",
    "éviter les foules",
    "izogibati se gneči",
  ]) {
    assert.equal(parsePrompt(input, { now }).avoidCrowds, true, input);
  }
  assert.equal(parsePrompt("crowded places", { now }).avoidCrowds, false);
});

test("parses relative, weekday and explicit dates", () => {
  assert.equal(
    parsePrompt("dopodomani", { now }).startDate,
    "2026-07-31",
  );
  assert.equal(
    parsePrompt("vendredi", { now }).startDate,
    "2026-07-31",
  );
  assert.equal(
    parsePrompt("partenza 04/08/2026", { now }).startDate,
    "2026-08-04",
  );
  assert.equal(
    parsePrompt("start 2026-08-05", { now }).startDate,
    "2026-08-05",
  );
});

test("treats sentence-ending punctuation as a boundary in every locale", () => {
  const punctuatedTransports = [
    ["Travel by bike.", "cycling"],
    ["Viaggio in bici.", "cycling"],
    ["Anreise mit dem Zug.", "public_transport"],
    ["Voyage à vélo.", "cycling"],
    ["Potovanje z vlakom.", "public_transport"],
  ];

  for (const [input, transport] of punctuatedTransports) {
    assert.equal(parsePrompt(input, { now }).transport, transport, input);
  }

  const withDate = parsePrompt("Start 2026-08-05. Travel by bike.", { now });
  assert.equal(withDate.startDate, "2026-08-05");
  assert.equal(withDate.transport, "cycling");
});

test("handles Slovenian weekday cases and rejects impossible calendar dates", () => {
  assert.equal(parsePrompt("v sredo", { now }).startDate, "2026-08-05");
  assert.equal(parsePrompt("v soboto", { now }).startDate, "2026-08-01");
  assert.equal(parsePrompt("v nedeljo", { now }).startDate, "2026-08-02");
  assert.equal(parsePrompt("31/02/2026", { now }).startDate, undefined);
  assert.equal(parsePrompt("2026-02-31", { now }).startDate, undefined);
});

test("supports light fuzzy matching, mixed languages and hours", () => {
  const typo = parsePrompt("tre giorni in bicicletta tra i panorma", { now });
  assert.equal(typo.days, 3);
  assert.equal(typo.transport, "cycling");
  assert(typo.interests.includes("views"));

  const mixed = parsePrompt(
    "Tomorrow tre giorni in Bayern by train avec des lacs",
    { now },
  );
  assert.equal(mixed.startDate, "2026-07-30");
  assert.equal(mixed.days, 3);
  assert.equal(mixed.region, "bavaria");
  assert.equal(mixed.transport, "public_transport");
  assert(mixed.interests.includes("lakes"));

  assert.equal(parsePrompt("48 ore", { now }).days, 2);
});

test("keeps both days of a two-day trip and recognises Valle d’Aosta", () => {
  const hyphenated = parsePrompt("a two-day trip in Valle d'Aosta", { now });
  assert.equal(hyphenated.days, 2);
  assert.equal(hyphenated.region, "aosta");

  const italian = parsePrompt("due giorni in Valle d’Aosta", { now });
  assert.equal(italian.days, 2);
  assert.equal(italian.region, "aosta");
});

test("formats long travel times and repairs an empty planner start date", () => {
  assert.equal(formatDuration(250, "en"), "4 h 10 min");
  assert.equal(formatDuration(69, "it"), "1 h 9 min");
  assert.equal(validStartDate("", "2026-08-04"), "2026-08-04");
  assert.equal(validStartDate("2026-08-08", "2026-08-04"), "2026-08-08");
});

test("keeps incomplete input genuinely incomplete and flags ambiguity", () => {
  const incomplete = parsePrompt("sorpresa", { now });
  assert.equal(incomplete.days, undefined);
  assert.equal(incomplete.transport, undefined);
  assert.equal(incomplete.region, undefined);
  assert.equal(incomplete.avoidCrowds, undefined);

  const ambiguous = parsePrompt("by bike and by train", { now });
  assert(ambiguous.ambiguous.includes("transport"));
  assert.equal(isValidParseResult(ambiguous), true);

  const regions = parsePrompt("Bavaria or Aosta", { now });
  assert.equal(regions.region, "aosta");
  assert(regions.ambiguous.includes("region"));
});

test("validates all parsed fields instead of accepting structurally invalid results", () => {
  const valid = parsePrompt("two days", { now });
  assert.equal(isValidParseResult({ ...valid, startDate: "2026-02-31" }), false);
  assert.equal(isValidParseResult({ ...valid, avoidCrowds: "yes" }), false);
  assert.equal(isValidParseResult({ ...valid, confidence: 1.1 }), false);
  assert.equal(isValidParseResult({ ...valid, ambiguous: [3] }), false);
});
