# GemGo

GemGo is a mobile-first pan-Alpine recommendation and visitor-flow redistribution product. It helps a traveller turn an intended crowded plan into a comparable, personalised and locally useful alternative, then makes the trip executable, verifies the visit, awards one clear reward currency and exposes privacy-preserving impact for Alpine territories.

Production: [gemgo.vercel.app](https://gemgo.vercel.app), built automatically from the GitHub `main` branch with native Next.js.

`main` is the canonical source branch for development and production. OpenAI Sites is no longer a release target.

## Product model

GemGo follows one measurable cycle:

**Predict → Recommend → Redirect → Verify → Reward → Measure**

The tourist interface is focused on four destinations:

- **Explore** — multilingual natural-language briefing plus explicit location, mobility, time, interests, difficulty and accessibility controls;
- **My Trip** — active and saved trips, an executable timeline, routed map, offline essentials and contextual GemDrop changes;
- **GemPoints** — one event ledger, local reward codes and measurable personal impact;
- **About** — mission, methodology, privacy and the institutional dashboard.

GemDrop is not a standalone menu page. It is a contextual intervention shown when changed crowd, weather or access conditions make a comparable alternative useful.

## Current source-tree capabilities

- real OpenStreetMap/Leaflet maps on the homepage, results, experience detail and My Trip;
- gentler mouse-wheel zoom and clustering when more than two nearby markers overlap;
- the existing 50-place public pilot catalogue plus 16 deduplicated Bavarian Alpify entries, for 66 mapped places with source provenance;
- six deeper pan-Alpine demonstration experiences for jury storytelling;
- deterministic natural-language parsing in English, Italian, German, French and Slovenian, including longest-phrase precedence, bounded negation and rejection of invalid real dates;
- editable structured controls after parsing;
- geocoding through local pilot aliases and OpenStreetMap Nominatim;
- live Open-Meteo context with conservative fallback behaviour;
- OSRM road routing and routed journey geometry where supported;
- three genuinely distinct recommendation roles: Best match, Quietest choice and Most local impact;
- freely licensed Wikimedia Commons destination photography;
- multiple saved trips, rename, duplicate, delete and legacy-trip migration;
- optional Supabase accounts with Google OAuth when configured and email/password fallback;
- five-language password recovery with a PKCE callback, non-enumerating request response, expired/reused-link handling and global sign-out after a successful reset;
- guest-to-account import and cross-device sync for trips and collections, with conflict tombstones;
- device-local offline essentials;
- contextual GemDrop switching to a deterministic lower-pressure alternative, with authenticated acceptance recorded against the saved trip;
- authenticated arrival evidence that combines a private, server-normalised photo with a fresh browser geolocation claim checked against the catalogue destination; this is anti-abuse evidence, not cryptographic proof of presence or transport mode;
- a separate local demo ledger plus a server-only verified GemPoints ledger;
- authenticated photo contributions whose payload-bound reservation and media finalisation are service-role-only after server decoding, metadata stripping and normalisation, with legacy hashes quarantined from dedup, durable withdrawn-media cleanup, and an idempotent 70-GemPoint award only after admin/owner approval;
- an editorial admin area for destination copy in all five languages, accommodation and media records, draft/publish/archive controls and an append-only audit trail; only published destination copy can override the reviewed static fallback in the public product;
- `member`, `content_editor`, `admin` and `owner` roles with server-side authorization;
- recent-session account deletion requests processed after a bounded in-flight drain by a retryable service-only worker that retains the immutable Auth subject, removes private contribution and visit-evidence objects, then deletes the Auth user;
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
npm run preflight
npm run audit:dependencies
npm run test:authenticated
npm run test:visual
```

`npm run preflight` runs the i18n and Biome checks, typechecking, the legacy Cloudflare/Vinext compatibility build and the complete source regression suite. The authenticated and visual Playwright suites remain explicit release checks.

CI runs for pull requests and every push to `main`.

## Architecture

```text
app/
  page.tsx                              public pan-Alpine homepage
  app/page.tsx                          integrated application route
  app/profile/page.tsx                  Supabase Auth profile and guest handoff
  app/admin/page.tsx                    moderation queue and owner-only role controls
  app/notifications/page.tsx            notification centre
  auth/forgot-password/page.tsx         non-enumerating recovery request
  auth/update-password/page.tsx         recovery-session password update
  api/visits/route.ts                    private photo + claimed-GPS visit evidence
  api/catalogue-content/route.ts         published editorial destination copy
  components/IntegratedAppShell.tsx     tourist and institutional product journey
  components/ExperienceMap.tsx          Leaflet maps, clusters, origin and route geometry
  components/AlpineOverview.tsx         real pan-Alpine catalogue map
  components/DestinationPhoto.tsx       licensed Wikimedia destination media
  product/catalogue.ts                  official + Alpify catalogue and deduplication
  lib/prompt-parser.ts                  five-language deterministic prompt parsing
  product/transit.ts                    lazy Bavarian GTFS boundary
  product/recommendation-engine.ts      parsing, compatibility gates and distinct ranking roles
  product/live-context.ts               geocoding, weather and route context
  product/storage.ts                    scoped guest/account caches and demo ledger
lib/supabase/                           public, SSR/client and server-only Supabase clients
supabase/functions/                     scheduled account-deletion worker
supabase/migrations/                    RLS, roles, CMS, evidence and verified ledger
  styles/                               modular desktop/mobile design system
public/
  manifest.webmanifest                  PWA manifest
  sw.js                                 service worker and network fallback
.openai/hosting.json                    legacy Cloudflare/Vinext build identity
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for state boundaries and the production migration path.

## Deployment

Vercel is the only public release target. It is connected to GitHub and builds the native Next.js application from `main` using `npm run build:vercel`.

Supabase provides Auth, account persistence, private contribution and visit-evidence media, role-based moderation, published editorial content and the verified GemPoints ledger. The server upload/verification routes require a server-only service-role environment variable. Google OAuth credentials, Auth and recovery redirect allow-lists, production SMTP, the account-deletion worker secret/Vault/cron setup, production migrations and the release deployment remain operator tasks until explicitly verified. See [docs/VERCEL_SUPABASE_DEPLOYMENT.md](docs/VERCEL_SUPABASE_DEPLOYMENT.md).
