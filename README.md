# GemGo

GemGo is a mobile-first pan-Alpine recommendation and visitor-flow redistribution product. It helps a traveller turn an intended crowded plan into a comparable, personalised and locally useful alternative, then makes the trip executable, verifies the visit, awards one clear reward currency and exposes privacy-preserving impact for Alpine territories.

Production deployments:

- [gemgo.vercel.app](https://gemgo.vercel.app) — native Next.js build from GitHub;
- [gemgo-pan-alpine.aloneeagle.chatgpt.site](https://gemgo-pan-alpine.aloneeagle.chatgpt.site) — OpenAI Sites/Vinext build.

`main` is the canonical source branch for development and production. Both deployments must be released from the same reviewed `main` source state.

## Product model

GemGo follows one measurable cycle:

**Predict → Recommend → Redirect → Verify → Reward → Measure**

The tourist interface is focused on four destinations:

- **Explore** — multilingual natural-language briefing plus explicit location, mobility, time, interests, difficulty and accessibility controls;
- **My Trip** — active and saved trips, an executable timeline, routed map, offline essentials and contextual GemDrop changes;
- **GemPoints** — one event ledger, local reward codes and measurable personal impact;
- **About** — mission, methodology, privacy and the institutional dashboard.

GemDrop is not a standalone menu page. It is a contextual intervention shown when changed crowd, weather or access conditions make a comparable alternative useful.

## Current capabilities

- real OpenStreetMap/Leaflet maps on the homepage, results, experience detail and My Trip;
- gentler mouse-wheel zoom and clustering when more than two nearby markers overlap;
- the existing 50-place public pilot catalogue plus 16 deduplicated Bavarian Alpify entries, for 66 mapped places with source provenance;
- six deeper pan-Alpine demonstration experiences for jury storytelling;
- natural-language parsing in English, Italian, German, French and Slovenian;
- editable structured controls after parsing;
- geocoding through local pilot aliases and OpenStreetMap Nominatim;
- live Open-Meteo context with conservative fallback behaviour;
- OSRM road routing and routed journey geometry where supported;
- three genuinely distinct recommendation roles: Best match, Quietest choice and Most local impact;
- freely licensed Wikimedia Commons destination photography;
- multiple saved trips, rename, duplicate, delete and legacy-trip migration;
- device-local offline essentials;
- contextual GemDrop switching;
- GPS-radius verification, partner-code verification and an explicitly labelled demo path;
- one GemPoints ledger with idempotent event IDs and reward deductions;
- temporary reward codes and device-local impact metrics;
- responsive desktop and mobile layouts;
- source and regression tests for the integrated product boundaries.

## Data honesty

The product deliberately separates operational data from estimates and demonstration content:

- names and coordinates in the 50-place catalogue are retained from the existing public dataset;
- recommendation ranking is deterministic and explainable;
- weather is requested live from Open-Meteo when available;
- road routes are requested from the public OSRM service where supported;
- public-transport times, crowd values, parking, partner offers and institutional metrics remain estimates or demonstration data unless an operational source is connected;
- the interface never presents demonstration values as observed field results;
- personal impact reports only recorded actions and does not invent CO₂ savings or an exact number of visitors removed from a hotspot;
- the three validation levels are `Data-based suggestion`, `Locally reviewed` and `Verified Gem`;
- fragile places may be excluded, seasonally limited or shown without exact coordinates.

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Run locally

Requirements:

- Node.js `>=22.13.0`
- npm

```bash
npm ci
npm run dev
```

Open `/` for the public product story and `/app` for the integrated application.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
```

`npm test` builds and validates the Cloudflare/OpenAI Sites artifact before running rendered-output and source regression tests.

CI runs for pull requests and every push to `main`.

## Architecture

```text
app/
  page.tsx                              public pan-Alpine homepage
  app/page.tsx                          integrated application route
  app/profile/page.tsx                  device-local profile
  app/notifications/page.tsx            notification centre
  components/IntegratedAppShell.tsx     tourist and institutional product journey
  components/ExperienceMap.tsx          Leaflet maps, clusters, origin and route geometry
  components/AlpineOverview.tsx         real pan-Alpine catalogue map
  components/DestinationPhoto.tsx       licensed Wikimedia destination media
  product/catalogue.ts                  official + Alpify catalogue and deduplication
  product/transit.ts                    lazy Bavarian GTFS boundary
  product/recommendation-engine.ts      parsing, compatibility gates and distinct ranking roles
  product/live-context.ts               geocoding, weather and route context
  product/storage.ts                    trips, GemPoints ledger and reward codes
  styles/                               modular desktop/mobile design system
public/
  manifest.webmanifest                  PWA manifest
  sw.js                                 service worker and network fallback
.openai/hosting.json                    OpenAI Sites hosting identity
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for state boundaries and the production migration path.

## Deployment

Vercel is connected to GitHub and builds the native Next.js application from `main` using `npm run build:vercel`. OpenAI Sites is published separately from the same source state through the Work/Sites checkpoint flow.

OpenAI Sites owns the current D1-backed contribution endpoint. The Vercel route proxies that endpoint server-side as a temporary compatibility bridge; the planned production migration is Supabase with Row Level Security. See [docs/VERCEL_SUPABASE_DEPLOYMENT.md](docs/VERCEL_SUPABASE_DEPLOYMENT.md).
