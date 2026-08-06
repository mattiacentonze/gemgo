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

test("mobile results provide an explicit list and map switch", () => {
  const page = read("app/app/page.tsx");
  const switcher = read("app/components/MobileResultsMode.tsx");
  const css = read("app/styles/mobile-results.css");
  assert.match(page, /<MobileResultsMode \/>/);
  assert.match(switcher, /mobile-results-map-mode/);
  assert.match(switcher, /aria-pressed=\{mode === "list"\}/);
  assert.match(switcher, /aria-pressed=\{mode === "map"\}/);
  assert.match(css, /\.integrated-app\.mobile-results-map-mode \.results-map-panel/);
  assert.match(css, /\.integrated-app\.mobile-results-map-mode \.result-cards/);
});

test("privacy controls export and delete only GemGo device data", () => {
  const page = read("app/app/page.tsx");
  const controls = read("app/components/PrivacyControls.tsx");
  const css = read("app/styles/privacy-controls.css");
  assert.match(page, /<PrivacyControls \/>/);
  assert.match(controls, /gemgo-trips-v3/);
  assert.match(controls, /gemgo-points-ledger-v3/);
  assert.match(controls, /gemgo-visit-feedback-v1/);
  assert.match(controls, /gemgo-sound/);
  assert.match(controls, /new Blob/);
  assert.match(controls, /download = `gemgo-local-data-/);
  assert.match(controls, /GEMGO_KEYS\.forEach\(\(key\) => window\.localStorage\.removeItem\(key\)\)/);
  assert.doesNotMatch(controls, /localStorage\.clear\(/);
  assert.match(css, /privacy-delete-confirm/);
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
  assert.match(media, /Mostnica Gorge Stara Fuzina Bohinj/);
  assert.match(css, /destination-gallery-enter/);
  assert.match(css, /gallery-arrow-previous/);
});

test("GemDrop shows galleries for the original and proposed alternative", () => {
  const page = read("app/app/page.tsx");
  const enhancer = read("app/components/GemDropPhotoEnhancer.tsx");
  const css = read("app/styles/gemdrop-gallery.css");
  assert.match(page, /<GemDropPhotoEnhancer \/>/);
  assert.match(enhancer, /gemdrop-panel \.gemdrop-option/);
  assert.match(enhancer, /allExperiences\.find/);
  assert.match(enhancer, /DestinationPhoto/);
  assert.match(css, /gemdrop-destination-gallery/);
  assert.match(css, /alternative-option/);
});

test("optional sounds preserve the main branch preference contract", () => {
  const page = read("app/app/page.tsx");
  const sound = read("app/components/UiSoundController.tsx");
  const css = read("app/styles/sound-control.css");
  assert.match(page, /<UiSoundController \/>/);
  assert.match(sound, /const SOUND_KEY = "gemgo-sound"/);
  assert.match(sound, /window\.localStorage\.getItem\(SOUND_KEY\) !== "off"/);
  assert.match(sound, /AudioContext/);
  assert.match(sound, /Volume2/);
  assert.match(sound, /VolumeX/);
  assert.match(sound, /prefers-reduced-motion|optional enhancement|Sound is an optional enhancement/);
  assert.match(css, /sound-control\[aria-pressed="true"\]/);
});

test("motion is restrained and respects reduced-motion preferences", () => {
  const layout = read("app/layout.tsx");
  const enhancer = read("app/components/MotionEnhancer.tsx");
  const css = read("app/styles/motion-and-spacing.css");
  assert.match(layout, /<MotionEnhancer \/>/);
  assert.match(enhancer, /IntersectionObserver/);
  assert.match(enhancer, /prefers-reduced-motion: reduce/);
  assert.match(enhancer, /MutationObserver/);
  assert.match(css, /motion-item\.is-revealed/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /detail-metric-strip[\s\S]*repeat\(2/);
});

test("current location remains an explicit user action", () => {
  const page = read("app/app/page.tsx");
  const control = read("app/components/CurrentLocationControl.tsx");
  const css = read("app/styles/location-control.css");
  assert.match(page, /<CurrentLocationControl \/>/);
  assert.match(control, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(control, /Use my location/);
  assert.match(control, /nominatim\.openstreetmap\.org\/reverse/);
  assert.match(control, /dispatchEvent\(new Event\("input", \{ bubbles: true \}\)\)/);
  assert.match(control, /maximumAge: 300000/);
  assert.match(css, /current-location-control/);
});

test("verified visits can collect device-local recommendation feedback", () => {
  const page = read("app/app/page.tsx");
  const feedback = read("app/components/VisitFeedback.tsx");
  const css = read("app/styles/visit-feedback.css");
  assert.match(page, /<VisitFeedback \/>/);
  assert.match(feedback, /gemgo-visit-feedback-v1/);
  assert.match(feedback, /activeTrip\?\.trip\.verified/);
  assert.match(feedback, /Was this alternative worth the change\?/);
  assert.match(feedback, /What could have been better\?/);
  assert.match(feedback, /maxLength=\{500\}/);
  assert.match(feedback, /lastSnapshotRef/);
  assert.match(css, /visit-rating-options/);
});
