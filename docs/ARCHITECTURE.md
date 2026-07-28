# Architecture

## Runtime

GemGo is a React 19 application served through Next.js-compatible Vinext and
deployed as a Cloudflare Worker by OpenAI Sites. The current MVP is primarily a
client-side SPA: route changes update browser history and application state
without a full document reload.

## Main boundaries

- `app/page.tsx`: application state, natural-language parsing, planning,
  location gates, points, notifications and SPA routing.
- `app/components/DestinationMap.tsx`: Leaflet lifecycle, markers, popups and
  optional crowd circles.
- `app/data/destinations.json`: shared structured destination records.
- `public/sw.js`: service-worker registration target and notification-click
  behaviour.

## State

Transient state is held in React. The MVP persists only presentation data in
`localStorage`:

- GemXP balance
- simulated location
- notification history and read state
- one-time crowd-report and photo reward keys

There is no shared account database yet. Consequently, state does not follow a
user across devices and is not suitable for monetary rewards.

## Location trust model

GPS and simulated MVP location use the same feature gates, but the UI labels a
simulated location. Crowd ratings, check-ins and photo rewards are only enabled
for the active destination. Photo upload is tied to the check-in session; EXIF
metadata is not treated as proof.

## Future backend boundary

Production-grade accounts and rewards should move to a server-side ledger with
idempotent point events, signed verification sessions and append-only audit
records. Client code must never directly mutate a spendable balance.
