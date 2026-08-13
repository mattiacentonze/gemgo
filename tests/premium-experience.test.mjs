import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("modals cover mobile navigation and provide keyboard focus handling", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  const css = read("app/styles/modal-polish.css");
  assert.match(shell, /const useModalA11y/);
  assert.match(shell, /event\.key === "Escape"/);
  assert.match(shell, /event\.key !== "Tab"/);
  assert.match(shell, /previous\?\.focus/);
  assert.match(shell, /modal-backdrop/);
  assert.doesNotMatch(shell, /ModalExperienceEnhancer|observer\.observe\(document\.body/);
  assert.match(css, /\.modal-backdrop[\s\S]*z-index: 1000/);
  assert.match(css, /html\.has-open-modal/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("flagship experiences use reviewed Commons file sets", () => {
  const media = read("app/lib/commons-media.ts");
  const expected = [
    "Torgnon.JPG",
    "Châtillon vista dal castello di Ussel..JPG",
    "02E1680001-MIBAC Castel Savoia a Gressoney-Saint-Jean.jpg",
    "Piccolo S Bernardo.jpg",
    "Fénis Castle.jpg",
  ];
  expected.forEach((filename) => assert(media.includes(filename), `Missing curated media file: ${filename}`));
  assert.match(media, /iiprop: "url\|size\|extmetadata"/);
});

test("post-visit feedback stays direct and device-local", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  const feedback = read("app/components/VisitFeedback.tsx");
  assert.match(shell, /<VisitFeedback/);
  assert.match(feedback, /gemgo-visit-feedback-v1/);
  assert.match(feedback, /window\.localStorage\.setItem/);
  assert.match(feedback, /stays on this device/);
  assert.doesNotMatch(feedback, /MutationObserver|createPortal/);
});

test("sound lifecycle closes its Web Audio context and uses stable listeners", () => {
  const sound = read("app/components/UiSoundController.tsx");
  assert.match(sound, /useCallback/);
  assert.match(sound, /context\.state !== "closed"/);
  assert.match(sound, /context\.close\(\)/);
  assert.match(sound, /\}, \[play\]\);/);
  assert.match(sound, /enabledRef\.current = storedEnabled/);
});
