import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("map keeps small groups as pins and removes legacy marker titles", () => {
  const source = read("app/components/DestinationMap.tsx");
  assert.match(source, /cluster\.destinations\.length <= 5/);
  assert.match(source, /zoom >= 12 \? 0/);
  assert.match(source, /iconSize: \[30, 36\]/);
  assert.doesNotMatch(source, /bindTooltip/);
  assert.match(source, /className = "crowd-veil"/);
});

test("map logo SVGs are self-contained and cannot disappear behind blocked image references", () => {
  const source = read("app/components/DestinationMap.tsx");
  for (const color of ["green", "orange", "red"]) {
    const logo = read(`public/assets/gemgo-logo-${color}.svg`);
    assert.match(logo, /href="data:image\/png;base64,/);
    assert.doesNotMatch(logo, /href="gemgo-logo\.png"/);
    assert.match(source, new RegExp(`gemgo-logo-${color}\\.svg\\?v=2`));
  }
});

test("pin shell keeps a visible fallback and centers its logo", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.gemgo-marker::before/);
  assert.match(css, /\.gemgo-marker::after/);
  assert.match(css, /\.gemgo-marker img[\s\S]*left: 50%/);
  assert.match(css, /\.gemgo-marker img[\s\S]*translateX\(-50%\)/);
});

test("map recovers its layout after returning from another SPA page", () => {
  const source = read("app/components/DestinationMap.tsx");
  assert.match(source, /new ResizeObserver/);
  assert.match(source, /map\.invalidateSize/);
  assert.match(source, /size\.width === 0 \|\| size\.height === 0/);
});

test("shared UI geometry keeps controls and cards aligned", () => {
  const page = read("app/page.tsx");
  const css = read("app/globals.css");
  assert.match(page, /gemgo-logo-green\.svg\?v=2/);
  assert.match(page, /aria-label="Open app settings"/);
  assert.match(css, /\.quick-settings \{[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(
    css,
    /\.xp-pill,[\s\S]*\.header-actions \.outline-button[\s\S]*white-space: nowrap/,
  );
  assert.match(
    css,
    /\.destination-card \.destination-actions button:first-child[\s\S]*background: var\(--forest\)/,
  );
  assert.match(css, /\.map-credit \{[\s\S]*left: 8px/);
  assert.match(css, /\.settings-backdrop \{[\s\S]*align-items: center/);
});

test("public destination data contains no private team fields", () => {
  const data = JSON.parse(read("app/data/destinations.json"));
  assert.equal(data.meta.schema, "public_demo_v1");
  assert.equal(data.destinations.length, 50);
  for (const place of data.destinations) {
    assert.deepEqual(Object.keys(place).sort(), [
      "country",
      "destination_type",
      "id",
      "latitude",
      "longitude",
      "name",
      "region",
    ]);
  }
});

test("public docs do not expose the private backlog", () => {
  const workflow = read("docs/TODO_WORKFLOW.md");
  assert.doesNotMatch(workflow, /docs\.google|drive\.google|shared Google Doc/i);
});
