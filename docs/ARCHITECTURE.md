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
  clustering, dominant crowd-category styling, logo markers, first-tap popups
  and an optional canvas crowd veil anchored to geographic coordinates.
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
- one saved itinerary
- simulated location
- notification history and read state
- action-sound preference
- one-time crowd-report and photo reward keys

Map clusters are rendered only when more than five destination markers occupy
the same visual neighbourhood. Groups of five or fewer remain individual and
separate progressively as the user zooms. The crowd layer is a low-opacity
interpolated field tied to projected destination coordinates; it is not a
screen-fixed gradient and does not claim administrative-boundary precision.

There is no shared account database yet. Consequently, state does not follow a
user across devices and is not suitable for monetary rewards.

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

The “Why this plan?” panel exposes the main ranking inputs. The current plan can
be saved locally and restored on the same device.

## Location trust model

GPS and simulated MVP location use the same feature gates, but the UI labels a
simulated location. Crowd ratings, check-ins and photo rewards are only enabled
for the active destination. Photo upload is tied to the check-in session; EXIF
metadata is not treated as proof.

## Future backend boundary

Production-grade accounts and rewards should move to a server-side ledger with
idempotent point events, signed verification sessions and append-only audit
records. Client code must never directly mutate a spendable balance.
