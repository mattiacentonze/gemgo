import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("modals cover mobile navigation and provide keyboard focus handling", () => {
  const page = read("app/app/page.tsx");
  const enhancer = read("app/components/ModalExperienceEnhancer.tsx");
  const css = read("app/styles/modal-polish.css");
  assert.match(page, /<ModalExperienceEnhancer \/>/);
  assert.match(enhancer, /event\.key === "Escape"/);
  assert.match(enhancer, /event\.key !== "Tab"/);
  assert.match(enhancer, /previousFocus\?\.focus/);
  assert.match(enhancer, /modal-backdrop/);
  assert.match(css, /\.modal-backdrop[\s\S]*z-index: 1000/);
  assert.match(css, /html\.has-open-modal/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("flagship experiences use reviewed Commons file sets", () => {
  const media = read("app/lib/commons-media.ts");
  const expected = [
    "Valpelline 001.JPG",
    "Weißensee (Füssen).jpg",
    "Stadtplatz Hall in Tirol.jpg",
    "Mostnica Gorge.jpg",
    "Engadinerhaus und hölzener Brunnen in Guarda.jpg",
    "Gresse en Vercors - Hiver.jpg",
  ];
  expected.forEach((filename) => assert(media.includes(filename), `Missing curated media file: ${filename}`));
  assert.match(media, /iiprop: "url\|size\|extmetadata"/);
});

test("post-visit feedback contributes only to a device-local dashboard metric", () => {
  const page = read("app/app/page.tsx");
  const metric = read("app/components/FeedbackImpactMetric.tsx");
  const css = read("app/styles/feedback-impact.css");
  assert.match(page, /<FeedbackImpactMetric \/>/);
  assert.match(metric, /gemgo-visit-feedback-v1/);
  assert.match(metric, /Alternative satisfaction/);
  assert.match(metric, /device-local response/);
  assert.match(metric, /snapshotRef/);
  assert.match(metric, /Math\.round\(\(positive \/ feedback\.length\) \* 100\)/);
  assert.match(css, /feedback-impact-metric/);
});

test("sound lifecycle closes its Web Audio context and uses stable listeners", () => {
  const sound = read("app/components/UiSoundController.tsx");
  assert.match(sound, /useCallback/);
  assert.match(sound, /context\.state !== "closed"/);
  assert.match(sound, /context\.close\(\)/);
  assert.match(sound, /\}, \[play\]\);/);
  assert.match(sound, /enabledRef\.current = storedEnabled/);
});
