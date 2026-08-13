import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("real GemGo wordmark is visible in the shared brand shell", () => {
  const css = read("app/styles/polish.css");
  const logo = readFileSync(new URL("../public/assets/gemgo-logo-green.svg", import.meta.url));
  assert(logo.byteLength > 100);
  assert.match(css, /url\("\/assets\/gemgo-logo-green\.svg\?v=2"\)/);
  assert.match(css, /\.brand \.brand-mark svg[\s\S]*display: none/);
  assert.match(css, /\.brand-compact \.brand-mark/);
});

test("map uses the branded crowd-level marker assets", () => {
  const map = read("app/components/ExperienceMap.tsx");
  for (const colour of ["green", "orange", "red"]) {
    assert.match(map, new RegExp(`gemgo-logo-${colour}\\.svg\\?v=2`));
  }
  assert.doesNotMatch(map, /group\.items\.length > 2/);
  assert.match(map, /experienceMarkersRef/);
  assert.match(map, /marker\.openPopup\(\)/);
  assert.match(map, /wheelPxPerZoomLevel: 140/);
  assert.match(map, /gemgo-map-popup/);
});

test("notification bell opens device-local history rather than being decorative", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  const notifications = read("app/app/notifications/page.tsx");
  const css = read("app/styles/info-pages.css");
  assert.match(shell, /href="\/app\/notifications"/);
  assert.match(shell, /<Bell/);
  assert.match(notifications, /gemgo-points-ledger-v3/);
  assert.match(notifications, /gemgo-active-trip-v3/);
  assert.match(notifications, /gemgo-reward-unlocks-v1/);
  assert.doesNotMatch(notifications, /MutationObserver|createPortal/);
  assert.match(css, /notification-history-page/);
});

test("mobile results provide an explicit list and map switch", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  const css = read("app/styles/mobile-results.css");
  assert.match(shell, /resultsView/);
  assert.match(shell, /mobile-results-map-mode/);
  assert.match(shell, /aria-pressed=\{resultsView === "list"\}/);
  assert.match(shell, /aria-pressed=\{resultsView === "map"\}/);
  assert.match(css, /\.integrated-app\.mobile-results-map-mode \.results-map-panel/);
  assert.match(css, /\.integrated-app\.mobile-results-map-mode \.result-cards/);
});

test("privacy controls export account and GemGo device data without clearing the origin", () => {
  const page = read("app/privacy/page.tsx");
  const exportRoute = read("app/api/account/export/route.ts");
  const migration = read("supabase/migrations/20260813083427_admin_content_privacy_workflows.sql");
  assert.match(page, /key\?\.startsWith\("gemgo"\)/);
  assert.match(page, /new Blob/);
  assert.match(page, /gemgo-data-export\.json/);
  assert.match(page, /fetch\("\/api\/account\/export"/);
  assert.match(exportRoute, /supabase\.auth\.getUser/);
  assert.match(exportRoute, /export_my_account_data/);
  assert.match(migration, /savedTrips/);
  assert.match(migration, /gemPointEvents/);
  assert.match(migration, /suggestions/);
  assert.match(page, /localStorage\.removeItem\(key\)/);
  assert.match(page, /sessionStorage\.removeItem\(key\)/);
  assert.doesNotMatch(page, /localStorage\.clear\(/);
  assert.match(page, /Supabase \(EU West\)/);
  assert.match(page, /controller identity and privacy contact still have to be confirmed/);
});

test("destination photos are relevant licensed multi-image galleries", () => {
  const photo = read("app/components/DestinationPhoto.tsx");
  const media = read("app/lib/commons-media.ts");
  const css = read("app/styles/photo-polish.css");
  assert.match(photo, /useState<Media\[]>\(\[\]\)/);
  assert.match(photo, /allowedLicense/);
  assert.match(photo, /rejectedTitle/);
  assert.match(photo, /relevanceScore/);
  assert.match(photo, /slice\(0, compact \? 3 : 5\)/);
  assert.match(photo, /Previous photo of/);
  assert.match(photo, /Next photo of/);
  assert.match(photo, /gallery-dots/);
  assert.match(photo, /src="\/assets\/gemgo-logo\.png"/);
  assert.match(photo, /onError=\{handleImageError\}/);
  assert.match(media, /iiprop: "url\|size\|extmetadata"/);
  assert.match(media, /Fénis Castle Valle d'Aosta/);
  assert.match(css, /destination-gallery-enter/);
  assert.match(css, /gallery-arrow-previous/);
});

test("GemDrop shows galleries for the original and proposed alternative", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  const css = read("app/styles/gemdrop-gallery.css");
  assert.match(shell, /gemdrop-option original-option/);
  assert.match(shell, /gemdrop-option alternative-option/);
  assert.match(shell, /<DestinationPhoto/);
  assert.doesNotMatch(shell, /GemDropPhotoEnhancer|observer\.observe\(document\.body/);
  assert.match(css, /gemdrop-destination-gallery/);
  assert.match(css, /alternative-option/);
});

test("optional sounds are opt-in and controlled from the local profile", () => {
  const page = read("app/components/AppRouteLayout.tsx");
  const sound = read("app/components/UiSoundController.tsx");
  const profile = read("app/app/profile/page.tsx");
  assert.match(page, /<UiSoundController \/>/);
  assert.match(sound, /const SOUND_KEY = "gemgo-sound"/);
  assert.match(sound, /window\.localStorage\.getItem\(SOUND_KEY\) === "on"/);
  assert.match(sound, /AudioContext/);
  assert.match(profile, /Volume2/);
  assert.match(profile, /VolumeX/);
  assert.match(profile, /gemgo:sound-setting/);
  assert.match(sound, /prefers-reduced-motion|optional enhancement|Sound is an optional enhancement/);
});

test("motion is restrained and respects reduced-motion preferences", () => {
  const layout = read("app/layout.tsx");
  const css = read("app/styles/motion-and-spacing.css");
  assert.doesNotMatch(layout, /MotionEnhancer/);
  assert.match(css, /motion-item\.is-revealed/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /detail-metric-strip[\s\S]*repeat\(2/);
});

test("trip planning starts only from official Alpine pilot locations", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  assert.match(shell, /originExperienceId/);
  assert.match(shell, /<select/);
  assert.match(shell, /catalogueExperiences\s*\.filter/);
  assert.match(shell, /official Alpine pilot locations/);
  assert.doesNotMatch(shell, /nominatim\.openstreetmap\.org\/reverse/);
});

test("verified visits can collect device-local recommendation feedback", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  const feedback = read("app/components/VisitFeedback.tsx");
  const css = read("app/styles/visit-feedback.css");
  assert.match(shell, /<VisitFeedback/);
  assert.match(feedback, /gemgo-visit-feedback-v1/);
  assert.match(feedback, /trip\?\.trip\.verified/);
  assert.match(feedback, /Was this alternative worth the change\?/);
  assert.match(feedback, /What could have been better\?/);
  assert.match(feedback, /maxLength=\{500\}/);
  assert.doesNotMatch(feedback, /MutationObserver|createPortal/);
  assert.match(css, /visit-rating-options/);
});
