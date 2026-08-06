import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("real GemGo wordmark is visible in the shared brand shell", () => {
  const css = read("app/styles/polish.css");
  const logo = readFileSync(new URL("../public/assets/gemgo-logo.png", import.meta.url));
  assert(logo.byteLength > 1000);
  assert.match(css, /url\("\/assets\/gemgo-logo\.png"\)/);
  assert.match(css, /\.brand \.brand-mark svg[\s\S]*display: none/);
  assert.match(css, /\.brand-compact \.brand-mark/);
});

test("map uses the branded crowd-level marker assets", () => {
  const map = read("app/components/ExperienceMap.tsx");
  for (const colour of ["green", "orange", "red"]) {
    assert.match(map, new RegExp(`gemgo-logo-${colour}\\.svg\\?v=2`));
  }
  assert.match(map, /group\.items\.length > 2/);
  assert.match(map, /wheelPxPerZoomLevel: 140/);
  assert.match(map, /gemgo-map-popup/);
});

test("notification bell opens device-local history rather than being decorative", () => {
  const page = read("app/app/page.tsx");
  const center = read("app/components/NotificationCenter.tsx");
  const css = read("app/styles/polish.css");
  assert.match(page, /<NotificationCenter \/>/);
  assert.match(center, /gemgo-points-ledger-v3/);
  assert.match(center, /gemgo-active-trip-v3/);
  assert.match(center, /gemgo-reward-unlocks-v1/);
  assert.match(center, /createPortal/);
  assert.match(center, /aria-expanded=\{open\}/);
  assert.match(css, /notification-popover/);
});
