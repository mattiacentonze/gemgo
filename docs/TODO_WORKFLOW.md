# Product TODO workflow

GemGo keeps its private product backlog outside this public repository. No
private document link, copied requirement, collaborator name or internal
discussion belongs here.

## Public decision states

1. **Proposed** — described without private source material.
2. **Chosen** — approved for public implementation.
3. **Completed** — code and public documentation are updated and verified.
4. **Rejected** — intentionally not planned.

Only implemented behaviour and public-safe rationale are documented in this
repository. The private backlog remains the source of truth for internal review
history.

## Implementation rule

Backlog review is read-only. A suggestion can be assessed without copying its
private text into code, issues, commits or documentation. Once approved, the
public repository records only the resulting feature, its user impact and its
technical behaviour.

## Current public capabilities

- Explore destinations can be added to My Plan and the change can be undone.
- Multiple plans can be saved locally, migrated from the former single-plan
  storage and opened, renamed, duplicated or deleted.
- Recommendations expose their main reasons.
- Explore cards show crowd category, date, source and confidence.
- `Busy` predictions are excluded from automatic plans.
- “How it works” is visible beside the planner and expanded below.
- “Nearby” is used only when location is known.
- GemPoints has a detailed local ledger.
- Red status treatment is reserved for errors and busy crowd conditions.
- No email is required to plan or use the device-local demonstration ledger; verified account GemPoints require a confirmed account and a server-issued event.
- Planned Explore cards remain visible with an `In your plan` state and may be
  hidden through an explicit filter.
- Desktop and mobile navigation use one fluid active indicator.
- The interface offers persisted `EN`, `IT`, `DE`, `FR` and `SL` language selection
  without country flags.
- Free-text planning uses deterministic rules in the same five languages, with longest-phrase precedence, bounded negation and rejection of invalid calendar dates.
- Nearby overlapping pins are grouped by the current map clustering logic; this remains an implementation detail rather than a coverage claim.
- Registration reminders are contextual, capped and snoozable; daily prompts
  are intentionally rejected.
- Destination cards include freely licensed illustrative photography with
  source attribution, licence details and a safe fallback.
- Destination details include short descriptions, indicative logistics,
  verification dates and links to current official information.
- Welcome, About and Privacy pages are available as public routes.
- Email/password accounts have a five-language recovery flow with a generic request response, PKCE callback, invalid-link state and global sign-out after password replacement. SMTP and redirect configuration still require an operational environment check.
- Authenticated contributions pass through server-side image decoding, WebP normalisation, metadata removal and a private service-only upload before moderation; approval creates at most one `+70` account event.
- The admin area manages validated contribution review, five-language destination copy, accommodation and media records, editorial states and an append-only audit trail. Public destination copy reads only published rows and keeps the reviewed static fallback.
- Signed-in saved trips can record the deterministic GemDrop alternative and submit a private arrival photo with a fresh browser-location claim. Replay, duplicate-photo, distance, accuracy, cooldown and rate controls protect the ledger, but the evidence is not cryptographic proof of presence or transport.
- A recent-session account deletion request queues a retryable service-only worker for private Storage and Auth cleanup. Production migration, function secret, Vault, cron, legal retention policy and end-to-end deletion verification remain operational gates.
- The About page presents all three team members with authorised local
  portraits and LinkedIn links.
- Explore and planning support a maximum straight-line travel radius.
- Plans are rendered on the map with numbered stops and transport-specific
  coloured legs.
- Nearby accommodation cards show indicative prices and ratings and link to
  Booking.com; accommodation map markers remain future work.
