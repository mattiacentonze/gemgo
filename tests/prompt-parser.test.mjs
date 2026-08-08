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
});
