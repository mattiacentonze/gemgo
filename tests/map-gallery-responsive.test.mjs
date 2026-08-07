import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("maps expose loading state and an honest branded crowd legend", () => {
  const map = read("app/components/ExperienceMap.tsx");
  const css = read("app/styles/map-ui.css");
  assert.match(map, /msg\(locale, "map\.destinationMap"\)/);
  assert.match(map, /msg\(locale, "plan\.crowdPredicted"\)/);
  assert.match(map, /msg\(locale, "map\.legendLow"\)/);
  assert.match(map, /msg\(locale, "map\.legendModerate"\)/);
  assert.match(map, /msg\(locale, "map\.legendBusy"\)/);
  assert.match(css, /experience-map-loading/);
  assert.match(css, /experience-map-legend/);
});

test("photo galleries support arrows keyboard and touch swipe", () => {
  const gallery = read("app/components/DestinationPhoto.tsx");
  const css = read("app/styles/gallery-accessibility.css");
  assert.match(gallery, /touchStartRef/);
  assert.match(gallery, /onTouchStart=\{handleTouchStart\}/);
  assert.match(gallery, /onTouchEnd=\{handleTouchEnd\}/);
  assert.match(gallery, /event\.key === "ArrowLeft"/);
  assert.match(gallery, /event\.key === "ArrowRight"/);
  assert.match(gallery, /Math\.abs\(start - end\) < 44/);
  assert.match(css, /touch-action: pan-y pinch-zoom/);
  assert.match(css, /focus-visible/);
});

test("small screens keep quantitative cards compact but narrative cards readable", () => {
  const css = read("app/styles/mobile-density.css");
  assert.match(css, /\.impact-grid,[\s\S]*\.dashboard-metrics[\s\S]*repeat\(2/);
  assert.match(css, /max-width: 350px/);
  assert.match(css, /\.methodology-grid,[\s\S]*grid-template-columns: 1fr/);
});

test("the Alpine overview uses one compact legend and leaves zoom controls clear", () => {
  const overview = read("app/components/AlpineOverview.tsx");
  const map = read("app/components/ExperienceMap.tsx");
  const css = read("app/styles/visual-fixes.css");
  assert.match(overview, /showLegend=\{false\}/);
  assert.doesNotMatch(overview, /Real coordinates/);
  assert.match(map, /showLegend = true/);
  assert.match(css, /\.experience-map-legend[\s\S]*width: max-content/);
  assert.match(css, /\.leaflet-control-zoom/);
});

test("map markers have one circular GemGo shape with a downward tip", () => {
  const map = read("app/components/ExperienceMap.tsx");
  const css = read("app/styles/visual-fixes.css");
  assert.doesNotMatch(map, /<i><\/i>/);
  assert.match(css, /\.gemgo-map-marker[\s\S]*border-radius: 50%/);
  assert.match(css, /\.gemgo-map-marker::after[\s\S]*clip-path: polygon\(0 0, 100% 0, 50% 100%\)/);
  assert.match(css, /\.gemgo-map-marker img[\s\S]*transform: none/);
});
