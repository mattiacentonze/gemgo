import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the application route uses the integrated product shell", async () => {
  const route = await source("app/app/page.tsx");
  const layout = await source("app/app/layout.tsx");
  const routeLayout = await source("app/components/AppRouteLayout.tsx");
  assert.match(layout, /AppRouteLayout/);
  assert.match(routeLayout, /IntegratedAppShell/);
  assert.match(routeLayout, /UiSoundController/);
  assert.match(routeLayout, /AppUtilityHeader/);
  assert.match(route, /return null/);
  assert.doesNotMatch(route, /export \{ default \} from "\.\.\/page"/);
});

test("the catalogue combines 50 official places with 16 Bavarian Alpify additions", async () => {
  const data = JSON.parse(await source("app/data/destinations.json"));
  const alpify = JSON.parse(await source("app/data/alpify-locations.json"));
  const adapter = await source("app/product/catalogue.ts");
  assert.equal(data.meta.total_entries, 50);
  assert.equal(data.destinations.length, 50);
  assert.equal(alpify.length, 18);
  assert(alpify.some((location) => location.id === "partnachklamm"));
  assert.match(adapter, /destinationData/);
  assert.match(adapter, /alpifyData/);
  assert.match(adapter, /mergeAlpineCatalogues/);
  assert.match(adapter, /partnachklamm: "partnachklamm shoulder trails"/);
  assert.match(adapter, /excludedAlpifyIds = new Set\(\["ruin-ehrenberg"\]\)/);
  assert.match(adapter, /alpifyExcludedEntries/);
  assert.match(adapter, /alpifyAddedEntries/);
  assert.match(adapter, /pilotRegions = \["Bavaria", "Valle d’Aosta"\]/);
  assert.match(adapter, /allExperiences/);
});

test("natural language feeds editable preferences and distinct ranking roles", async () => {
  const engine = await source("app/product/recommendation-engine.ts");
  assert.match(engine, /parsePrompt/);
  assert.match(engine, /applyPromptToPreferences/);
  assert.match(engine, /Best match/);
  assert.match(engine, /Quietest choice/);
  assert.match(engine, /Most local impact/);
  assert.match(engine, /needs\.every/);
  assert.match(engine, /precipitationProbability/);
});

test("the new map switches between standard and softened relief layers", async () => {
  const map = await source("app/components/ExperienceMap.tsx");
  const overview = await source("app/components/AlpineOverview.tsx");
  assert.match(map, /tile\.openstreetmap\.org/);
  assert.match(map, /World_Imagery/);
  assert.match(map, /tileLayerRef/);
  assert.match(map, /mapStyle === "standard"/);
  assert.match(map, /ALPINE_BOUNDS/);
  assert.match(map, /ALPINE_PAN_BOUNDS/);
  assert.match(map, /maxBoundsViscosity/);
  assert.doesNotMatch(map, /attribution:[^\n]+\n\s+bounds: ALPINE_BOUNDS/);
  assert.match(map, /experience-map-style-trigger/);
  assert.doesNotMatch(map, /<span><Layers3/);
  assert.match(map, /wheelPxPerZoomLevel: 140/);
  assert.doesNotMatch(map, /group\.items\.length > 2/);
  assert.match(map, /group\.items\.length > 1/);
  assert.match(map, /counts\[experience\.crowd\] \+= 1/);
  assert.match(map, /gemgo-map-cluster is-\$\{majority\}/);
  assert.match(map, /cluster\.on\("click"/);
  assert.match(map, /map\.fitBounds\(bounds/);
  assert.match(map, /experienceMarkersRef/);
  assert.match(map, /experiences\.forEach\(\(experience\)/);
  assert.match(map, /mapReady/);
  assert.match(await source("app/components/IntegratedAppShell.tsx"), /experiences=\{catalogueExperiences\}/);
  assert.match(overview, /ExperienceMap/);
  assert.doesNotMatch(overview, /alpine-ridge/);
});

test("results map mirrors visible recommendations and keeps active trip stops", async () => {
  const shell = await source("app/components/IntegratedAppShell.tsx");
  const map = await source("app/components/ExperienceMap.tsx");
  const css = await source("app/styles/mvp-final.css");
  assert.match(shell, /visibleResultExperiences/);
  assert.match(shell, /resultMapExperiences/);
  assert.match(shell, /experiences=\{resultMapExperiences\}/);
  assert.match(shell, /tripExperienceIds=\{activeExperienceIds\}/);
  assert.match(shell, /disableClustering/);
  assert.match(map, /gemgo-trip-pin-badge/);
  assert.match(shell, /createPortal\([\s\S]*floating-open-trip/);
  assert.match(css, /\.floating-open-trip[\s\S]*position: fixed/);
  assert.match(css, /left: 50%/);
});

test("device notifications use browser permission and the service worker", async () => {
  const notificationStore = await source("app/product/notifications.ts");
  const page = await source("app/app/notifications/page.tsx");
  const worker = await source("public/sw.js");
  assert.match(notificationStore, /Notification\.requestPermission/);
  assert.match(notificationStore, /registration\.showNotification/);
  assert.match(notificationStore, /showDeviceNotification\(notification\)/);
  assert.match(page, /requestDeviceNotifications/);
  assert.match(notificationStore, /\/app\/notifications/);
  assert.match(worker, /\/app\/notifications/);
  assert.match(worker, /notificationclick/);
  assert.match(worker, /event\.notification\.data\?\.href/);
  assert.match(worker, /addEventListener\("push"/);
});

test("the homepage uses real Alpine cartography with a geographic animated route", async () => {
  const hero = await source("app/components/HeroAlpineMap.tsx");
  const home = await source("app/page.tsx");
  const css = await source("app/styles/landing-v2.css");
  const strip = await source("app/components/LandingImpactStrip.tsx");
  assert.match(hero, /import\("leaflet"\)/);
  assert.match(hero, /tile\.opentopomap\.org/);
  assert.match(hero, /quadraticRoute/);
  assert.match(hero, /hero-route-line/);
  assert.match(hero, /clientHeight \?\? 0\) \* 0\.05/);
  assert.match(hero, /cardClearance \+ topCropOffset/);
  assert.match(hero, /Illustrative crowd scenario · not live data/);
  assert.doesNotMatch(hero, /alpine-redistribution-map\.png|<img|<svg|alpineMassPath/);
  assert.match(css, /mask-image:/);
  assert.match(css, /\.landing-hero-question \{ white-space: nowrap; \}/);
  assert.match(css, /\.hero-route-line[\s\S]*stroke-dasharray:[\s\S]*animation: hero-route-flow/);
  assert.match(home, /className="landing-hero-question"/);
  assert.match(home, /<HeroComparison locale=\{locale\} \/>/);
  assert.match(home, /<HeroAlpineMap locale=\{locale\} \/>/);
  assert.match(home, /<LandingImpactStrip locale=\{locale\} \/>/);
  assert.match(strip, /landing-impact-strip/);
});

test("the About story connects the founding anecdote to overtourism and the response", async () => {
  const about = await source("app/about/page.tsx");
  assert.match(about, /Neuschwanstein/);
  assert.match(about, /environmental and social pressure/);
  assert.match(about, /Redirect a choice, without restricting a journey/);
  assert.match(about, /EUSALP-Pilotregionen|EUSALP pilot regions/);
});

test("legacy product paths redirect to the integrated app instead of duplicating the landing page", async () => {
  const redirects = {
    saved: /\/app\/my-trip\/saved/,
    gemdrop: /\/app\/my-trip\?gemdrop=1/,
    points: /\/app\/gempoints/,
    gemdeals: /\/app\/gempoints/,
  };
  for (const [route, target] of Object.entries(redirects)) {
    const page = await source(`app/${route}/page.tsx`);
    assert.match(page, /redirect\(/);
    assert.match(page, target);
    assert.doesNotMatch(page, /export \{ default \} from "\.\.\/page"/);
  }
});

test("SPA sections expose stable, reloadable paths", async () => {
  const shell = await source("app/components/IntegratedAppShell.tsx");
  for (const path of [
    "/app/explore",
    "/app/results",
    "/app/my-trip",
    "/app/my-trip/saved",
    "/app/gempoints",
  ]) {
    assert.match(shell, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.match(shell, /\/app\/experience\/\$\{encodeURIComponent\(experienceId\)\}/);
  assert.match(shell, /addEventListener\("popstate"/);
});

test("My Trip persists multiple plans and GemPoints use an event ledger", async () => {
  const storage = await source("app/product/storage.ts");
  const shell = await source("app/components/IntegratedAppShell.tsx");
  assert.match(storage, /gemgo-trips-v3/);
  assert.match(storage, /GemPointEvent/);
  assert.match(storage, /appendPointEvent/);
  assert.match(shell, /duplicateTrip/);
  assert.match(shell, /renameTrip/);
  assert.match(shell, /automaticOffline/);
  assert.doesNotMatch(shell, /Save essentials offline/);
  assert.doesNotMatch(shell, /GemXP/);
  assert.doesNotMatch(shell, /GemCredits/);
  assert.match(shell, /header-points-link/);
  assert.match(shell, /notification-page-link/);
  assert.match(shell, /balance\.toLocaleString\(locale\)/);
});

test("visit verification supports GPS, partner codes and an explicitly labelled demo path", async () => {
  const shell = await source("app/components/IntegratedAppShell.tsx");
  assert.match(shell, /navigator\.geolocation/);
  assert.match(shell, /distance <= 2/);
  assert.match(shell, /Partner QR code/);
  assert.match(shell, /demo verification/);
  assert.match(shell, /status: "demo" \| "verified"/);
});

test("the redesigned interface exposes all five required locales", async () => {
  const shell = await source("app/components/IntegratedAppShell.tsx");
  const marketing = await source("app/i18n/marketing.ts");
  const localeHook = await source("app/hooks/usePersistentLocale.ts");
  for (const locale of ["en", "it", "de", "fr", "sl"]) {
    assert.match(shell, new RegExp(`\\b${locale}: \\{`));
    assert.match(marketing, new RegExp(`\\b${locale}: \\{`));
  }
  assert.match(localeHook, /gemgo-locale-v3/);
  assert.match(shell, /usePersistentLocale/);
});

test("homepage language, regional map controls and result-card hierarchy are interactive", async () => {
  const home = await source("app/page.tsx");
  const header = await source("app/components/MarketingHeader.tsx");
  const overview = await source("app/components/AlpineOverview.tsx");
  const card = await source("app/components/IntegratedResultCard.tsx");
  const photo = await source("app/components/DestinationPhoto.tsx");
  assert.match(home, /usePersistentLocale/);
  assert.match(header, /marketing-language-popover/);
  assert.match(header, /marketing-mobile-menu/);
  assert.match(header, /\["\/#how", copy\.navigation\.how\]/);
  assert.match(header, /\["\/about", copy\.navigation\.about\]/);
  assert.match(header, /\["\/privacy", copy\.footer\.privacy\]/);
  assert.match(header, /marketing-profile-link[\s\S]*marketing-try-button[\s\S]*marketing-menu-trigger/);
  assert.match(header, /marketing-mobile-menu[\s\S]*copy\.navigation\.openApp/);
  assert.doesNotMatch(header, /Try the app now/i);
  assert.match(overview, /aria-pressed/);
  assert.match(overview, /setLocalRegion/);
  assert.match(card, /recommendation-reasons/);
  assert.match(card, /result-metrics/);
  assert.doesNotMatch(card, /rank-label/);
  assert.doesNotMatch(photo, /<figcaption>/);
});
