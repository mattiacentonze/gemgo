# Architecture

## Runtime

GemGo is a React 19 application served through Next.js-compatible Vinext and
deployed as a Cloudflare Worker by OpenAI Sites. The current MVP is primarily a
client-side SPA: route changes update browser history and application state
without a full document reload.

## Main boundaries

- `app/page.tsx`: application state, natural-language parsing, planning,
  location gates, points, notifications and SPA routing.
- `app/components/DestinationMap.tsx`: Leaflet lifecycle, zoom-aware marker
  clustering, dominant crowd-category styling, centered crowd-level logos
  inside compact white pins, first-tap popups and an optional canvas crowd veil
  anchored to geographic coordinates.
- `app/api/gems/route.ts`: validation, duplicate protection and persistence for
  moderated community gem suggestions.
- `app/lib/`: shared prompt, destination-region, travel-time and Wikimedia
  Commons helpers used by both page and map components.
- `db/schema.ts`: D1 schema for pending gem suggestions. It is deliberately
  separate from the local GemXP ledger and future spendable rewards.
- `app/data/destinations.json`: public-safe names, coordinates and place types;
  descriptive copy, tags and crowd values are generated as illustrative MVP
  data in the client.
- `public/sw.js`: service-worker registration target and notification-click
  behaviour.

## State

Transient state is held in React. The MVP persists only presentation data in
`localStorage`:

- GemXP balance
- append-only-style local GemXP history with reason, timestamp and resulting balance
- a collection of saved itineraries, including name, dates, route preferences
  and migration from the former single-plan key
- simulated location
- notification history and read state
- action-sound preference
- interface locale (`EN`, `IT`, `DE` or `FR`)
- bounded account-prompt impression and seven-day snooze timestamps
- one-time crowd-report and photo reward keys
- one-time local reward keys for accepted gem-suggestion submissions
- local GemDrop activity completion metadata; arrival photos are not uploaded

Map clusters are rendered only when more than five destination markers occupy
the same visual neighbourhood. Groups of five or fewer remain individual and
separate progressively as the user zooms; street-level zoom disables clustering
entirely. Marker SVGs embed their raster source so browser resource isolation
cannot leave the pins empty. The crowd layer is a low-opacity interpolated
field tied to projected destination coordinates; it is not a screen-fixed
gradient and does not claim administrative-boundary precision.

There is no shared account database yet. D1 stores only explicitly submitted
gem suggestions for moderation; it does not sync profiles, plans or balances.
Consequently, state does not follow a user across devices and is not suitable
for monetary rewards. The account
prompt is a capability explainer, not a simulated registration flow: it appears
only after a saved plan or GemXP milestone, never as a daily system
notification, and is capped at two impressions with a seven-day snooze.

## Reward vocabulary

- **GemXP** represents participation and progress. It starts without
  registration, stays local in the MVP and is not directly spendable.
- **GemCredits** represents a future account-linked balance that can be
  redeemed with partners. Only eligible, verified XP may be converted.

The separation prevents the interface from implying that an unverified local
browser balance already has monetary value. GemDeals never deduct GemXP.

## Planner behaviour

The automatic planner scores preferences, transport fit and estimated crowd
conditions. A destination whose date-aware result is `Busy` is excluded from
automatic plans. A user can still explicitly add a place from Explore; this is
treated as an intentional choice and receives an off-peak suggested time.

Natural-language destination names are resolved to their region before
planning, so a place such as Torgnon updates the Valle d’Aosta area filter.
Itinerary days always receive a validated start date and distinct render key.
Travel durations use hours and minutes when appropriate and name their origin.
When a popular place is excluded, the plan explains the crowd reason before
presenting the quieter alternative.

The “Why this plan?” panel exposes the main ranking inputs. Saved Plans can be
opened, renamed, duplicated and deleted locally. Explore keeps planned places
visible and labelled by default; users may explicitly hide them.

## Navigation and localisation

Desktop and mobile navigation share a single measured active indicator that
translates and resizes between routes. The mobile bar remains fixed to the
viewport and is covered by responsive visual tests.

The interface locale is stored locally and controls navigation, core planning
copy, settings, Saved Plans and date/time formatting in English, Italian,
German, French and Slovenian. Destination names remain
proper nouns. Country flags are not used as language selectors.

## Location trust model

GPS and simulated MVP location use the same feature gates, but the UI labels a
simulated location. Crowd ratings, check-ins and photo rewards are only enabled
for the active destination. Photo upload is tied to the check-in session; EXIF
metadata is not treated as proof.

## Future backend boundary

Production-grade accounts and rewards should move to a server-side ledger with
idempotent point events, signed verification sessions and append-only audit
records. Client code must never directly mutate a spendable balance.
