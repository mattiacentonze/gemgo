# Data sources and confidence

GemGo must distinguish operational facts from estimates and demonstration content at every layer. The redesign exposes confidence and validation instead of presenting every Alpine region as equally mature.

| Feature | Current source | Classification | Product rule |
|---|---|---|---|
| Pilot catalogue | 50 official team destinations plus 16 unique Bavarian Alpify additions | Static public pilot data | Active map coverage is limited to Bavaria and Valle d’Aosta; the Alpify Tyrol record is excluded. |
| Experience content | `app/data/destinations.json`, `app/data/alpify-locations.json`, `app/product/catalogue-editorial.ts` and `app/product/catalogue.ts` | Source-checked captions plus structured practical editorial records | Every active destination has access, opening, booking, price-status, official-source and check-date fields. Unknown prices and schedules remain explicitly unknown rather than being inferred. |
| Recommendation ranking | Deterministic client score | Operational prototype logic | Explainable and reproducible; not described as a trained production AI model. |
| Crowd windows | Curated values and intended future factors | Demonstration prediction | Always display them as estimated unless an operational provider is explicitly connected. |
| Weather context | Open-Meteo through `app/product/live-context.ts` | Live external data when available | Show the live source state and fall back conservatively when unavailable. |
| Validation level | Product metadata | Demonstration classification | `Data-based suggestion`, `Locally reviewed` and `Verified Gem` must reflect real review depth in production. |
| Car route time and geometry | Public OSRM service where supported | Live external routing | Display fallback estimates when routing is unavailable; do not imply live public-transport routing. |
| Other travel times | Curated values or distance-based estimates | Estimate | Public transport, walking and mixed-mobility times require operational validation before use in safety-critical planning. |
| GemDrop trigger | User-invoked condition-change scenario | Demonstration event | Represents future live crowd, parking, weather, road and schedule triggers. |
| Visit verification | Browser geolocation radius, demonstration partner code or explicit demo path | Mixed prototype and demonstration verification | GPS checks proximity only; QR codes and anti-fraud controls are not production-grade. |
| GemPoints | Server-controlled Supabase ledger after moderation; separate device-local demo ledger | Verified account balance plus local prototype state | Only server-issued, verified events count toward the account balance. Demo GPS, QR and local events are never imported as verified points. |
| Reward catalogue | Curated sample offers | Demonstration partner concepts | No partnership or discount is implied unless explicitly confirmed. |
| Personal impact | Device-local trip, ledger and feedback events | Local prototype metric | Reports only recorded actions; no invented CO₂ or visitor-removal claim. |
| Territory dashboard | Device-local counters and clearly labelled demonstration concepts | Local prototype and demonstration data | Production use requires anonymisation and minimum sample thresholds. |
| Map tiles and geography | OpenStreetMap through Leaflet | Live external context | Attribution and provider usage requirements remain applicable. |
| Destination photography | Reviewed local/Commons records in `app/product/destination-media-audit.ts`, with live Commons discovery for unreviewed destinations | Mixed persisted review metadata and live licensed media discovery | Accept only CC0, CC BY, CC BY-SA or public-domain files; display attribution and source. `metadata-only` means the destination still requires human image selection and must never be presented as reviewed. |

## Destination media policy

GemGo does not silently use attractive web images merely because they are available online.

The current prototype:

- requests metadata directly from the Wikimedia Commons API;
- validates `LicenseShortName` against CC0, CC BY, CC BY-SA and public-domain licences;
- rejects obvious maps, flags, logos, diagrams, signs and other unsuitable media by filename;
- scores candidates against the destination name, region and a curated search alias;
- favours landscape and higher-resolution files for travel cards;
- persists one audit record for every active catalogue ID, including review status and timestamp;
- stores source, author, licence and dimensions for the reviewed files rather than relying on an undocumented filename list;
- provides complete local reviewed galleries for Neuschwanstein Castle and Falkenstein Ruin Pfronten;
- pins reviewed Commons filenames for Fénis Castle, Torgnon, Gressoney-Saint-Jean, the Little Saint Bernard Pass and Châtillon;
- uses relevance-ranked live Commons search for the rest of the 66-location catalogue;
- exposes up to three images in compact recommendation cards and up to five in full detail views;
- displays the author, licence and Commons source link for the active image;
- falls back to a branded non-photographic state rather than using an unverified copyrighted image.

The database has a `destination_media` review model, but it is not populated for the full catalogue. The source-controlled audit deliberately marks the remaining destinations `metadata-only`: a filename-filtered Commons result is not equivalent to a human visual review. Full coverage remains incomplete until a reviewer approves a relevant landscape file for every location and the records are subsequently migrated into the database.

## Practical destination data

Each of the 66 active catalogue entries now resolves to a structured practical record with:

- access type and opening-status classification;
- seasonal scope;
- booking status;
- a price type and check date, including explicit `unknown` when no reliable current tariff was verified;
- an official or primary editorial URL;
- a `checkedAt` date and destination-specific operational warning where available.

The default record is conservative. It never converts missing information into “free”, “always open” or “no booking required”. Exact 2026 tariffs are stored only where a primary operator published them and remain paired with the current official link.

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
