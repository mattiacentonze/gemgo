# Data sources and confidence

| Feature | Current source | Classification | Notes |
|---|---|---|---|
| Weather | Open-Meteo forecast API | Live external data | Availability and forecast horizon depend on the provider. |
| Map | OpenStreetMap tiles via Leaflet | Live external data | Map attribution is displayed in the UI. |
| Destinations | Shared GemGo dataset plus eight Füssen pilot entries | Curated pilot data | Coordinates and descriptions should be individually validated before production. |
| Travel distance | Geographic distance and mode speed assumptions | Estimate | Not turn-by-turn routing. |
| Crowd label | Popularity, weekday, time and weather heuristics | Estimate | Not live occupancy and not Google Popular Times. |
| User crowd report | Device-local rating after location gate | Local pilot signal | Not aggregated across users yet. |
| GemDeals businesses | Public business websites | Real entities | Discount terms are mocked partnership concepts. |
| GemXP and notifications | Browser storage | Local MVP data | No account sync or monetary value. |
| Simulated location | Settings selection | Explicit mock | Presentation-only; always labelled. |

## Crowd data

Google Places does not expose Popular Times or live busyness through its normal
official Places API. A production crowd layer therefore needs one or more of:

- aggregated GemGo user reports with time decay and abuse controls;
- local authority, attraction or mobility-provider feeds;
- a licensed crowd-data provider such as BestTime where coverage exists;
- calibrated predictions from historical visits, calendar, weather and events.

Every crowd result should expose its source, freshness and confidence.
