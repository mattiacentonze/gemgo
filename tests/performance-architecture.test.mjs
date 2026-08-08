import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the app route mounts a minimal shell without global DOM enhancer scans", () => {
  const route = read("app/app/page.tsx");
  const appLayout = read("app/app/layout.tsx");
  const routeLayout = read("app/components/AppRouteLayout.tsx");
  const layout = read("app/layout.tsx");
  assert.match(appLayout, /<AppRouteLayout>/);
  assert.match(routeLayout, /<IntegratedAppShell \/>/);
  assert.match(routeLayout, /<UiSoundController \/>/);
  assert.match(route, /return null/);
  for (const enhancer of [
    "CurrentLocationControl",
    "FeedbackImpactMetric",
    "GemDropPhotoEnhancer",
    "LiquidAppNavigation",
    "MobileResultsMode",
    "ModalExperienceEnhancer",
    "MultiDayTripPlanner",
    "NotificationCenter",
    "PrivacyControls",
    "UndoActionController",
    "VisitFeedback",
  ]) {
    assert.doesNotMatch(routeLayout, new RegExp(enhancer));
  }
  assert.doesNotMatch(layout, /MotionEnhancer/);
});

test("loaded interactive components never observe the entire document body", () => {
  for (const path of [
    "app/components/IntegratedAppShell.tsx",
    "app/components/ExperienceMap.tsx",
    "app/components/MultiDayTripPlanner.tsx",
    "app/components/VisitFeedback.tsx",
    "app/components/UiSoundController.tsx",
  ]) {
    const component = read(path);
    assert.doesNotMatch(
      component,
      /observe\(document\.body/,
      `${path} must not scan all body mutations`,
    );
  }
});

test("typing stays draft-only and the removed multi-day planner stays out of the shell", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  assert.match(shell, /const \[promptDraft, setPromptDraft\]/);
  assert.match(shell, /value=\{promptDraft\}/);
  assert.match(shell, /applyPromptToPreferences\(promptDraft/);
  assert.doesNotMatch(shell, /MultiDayTripPlanner/);
  assert.match(shell, /dynamic\(\(\) => import\("\.\/ExperienceMap"\)/);
});

test("disabled routing cannot create an infinite state-reset render loop", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  const live = read("app/product/live-context.ts");
  assert.match(shell, /const EMPTY_EXPERIENCES: Experience\[\] = \[\]/);
  assert.match(shell, /stage === "brief"[\s\S]*EMPTY_EXPERIENCES/);
  assert.doesNotMatch(shell, /stage === "brief" \? \[\] : roadCandidates/);
  assert.match(live, /Object\.keys\(current\)\.length === 0 \? current : \{\}/);
  assert.match(live, /current\.length === 0 \? current : \[\]/);
  assert.match(live, /experiences\.slice\(0, 3\)/);
});

test("service worker registration waits for idle time and does not precache every route", () => {
  const layout = read("app/layout.tsx");
  const worker = read("public/sw.js");
  assert.match(layout, /requestIdleCallback/);
  assert.match(layout, /process\.env\.NODE_ENV === "production"/);
  assert.doesNotMatch(worker, /^\s*"\/app",/m);
  assert.match(worker, /event\.request\.mode === "navigate"/);
});

test("map keeps one base layer and assigns semantic styles to each travel mode", () => {
  const map = read("app/components/ExperienceMap.tsx");
  assert.match(map, /tileLayerRef\.current\?\.removeFrom\(map\)/);
  assert.match(map, /walking: \{ color: "#3178c6", dashArray: "3 8" \}/);
  assert.match(map, /bicycle: \{ color: "#2f9e62" \}/);
  assert.match(map, /public: \{ color: "#ef8f2f", dashArray: "9 8" \}/);
  assert.match(map, /car: \{ color: "#7856a8" \}/);
  assert.match(map, /mixed: \{ color: "#0b9fa5", dashArray: "12 6 3 6" \}/);
  assert.doesNotMatch(map, /map\?\.on\("zoomend moveend"/);
  assert.match(map, /map\.on\("zoomend", onZoomEnd\)/);
  assert.doesNotMatch(map, /map\.on\("moveend"/);
  assert.match(map, /zoomRevision/);
  assert.doesNotMatch(map, /if \(selected\) marker\.openPopup\(\)/);
  assert.match(map, /focusRequestId/);
});

test("Vercel uses the native Next build and preserves the Sites contribution backend", () => {
  const packageJson = JSON.parse(read("package.json"));
  const vercel = JSON.parse(read("vercel.json"));
  const route = read("app/api/gems/route.ts");

  assert.match(packageJson.scripts["build:vercel"], /next build/);
  assert.equal(vercel.framework, "nextjs");
  assert.equal(vercel.buildCommand, "npm run build:vercel");
  assert.equal(vercel.outputDirectory, undefined);
  assert.match(route, /process\.env\.VERCEL/);
  assert.match(route, /gemgo-pan-alpine\.aloneeagle\.chatgpt\.site/);
  assert.match(route, /cache: "no-store"/);
});
