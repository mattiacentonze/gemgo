# Data sources and confidence

GemGo must distinguish operational facts from estimates and demonstration content at every layer. The redesign exposes confidence and validation instead of presenting every Alpine region as equally mature.

| Feature | Current source | Classification | Product rule |
|---|---|---|---|
| Pan-Alpine homepage regions | Existing public pilot catalogue plus curated redesign experiences | Mixed public catalogue and demonstration coverage | Counts correspond only to experiences actually present in the branch. |
| Experience content | `app/product/integrated-data.ts` and `app/product/data.ts` | Existing pilot metadata plus curated demonstration content | Copy, itinerary, mobility and safety fields must be locally validated before production. |
| Recommendation ranking | Deterministic client score | Operational prototype logic | Explainable and reproducible; not described as a trained production AI model. |
| Crowd windows | Curated values and intended future factors | Demonstration prediction | Always display them as estimated unless an operational provider is explicitly connected. |
| Weather context | Open-Meteo through `app/product/live-context.ts` | Live external data when available | Show the live source state and fall back conservatively when unavailable. |
| Validation level | Product metadata | Demonstration classification | `Data-based suggestion`, `Locally reviewed` and `Verified Gem` must reflect real review depth in production. |
| Car route time and geometry | Public OSRM service where supported | Live external routing | Display fallback estimates when routing is unavailable; do not imply live public-transport routing. |
| Other travel times | Curated values or distance-based estimates | Estimate | Public transport, walking and mixed-mobility times require operational validation before use in safety-critical planning. |
| GemDrop trigger | User-invoked condition-change scenario | Demonstration event | Represents future live crowd, parking, weather, road and schedule triggers. |
| Visit verification | Browser geolocation radius, demonstration partner code or explicit demo path | Mixed prototype and demonstration verification | GPS checks proximity only; QR codes and anti-fraud controls are not production-grade. |
| GemPoints | Device-local event ledger | Local prototype state | Not money, not synchronised and not a production redeemable balance. |
| Reward catalogue | Curated sample offers | Demonstration partner concepts | No partnership or discount is implied unless explicitly confirmed. |
| Personal impact | Device-local trip, ledger and feedback events | Local prototype metric | Reports only recorded actions; no invented CO₂ or visitor-removal claim. |
| Territory dashboard | Device-local counters and clearly labelled demonstration concepts | Local prototype and demonstration data | Production use requires anonymisation and minimum sample thresholds. |
| Map tiles and geography | OpenStreetMap through Leaflet | Live external context | Attribution and provider usage requirements remain applicable. |
| Destination photography | Wikimedia Commons API | Live licensed media | Accept only CC0, CC BY, CC BY-SA or public-domain files; display attribution and a source link. |

## Destination media policy

GemGo does not silently use attractive web images merely because they are available online.

The current prototype:

- requests metadata directly from the Wikimedia Commons API;
- validates `LicenseShortName` against CC0, CC BY, CC BY-SA and public-domain licences;
- rejects obvious maps, flags, logos, diagrams, signs and other unsuitable media by filename;
- scores candidates against the destination name, region and a curated search alias;
- favours landscape and higher-resolution files for travel cards;
- uses manually reviewed Commons filenames for the six flagship pan-Alpine experiences;
- exposes up to three images in compact recommendation cards and up to five in full detail views;
- displays the author, licence and Commons source link for the active image;
- falls back to a branded non-photographic state rather than using an unverified copyrighted image.

A production media pipeline should store the reviewed file identifier, licence, attribution and review timestamp in the database instead of relying on a live search for every destination.

## Crowd prediction production model

A production crowd score may combine:

- calibrated historical visitor patterns;
- day, time and season;
- weather;
- known local events;
- attraction, parking or mobility feeds;
- aggregated GemGo verification/report signals;
- licensed crowd-data feeds where appropriate.

Every result must expose source class, timestamp and confidence. A destination should not be recommended merely because it is quiet: it must also pass quality, safety, access, compatibility and territorial-capacity gates.

## Validation depth

- **Data-based suggestion** — generated from structured data and documented rules.
- **Locally reviewed** — checked by a responsible territorial contributor or partner.
- **Verified Gem** — operationally tested and connected to a functioning visit/verification flow.

Coverage may be broad while validation depth grows progressively. The interface must not conceal the difference.

## Fragile-place protection

GemGo may exclude a place, restrict its visibility, hide exact coordinates, apply seasonal limits or suspend promotion. A place being little known is not sufficient reason to promote it.

## Institutional data

Production territory metrics must be aggregated and anonymised. They must not reveal an individual's movement history and should be displayed only above a sufficient sample threshold. Demonstration, estimated and observed values must remain visually and technically separable.
