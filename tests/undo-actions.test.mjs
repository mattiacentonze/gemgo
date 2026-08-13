import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("trip deletion and GemDrop switching expose a local Undo action", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  const css = read("app/styles/toast-undo.css");
  assert.match(shell, /type UndoSnapshot/);
  assert.match(shell, /setUndoSnapshot\(\{[\s\S]*?savedTrips,[\s\S]*?activeTrip,/);
  assert.match(shell, /Restore trip|Ripristina viaggio/);
  assert.match(shell, /Restore original plan|Ripristina piano originale/);
  assert.match(shell, /const undoLastAction/);
  assert.match(shell, /toast-undo-button/);
  assert.match(shell, /const closeGemDrop/);
  assert.match(shell, /params\.delete\("gemdrop"\)/);
  assert.match(shell, /onClose=\{closeGemDrop\}/);
  assert.doesNotMatch(shell, /window\.location\.reload\(\)/);
  assert.match(css, /toast-undo-button/);
});
