import test from "node:test";
import assert from "node:assert/strict";
import { geocodePlace, osrmProfile } from "../app/lib/geo.ts";

test("offline pilot-area geocoding resolves accents and common names", async () => {
  const aosta = await geocodePlace("Aosta");
  const fussen = await geocodePlace("Füssen");
  assert.equal(aosta.label, "Aosta");
  assert.equal(fussen.label, "Füssen");
});

test("road modes map to supported routing profiles", () => {
  assert.equal(osrmProfile("driving"), "driving");
  assert.equal(osrmProfile("cycling"), "cycling");
  assert.equal(osrmProfile("e_bike"), "cycling");
  assert.equal(osrmProfile("walking"), "walking");
});
