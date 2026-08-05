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
  assert.match(page, /aria-label=\{t\("global\.openSettings"\)\}/);
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

test("all team portraits are authorised local assets", () => {
  const content = read("app/content.ts");
  assert.match(content, /\/assets\/team\/mattia-centonze\.png/);
  assert.match(content, /\/assets\/team\/killian-foloppe\.png/);
  assert.match(content, /\/assets\/team\/martino-dalla-fontana\.png/);
  assert.doesNotMatch(content, /avatars\.githubusercontent|photo:\s*null/);
});

test("saved plans migrate the legacy plan and expose complete local controls", () => {
  const page = read("app/page.tsx");
  const route = read("app/saved/page.tsx");
  assert.match(page, /gemgo-saved-plans/);
  assert.match(page, /gemgo-saved-plan/);
  assert.match(page, /openSavedPlan/);
  assert.match(page, /duplicateSavedPlan/);
  assert.match(page, /deleteSavedPlan/);
  assert.match(page, /renameSavedPlan/);
  assert.match(page, /automaticPlanName/);
  assert.match(page, /customName/);
  assert.match(page, /isLegacyAutomaticPlanName/);
  assert.doesNotMatch(page, /name: defaultName/);
  assert.match(route, /export \{ default \} from "\.\.\/page"/);
});

test("planned destinations stay visible by default and can be filtered explicitly", () => {
  const page = read("app/page.tsx");
  assert.match(page, /plannedDestinationIds/);
  assert.match(page, /hidePlanned/);
  assert.match(page, /already-planned/);
  assert.match(page, /explore\.inPlan/);
});

test("navigation keeps its desktop indicator and cuts a live inward cavity around a separate draggable pin", () => {
  const page = read("app/page.tsx");
  const mobileNav = read("app/components/LiquidMobileNav.tsx");
  const css = read("app/globals.css");
  assert.match(page, /nav-flow-indicator/);
  assert.match(page, /getBoundingClientRect/);
  assert.match(page, /LiquidMobileNav/);
  assert.match(css, /\.nav-flow-indicator/);
  assert.doesNotMatch(mobileNav, /gemgo-logo-green\.svg/);
  assert.match(mobileNav, /setPointerCapture/);
  assert.match(mobileNav, /onPointerMove/);
  assert.match(mobileNav, /aria-current=\{current \? "page"/);
  assert.match(mobileNav, /createSurfacePath/);
  assert.match(mobileNav, /requestAnimationFrame/);
  assert.match(mobileNav, /className="liquid-nav-surface"/);
  assert.match(mobileNav, /className="liquid-nav-body" d=\{surfacePath\}/);
  assert.match(mobileNav, /const PIN_SURFACE_GAP = 5/);
  assert.match(mobileNav, /const cavityTipY = PIN_TIP_Y \+ PIN_SURFACE_GAP/);
  assert.match(mobileNav, /const leftCorner = clamp\(/);
  assert.match(mobileNav, /const rightCorner = clamp\(/);
  assert.doesNotMatch(mobileNav, /position - motion/);
  assert.match(mobileNav, /className="liquid-nav-pin"/);
  assert.match(mobileNav, /className="liquid-nav-pin-icon"/);
  assert.doesNotMatch(mobileNav, /liquid-nav-track|liquid-nav-fluid/);
  assert.match(css, /\.liquid-nav-surface/);
  assert.match(css, /\.liquid-nav-pin path \{[\s\S]*fill: #fff/);
  assert.match(css, /\.liquid-nav-links a\.active \.liquid-nav-icon \{[\s\S]*translateY\(-24px\)/);
  assert.doesNotMatch(css, /\.liquid-nav-track|\.liquid-nav-fluid/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(
    css,
    /\.liquid-mobile-nav \{[\s\S]*position: fixed/,
  );
  assert.match(
    css,
    /@media \(max-width: 820px\)[\s\S]*\.liquid-mobile-nav \{[\s\S]*display: block/,
  );
});

test("language and account prompts are contextual and persisted without flags", () => {
  const page = read("app/page.tsx");
  const domain = read("app/domain.ts");
  const catalogues = read("app/i18n/catalogs.mjs");
  assert.match(domain, /\["en", "it", "de", "fr", "sl"\]/);
  assert.match(catalogues, /Slovenščina · SL/);
  assert.match(page, /Globe2/);
  assert.doesNotMatch(page, /🇬🇧|🇮🇹|🇩🇪|🇫🇷|🇸🇮/);
  assert.match(page, /gemgo-account-prompt-next/);
  assert.match(page, /7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(page, /impressions >= 2/);
  assert.match(catalogues, /Optional account sync is coming soon/);
  assert.match(page, /if \(!storageReady\) return/);
  assert.match(page, /\[locale, storageReady\]/);
});

test("canonical codes and structured history are independent from language", () => {
  const page = read("app/page.tsx");
  const domain = read("app/domain.ts");
  assert.match(domain, /public_transport/);
  assert.match(domain, /quiet/);
  assert.match(page, /reasonType/);
  assert.match(page, /bodyType/);
  assert.doesNotMatch(page, /const interestOptions = \["Lakes"/);
  assert.doesNotMatch(page, /transportLabels/);
});

test("map receives the active locale and translates generated popup HTML", () => {
  const page = read("app/page.tsx");
  const map = read("app/components/DestinationMap.tsx");
  assert.match(page, /locale=\{locale\}/);
  assert.match(map, /map\.directions/);
  assert.match(map, /map\.legendNote/);
  assert.match(map, /data\.description/);
});

test("public routes, privacy controls and PWA shell are complete", () => {
  const page = read("app/page.tsx");
  const catalog = read("app/i18n/catalogs.mjs");
  const worker = read("public/sw.js");
  const manifest = JSON.parse(read("public/manifest.webmanifest"));
  for (const route of ["app", "about", "privacy"]) {
    assert.match(read(`app/${route}/page.tsx`), /export \{ default \}/);
    assert.match(worker, new RegExp(`/${route}`));
  }
  assert.equal(manifest.start_url, "/app");
  assert.match(page, /exportLocalData/);
  assert.match(page, /deleteLocalData/);
  assert.match(page, /gemgo-location-consent/);
  assert.match(catalog, /Registration remains disabled/);
});

test("destination media is licence-filtered and official information stays linked", () => {
  const media = read("app/components/DestinationPhoto.tsx");
  const map = read("app/components/DestinationMap.tsx");
  const page = read("app/page.tsx");
  assert.match(media, /Wikimedia Commons/);
  assert.match(media, /CC BY-SA/);
  assert.match(map, /LicenseShortName/);
  assert.match(page, /officialDestinationUrl/);
  assert.match(page, /explore\.officialInfo/);
});

test("radius, accommodation ranking and multimodal route legs are implemented", () => {
  const page = read("app/page.tsx");
  const map = read("app/components/DestinationMap.tsx");
  const content = read("app/content.ts");
  assert.match(page, /maxDistanceKm/);
  assert.match(page, /\[25, 50, 100, 250\]/);
  assert.match(page, /nearbyAccommodations/);
  assert.match(page, /visibleAccommodations/);
  assert.match(page, /showAccommodations/);
  assert.match(content, /booking\.com/);
  assert.match(map, /accommodationLayerRef/);
  assert.match(map, /accommodation-layer-toggle/);
  assert.match(map, /stay\.bookingUrl/);
  for (const mode of ["walking", "cycling", "e_bike", "driving", "public_transport"]) {
    assert.match(map, new RegExp(`${mode}: \\{ color:`));
  }
  assert.match(map, /L\.polyline/);
  assert.match(map, /route-number/);
  assert.match(page, /plan\.legTransport/);
});

test("planner, GemDrop, offers and community gems cover the new product flows", () => {
  const page = read("app/page.tsx");
  const parser = read("app/lib/prompt-parser.mjs");
  const media = read("app/lib/commons-media.ts");
  const api = read("app/api/gems/route.ts");
  const schema = read("db/schema.ts");
  const migration = read("drizzle/0000_flimsy_killmonger.sql");

  assert.match(parser, /replace\(\/\[’'\]\/g, " "\)/);
  assert.match(page, /inferDestinationRegion/);
  assert.match(page, /validStartDate/);
  assert.match(page, /key=\{`\$\{day\.date\}-\$\{index\}`\}/);
  assert.match(page, /formatDuration\(travelMinutes, locale\)/);
  assert.match(page, /plan\.travelVisitFrom/);
  assert.match(page, /crowd-diversion-banner/);
  assert.match(page, /gemdrop\.startActivity/);
  assert.match(page, /capture="environment"/);
  assert.match(page, /dealCategory/);
  assert.match(page, /visibleDeals/);

  for (const filename of [
    "Torgnon.JPG",
    "Châtillon vista dal castello di Ussel..JPG",
    "Gressoney-St-Jean - été.JPG",
    "Piccolo S Bernardo.jpg",
    "Fénis Castle.jpg",
  ]) {
    assert.match(media, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(api, /reward: 70/);
  assert.match(api, /duplicate_contribution/);
  assert.match(schema, /gemSuggestions/);
  assert.match(migration, /CREATE TABLE `gem_suggestions`/);
});
