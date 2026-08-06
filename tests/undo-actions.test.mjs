import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("trip deletion and GemDrop switching expose a local Undo action", () => {
  const page = read("app/app/page.tsx");
  const controller = read("app/components/UndoActionController.tsx");
  const css = read("app/styles/toast-undo.css");
  assert.match(page, /<UndoActionController \/>/);
  assert.match(controller, /gemgo-trips-v3/);
  assert.match(controller, /gemgo-active-trip-v3/);
  assert.match(controller, /switch my trip/i);
  assert.match(controller, /Trip deleted\|Trip switched/);
  assert.match(controller, /window\.localStorage\.setItem/);
  assert.match(controller, /window\.location\.reload\(\)/);
  assert.match(controller, /<Undo2 size=\{16\} \/>/);
  assert.match(css, /toast-undo-button/);
});
