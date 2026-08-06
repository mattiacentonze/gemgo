# Data sources and confidence

GemGo must distinguish operational facts from estimates and demonstration content at every layer. The redesign exposes confidence and validation instead of presenting every Alpine region as equally mature.

| Feature | Current source | Classification | Product rule |
|---|---|---|---|
| Pan-Alpine homepage regions | Curated redesign catalogue | Demonstration coverage | Counts correspond only to experiences actually present in the branch. |
| Experience content | `app/product/data.ts` | Curated demonstration content | Copy, itinerary, mobility and safety fields must be locally validated before production. |
| Recommendation ranking | Deterministic client score | Demonstration logic | Explainable and reproducible; not described as a trained production AI model. |
| Crowd windows | Curated values and intended future factors | Demonstration prediction | Always show freshness, confidence and a demonstration/estimate label. |
| Weather condition in the redesigned journey | Fixed scenario | Demonstration condition | Used to demonstrate recommendation behaviour, not a live forecast. |
| Validation level | Product metadata | Demonstration classification | `Data-based suggestion`, `Locally reviewed` and `Verified Gem` must reflect real review depth in production. |
| Travel times | Curated per transport mode | Demonstration estimate | Must be replaced or verified through real routing before operational use. |
| GemDrop trigger | User-invoked jury scenario | Demonstration event | Represents future live crowd, parking, weather, road and schedule triggers. |
| Visit verification | Device-local interaction | Demonstration flow | No real GPS attestation or partner QR validation is performed in this branch. |
| GemPoints | Browser storage | Local demonstration state | Not money, not synchronised and not a production redeemable ledger. |
| Reward catalogue | Curated sample offers | Demonstration partner concepts | No partnership or discount is implied unless explicitly confirmed. |
| Personal impact | Verified demo-state counters | Local demonstration metric | Reports only actions represented in the demo; no invented CO₂ or visitor-removal claim. |
| Territory dashboard | Fixed illustrative values | Demonstration data | Must always display the `Demonstration data` label. |
| OpenStreetMap/Leaflet legacy modules | OpenStreetMap | Live external context | Existing attribution and provider requirements remain applicable when reused. |
| Open-Meteo legacy modules | Open-Meteo | Live external data | Existing provider availability and forecast limitations remain applicable when reused. |
| Legacy destination photos | Wikimedia Commons | Live licensed media | Attribution and accepted licences remain mandatory. |

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
