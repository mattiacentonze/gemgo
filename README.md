# GemGo

GemGo is a mobile-first pan-Alpine recommendation and visitor-flow redistribution product. It helps a traveller turn an intended crowded plan into a comparable, personalised and locally useful alternative, then makes the trip executable, verifies the visit, awards one clear reward currency and exposes aggregated impact for Alpine territories.

Live MVP: [gemgo-mvp.aloneeagle.chatgpt.site](https://gemgo-mvp.aloneeagle.chatgpt.site)

## Product model

GemGo follows one measurable cycle:

**Predict → Recommend → Redirect → Verify → Reward → Measure**

The redesign keeps the tourist interface focused on four destinations:

- **Explore** — natural-language briefing plus explicit location, mobility, time, interests, difficulty and accessibility controls;
- **My Trip** — an executable timeline, mobility information, offline essentials and contextual GemDrop changes;
- **Rewards** — one GemPoints balance, usable nearby rewards and personal measurable impact;
- **About** — mission, methodology, privacy and the institutional dashboard.

GemDrop is not a standalone menu page. It is a contextual intervention shown when changed crowd, weather or access conditions make a comparable alternative useful.

## Demonstration journey

The jury-facing flow is:

1. pan-Alpine homepage;
2. visitor brief in Explore;
3. three motivated alternatives;
4. full experience detail and honest comparison;
5. My Trip operational plan;
6. contextual GemDrop;
7. visit verification;
8. GemPoints and personal impact;
9. territory dashboard.

## Data honesty

The branch deliberately separates product behaviour from unsupported claims:

- recommendation ranking is deterministic and explainable;
- demonstration crowd values, confidence, partner rewards and institutional metrics are visibly labelled;
- the interface never presents demonstration values as observed field results;
- personal impact reports only verifiable actions and does not invent CO₂ savings or an exact number of visitors removed from a hotspot;
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

Then open the URL shown by Vite.

## Quality checks

```bash
npm run lint
npm test
```

`npm test` builds and validates the Cloudflare/OpenAI Sites artifact before running rendered-output tests.

## Architecture

```text
app/
  page.tsx                         pan-Alpine marketing homepage and /app handoff
  components/AppShell.tsx          complete tourist and institutional journey
  components/AlpineOverview.tsx    pan-Alpine pressure and coverage visualisation
  components/ExperienceCard.tsx    explainable recommendation cards
  product/types.ts                 product domain types
  product/data.ts                  curated demonstration catalogue
  styles/                          modular desktop/mobile design system
public/
  manifest.webmanifest             PWA manifest
  sw.js                            service worker
.openai/hosting.json               OpenAI Sites hosting identity
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for state boundaries and the production migration path.

## Deployment

The public MVP is deployed through OpenAI Sites. The hosting identity remains in `.openai/hosting.json`; the Vinext/Vite output contract must remain valid. A branch should pass CI before it is merged into `main` and deployed to the production domain.
