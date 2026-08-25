# Architecture

## Runtime

GemGo is a React 19 application with one public production target: native Next.js on Vercel from `main`. Supabase provides Auth, Postgres Row Level Security, private contribution and visit-evidence Storage, published editorial content and the verified account ledger. A legacy Next.js-compatible Vinext/Cloudflare artifact remains buildable for compatibility testing but is not a release target.

## Product boundary

The redesigned product is organised around one measurable cycle:

**Predict → Recommend → Redirect → Verify → Reward → Measure**

The visible application has four primary sections: Explore, My Trip, GemPoints and About. Saved ideas are incorporated into the trip workflow, accommodation is contextual rather than a top-level catalogue, and GemDrop is an event-driven intervention rather than a destination in the menu.

## Main modules

- `app/page.tsx`: pan-Alpine marketing homepage and `/app` route handoff.
- `app/components/IntegratedAppShell.tsx`: tourist journey, deterministic ranking, scoped trip state, contextual GemDrop and the boundary between local demo state and authenticated evidence.
- `app/components/AuthProvider.tsx`: Supabase session state plus serialized guest/account persistence sync.
- `app/auth/forgot-password/`, `app/auth/update-password/` and `app/auth/callback/route.ts`: PKCE password recovery, recovery-session validation and password replacement.
- `app/api/gems/route.ts`: authenticated contribution validation, server-side image sanitisation and private upload through a service-only client.
- `app/api/visits/route.ts`: same-origin authenticated GemDrop acceptance and arrival-evidence validation using a private normalised photo plus a fresh claimed GPS point.
- `app/api/catalogue-content/route.ts`: public, RLS-limited read of published destination copy.
- `app/app/admin/page.tsx`: validated-media moderation, editorial CMS, audit trail and role controls.
- `lib/supabase/`: browser, request-scoped, anonymous-public and server-only service clients.
- `supabase/functions/account-deletion-worker/`: scheduled, secret-protected cleanup of private Storage and the Auth user after a queued deletion request.
- `app/components/AlpineOverview.tsx`: reusable pan-Alpine coverage and tourism-pressure visualisation.
- `app/components/ExperienceCard.tsx`: explainable result card with travel time, crowd window, confidence, recommendation reasons and validation level.
- `app/product/types.ts`: product-domain types independent from presentation.
- `app/lib/prompt-parser.ts`: deterministic five-language token/span parser with explicit phrase precedence, bounded negation and real-date validation.
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

Verified GemPoints use server-created ledger events. Clients can read their own events but cannot insert, update, delete or truncate them. A contribution approval locks the pending row and inserts a single `contribution:<id>` event; retries award zero additional points. A validated visit inserts one base event and, only when the same saved trip previously recorded the server-checked GemDrop alternative, one separate bonus event. Request IDs, trip-stop uniqueness, cooldowns, rate limits and photo hashes constrain replay and duplicate rewards.

Published destination editorial rows are read through anonymous RLS and may override only names, summaries, operational notes and source labels. Coordinates, ranking inputs and safety-relevant catalogue structure remain in the reviewed static bundle. If the CMS read is unavailable or has no published row for the selected locale, the application keeps the static fallback.

## GemPoints

GemPoints are the only visible reward currency. The former GemXP/GemCredits split is removed from the redesigned journey. Points are secondary to recommendation quality and are awarded only after a verifiable action in the intended production model.

The local demonstration can illustrate:

- verified experience completion;
- eligible lower-pressure timing;
- accepted GemDrop changes;
- verified lower-impact mobility;
- participating partner visits.

It does not claim that the current browser balance has monetary value.

The authenticated arrival-evidence path is separate from that local demonstration. Its server route checks a confirmed account, a matching saved trip stop, a recent browser geolocation claim within the configured destination radius, a decodable private photo and replay/rate controls before issuing ledger events. Browser geolocation can be spoofed and a photograph is not cryptographic proof of presence, identity or transport mode, so the product must describe this as validated evidence rather than absolute proof.

## GemDrop

GemDrop is contextual. It may be triggered when crowd, parking, weather, road, schedule or compatibility conditions change. The current server route accepts only the deterministic lower-pressure alternative computed from the reviewed catalogue and binds that acceptance to an authenticated saved trip. The user can switch, keep the original plan or inspect the full comparison. Acceptance alone awards nothing: the optional bonus is created only with a later validated visit to that alternative and must never replace the primary experiential reason. Live trigger inputs remain estimates or pilot signals unless an operational provider is connected.

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

Visitors may explore and receive recommendations without an account. Location is requested only for nearby search, navigation or visit evidence. Detailed movement history is not required, and the visit-evidence table stores accuracy, distance and capture time rather than the submitted raw coordinates. Arrival photos remain in a private bucket and are re-encoded without EXIF.

Account deletion requires a recently created Auth session and cannot remove the last `owner`. The request serializes and blocks normal account writes, withdraws pending contributions, clears account-owned application rows and queues the remaining privileged work. The queue preserves an immutable Auth subject even if the nullable Auth FK is cleared, and waits 15 minutes for bounded in-flight server routes to drain. A service-only Edge Function removes both contribution and visit-evidence Storage prefixes even after an Auth 404, then deletes the Auth user, retries transient failures with lease fencing and bounded backoff, and records completion only after cleanup. The same scheduled worker drains the durable outbox represented by withdrawn contribution-media rows, so a failed fast-path Storage removal does not depend on the user keeping a retry button open. This path is operational only after its migrations, function deployment, hashed function secret, Vault secret and scheduled invocation have been configured.

## Responsive system

The same semantic components serve notebook and phone layouts. Desktop uses split planning/result layouts and a full header. Mobile uses stacked content, a compact header and a fixed four-item bottom navigation. Critical cards, comparison blocks, metrics and GemDrop controls collapse without hiding decision-relevant information.

## Remaining production work

Implemented in the current source: Supabase Auth (Google hook plus email/password and password recovery), guest/account persistence, four roles, server-validated private contribution uploads, moderation and editorial audit, published destination-copy fallback, idempotent contribution awards, photo-plus-claimed-GPS visit evidence and the queued deletion worker. Passkeys are intentionally out of scope.

Still required before a full public launch:

1. apply and verify the pending production migrations, configure the server-only service-role environment variable and deploy the reviewed application revision;
2. enable Google OAuth and its redirect allow-list, authorize the recovery callback, configure production SMTP and manually assign the first owner after a real sign-in;
3. deploy the deletion Edge Function and configure its secret digest, Vault-held plaintext secret and scheduled invocation, then run a real deletion test;
4. decide whether stronger device attestation, partner QR or offline verification is required; the current browser GPS claim does not prove presence or transport;
5. add partner and reward-redemption records and reviewed persisted media for all 66 locations;
6. finalize controller/contact and retention policy, then add anonymised territory metrics with sample thresholds and operational crowd inputs.
