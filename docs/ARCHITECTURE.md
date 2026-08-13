# Architecture

## Runtime

GemGo is a React 19 application with one public production target: native Next.js on Vercel from `main`. Supabase provides Auth, Postgres Row Level Security and private contribution Storage. A legacy Next.js-compatible Vinext/Cloudflare artifact remains buildable for compatibility testing but is not a release target.

## Product boundary

The redesigned product is organised around one measurable cycle:

**Predict → Recommend → Redirect → Verify → Reward → Measure**

The visible application has four primary sections: Explore, My Trip, Rewards and About. Saved ideas are incorporated into the trip workflow, accommodation is contextual rather than a top-level catalogue, and GemDrop is an event-driven intervention rather than a destination in the menu.

## Main modules

- `app/page.tsx`: pan-Alpine marketing homepage and `/app` route handoff.
- `app/components/IntegratedAppShell.tsx`: tourist journey, deterministic ranking, scoped trip state, contextual GemDrop, demo verification and rewards.
- `app/components/AuthProvider.tsx`: Supabase session state plus serialized guest/account persistence sync.
- `app/api/gems/route.ts`: authenticated image validation, sanitisation and private contribution upload.
- `app/app/admin/page.tsx`: moderation queue and role controls.
- `lib/supabase/`: browser/server clients, PKCE callback and request proxy.
- `app/components/AlpineOverview.tsx`: reusable pan-Alpine coverage and tourism-pressure visualisation.
- `app/components/ExperienceCard.tsx`: explainable result card with travel time, crowd window, confidence, recommendation reasons and validation level.
- `app/product/types.ts`: product-domain types independent from presentation.
- `app/product/data.ts`: curated demonstration experiences and their explicit confidence, trade-offs, mobility, safety and local-benefit fields.
- `app/styles/`: foundation, product, institutional and responsive style layers.
- `.openai/hosting.json`: legacy Cloudflare/Vinext build identity retained for compatibility.

Legacy destination, map, parser and moderation modules remain in the repository while the redesigned path is evaluated. They can be migrated into the new feature boundaries incrementally instead of being deleted before parity is proven.

## Catalogue boundary

The application combines the official 50-place team dataset with the Bavaria subset of the Alpify repository catalogue. The Tyrol entry (`ruin-ehrenberg`) is excluded and a deterministic identity-and-distance merge removes one known duplicate (`Partnachklamm`) while preserving distinct nearby sites, producing 66 catalogue entries with explicit source provenance. Active coverage is limited to Bavaria and Valle d’Aosta.

## Recommendation model

The current redesign uses a deterministic score. It rewards:

- overlap with requested experience types;
- matching difficulty;
- reachability within the selected travel-time budget and transport mode;
- lower predicted crowd pressure;
- validation depth;
- compatibility with accessibility, family and indoor requirements.

Quietness alone cannot make a result valid. Production ranking must first apply minimum quality, safety, access, territorial-capacity and data-confidence gates. The interface exposes why a result fits, the known trade-offs and the difference from the original plan.

## State

Guests keep plans, collections, demo points and settings in a namespaced browser cache. After sign-in, only trips and collections are imported and synchronised to account-owned Supabase rows. Explicit tombstones prevent an old tab from deleting a newer edit or reviving an ordinary sequential deletion. Demo points, reward codes and demo verification records are never promoted into an account.

Verified GemPoints use server-created ledger events. Clients can read their own events but cannot insert, update, delete or truncate them. A contribution approval locks the pending row and inserts a single `contribution:<id>` event; retries award zero additional points.

## GemPoints

GemPoints are the only visible reward currency. The former GemXP/GemCredits split is removed from the redesigned journey. Points are secondary to recommendation quality and are awarded only after a verifiable action in the intended production model.

The local demonstration can illustrate:

- verified experience completion;
- eligible lower-pressure timing;
- accepted GemDrop changes;
- verified lower-impact mobility;
- participating partner visits.

It does not claim that the current browser balance has monetary value.

## GemDrop

GemDrop is contextual. It may be triggered when crowd, parking, weather, road, schedule or compatibility conditions change. The user receives a comparison between the original plan and an alternative and can switch, keep the original plan or inspect the full comparison. A reward bonus is optional and must never replace the primary experiential reason.

## Institutional boundary

The `For Alpine destinations` dashboard is separated from the tourist journey. It demonstrates the intended metrics:

- diversion rate;
- off-peak shift;
- recommendation satisfaction;
- verified local partner visits;
- reward redemption;
- geographic distribution.

Until real operational data exists, all such values are labelled `Demonstration data`. Production dashboards must aggregate and anonymise events and suppress output below a sufficient sample threshold.

## Privacy boundary

Visitors may explore and receive recommendations without an account. Location is requested only for nearby search, navigation or visit verification. Detailed movement history is not required. An account becomes relevant only for protected synchronisation of plans, preferences and reward balances.

## Responsive system

The same semantic components serve notebook and phone layouts. Desktop uses split planning/result layouts and a full header. Mobile uses stacked content, a compact header and a fixed four-item bottom navigation. Critical cards, comparison blocks, metrics and GemDrop controls collapse without hiding decision-relevant information.

## Remaining production work

Implemented: Supabase Auth (Google hook plus email/password), guest/account persistence, four roles, private contribution uploads, moderation audit and idempotent contribution awards. Passkeys are intentionally out of scope.

Still required before a full public launch:

1. enable Google OAuth and its redirect allow-list, configure production SMTP and manually assign the first owner after a real sign-in;
2. signed GPS/QR/offline verification sessions and stronger server-coordinated conflict ordering;
3. partner and reward redemption records;
4. reviewed persisted media for all 66 locations;
5. final controller/contact, retention schedule and in-product cloud account deletion;
6. anonymised territory metrics with sample thresholds and operational crowd inputs.
