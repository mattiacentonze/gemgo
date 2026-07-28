# GemGo

GemGo is a mobile-first Progressive Web App for planning quieter, lower-impact
trips in the Alps. The current MVP combines a natural-language trip planner,
an interactive destination map, live weather, community crowd reports,
location-aware check-ins, GemPoints and concept partner deals.

Live MVP: [gemgo-mvp.aloneeagle.chatgpt.site](https://gemgo-mvp.aloneeagle.chatgpt.site)

## Current scope

- 58 pilot destinations across Füssen / Allgäu, Bavaria and Valle d’Aosta
- natural-language preference parsing with filter reset and negation support
- one-to-seven-day trip plans
- strict exclusion of automatically predicted `Busy` stops
- explainable recommendations, Explore-to-plan additions, undo and local plan saving
- live Open-Meteo forecasts
- interactive OpenStreetMap map with zoom-aware marker clustering
- proportional cluster circles colored by their dominant crowd category
- cropped green, orange and red GemGo logo markers with first-tap popups
- optional crowd layer
- SPA navigation for Explore, GemDrop, GemPoints, GemDeals and notifications
- real or explicitly simulated location checks for MVP presentations
- device-local GemXP ledger, notification history, check-ins and photo previews
- a separate GemCredits concept for future account-linked, redeemable rewards
- installable PWA with opt-in device notifications
- interface icons from `lucide-react`

## Run locally

Requirements:

- Node.js `>=22.13.0`
- npm

```bash
npm ci
npm run dev
```

Then open the URL shown by Vite.

## Quality checks

```bash
npm run lint
npm test
```

`npm test` builds and validates the Cloudflare-compatible artifact before
checking the rendered HTML.

## Project structure

```text
app/
  components/DestinationMap.tsx  Leaflet clusters, logo markers and popups
  data/destinations.json         shared GemGo pilot destination dataset
  page.tsx                       client-side application and feature flows
  globals.css                    responsive visual system
public/
  assets/gemgo-logo.png          GemGo brand asset
  manifest.webmanifest           PWA manifest
  sw.js                          service worker and notification click handling
docs/
  ARCHITECTURE.md                application boundaries and state model
  DATA_SOURCES.md                real, estimated and mocked data
  TODO_WORKFLOW.md               product-TODO decision process
tests/
  rendered-html.test.mjs         deployed artifact smoke test
```

## Data honesty

GemGo deliberately distinguishes live, estimated and mocked information:

- weather is requested live from Open-Meteo;
- map tiles and geographic context come from OpenStreetMap;
- crowd levels are currently estimates based on popularity, weekday, weather
  and time, not live visitor counts;
- GemDeals name real businesses, but offers are concept proposals until a
  partnership is signed;
- GemXP, notifications, saved plans and simulated GPS state are local to the
  device;
- GemCredits are intentionally not issued in the MVP.

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) for the complete inventory.

## Product TODOs

Product suggestions are reviewed from the shared Google Doc before being
implemented. Items are not deleted: after a decision and the corresponding
work, they are struck through so collaborators retain the history. See
[docs/TODO_WORKFLOW.md](docs/TODO_WORKFLOW.md).

## Deployment

The public MVP is deployed through OpenAI Sites. The hosting identity lives in
`.openai/hosting.json`; the production build must keep the Vinext/Sites
configuration and output contract intact.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Keep the app
mobile-first, use Lucide React for interface icons, and document every new data
source as real, estimated or mocked.
