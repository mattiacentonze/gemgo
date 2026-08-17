# GemGo Pan-Alpine contributor guide

## Source and release scope

- `main` is the canonical development and production branch. Keep GitHub and Vercel aligned to the same reviewed `main` revision.
- Vercel is the sole public deployment target. Do not publish or maintain an OpenAI Sites release unless the user explicitly restores that target.
- Preserve the Pan-Alpine positioning: comparable lower-pressure alternatives, explainable ranking, visit verification, GemPoints and aggregated territorial outcomes.

## Product truth

- Clearly distinguish live, estimated, static and demonstrative data.
- Do not present partner rewards, crowd prediction or institutional metrics as production capabilities until their real backends and agreements exist. Account sync is backed by Supabase for trips and collections only; demo points never migrate to an account.
- `GemPoints` is the public name in every language. Never rename this section to Rewards, GemXP or Credits.
- Accounts use Supabase Auth with Google (when the provider is configured) and email/password fallback. Guests remain local-first. Roles and verified GemPoints are server-controlled; never present local demo activity as verified account value.

## Internationalisation

- Supported locales are EN, IT, DE, FR and SL. Use `app/domain.ts` and `usePersistentLocale`; do not create another locale store.
- The selected locale must persist between the homepage and `/app`, update `document.documentElement.lang`, and remain usable on touch and desktop layouts.
- New user-facing strings must be added for all five locales. Dynamic place names may remain proper nouns; surrounding labels must be translated.

## Responsive and interaction rules

- The homepage and app headers must be full-bleed; their inner content may be width constrained.
- Logo, language, profile/menu and primary navigation must remain operable at every supported width. Never hide the only route to an action.
- Menus, notifications, profile and language panels are mutually exclusive and must fit inside the dynamic viewport.
- Map overlays must reserve separate areas: zoom controls top-left, contextual cards top-right, compact legend at the bottom. Do not stack controls over one another.
- Region buttons are real controls: selecting Bavaria or Valle d’Aosta must refit the map to that region and expose selected state with `aria-pressed`.
- Avoid horizontal scrolling at the page level. Long German, French and Slovenian copy must wrap without clipping.
- Touch targets should be at least 40px, preferably 44px for primary controls.

## Photography

- Destination photography must be landscape (minimum source ratio 1.22, rendered with `object-fit: cover`) and show the named place or its immediate setting.
- Reject maps, books, covers, diagrams, flags, logos, posters, scans, portraits and weakly related results.
- Do not place ranking text over destination photos. Crowd status may remain as a compact chip.
- Wikimedia source, author and licence metadata must remain in the data model and be rendered with a source link. Do not claim all 66 locations have reviewed media until each location has a persisted editorial record.

## UI composition

- Recommendation cards use explicit horizontal icon-and-text rows for validation and reasons. Metrics must include labels, not unexplained numbers.
- Prefer feature components and feature-scoped styles. Extract a component when it has independent state/behaviour or a file grows beyond roughly 500 lines; do not perform risky wholesale rewrites immediately before a demo.
- Avoid adding broad late-stage CSS selectors. Scope fixes to a route or component and remove superseded rules when practical.
- Motion must respect `prefers-reduced-motion`; sound remains opt-in and off by default.

## Performance guardrails

- Do not mount DOM-patching "enhancer" components that observe `document.body`. Whole-document `MutationObserver` scans previously caused navigation and typing freezes when Leaflet or image galleries updated the DOM.
- Render controls, notifications, feedback, planners and modal behaviour directly in the owning React component. Observers are acceptable only for a narrow external surface such as the document language attribute.
- Keep free-text input as draft state. Run parsing, ranking, routing and marker updates only on submit or on a deliberate structured-filter change.
- Planner origins come from the 50 official pilot places plus the 16 deduplicated Bavarian Alpify additions. Keep source provenance and never geocode arbitrary home cities while the user types.
- Catalogue merging must use identity and coordinates together. Do not collapse distinct neighbouring places merely because their source coordinates overlap; the known Alpify `Partnachklamm` entry is merged with the official `Partnachklamm Shoulder Trails` record.
- Active catalogue and map coverage is limited to Bavaria and Valle d’Aosta. Exclude the Alpify `ruin-ehrenberg` Tyrol entry instead of relabelling it as Bavarian.
- Overview and Explore maps mount every catalogue marker. Region controls only refit the viewport; they must never filter, unmount or cluster the other pilot markers.
- Moving a preference slider must not recreate markers, refit the viewport or start route requests. Map marker layers respond only to catalogue, locale or origin changes.
- The Leaflet popup close control must remain authoritative: selected-marker styling must not reopen a popup after the user closes it.
- Disabled hooks must preserve referentially stable empty state. Never pass a fresh `[]` into a stateful effect that responds by writing a fresh `{}` or `[]`; that pattern previously caused an infinite `/app` render loop.
- Lazy-load secondary sections such as the multi-day planner. Never import the legacy `AppShell` into the landing-page client bundle.
- A base-map switch must keep only one tile layer mounted at a time. The supported choices are standard OpenStreetMap and the softened relief/satellite layer; preserve source attribution and restrict panning/tile bounds to the Alpine arc.
- Route styling is semantic and consistent: walking blue/dotted, bicycle green, public transport orange/dashed, car purple, mixed mobility teal/dashed.
- Before publishing, confirm that `/app` has no body-wide mutation observers and compare production client chunk sizes with the prior checkpoint.

## Required verification before publishing

- ESLint is not used in this repository. Biome is the only JavaScript, TypeScript, JSX, TSX, JSON and CSS linter.
- Run `npm run preflight` on the exact candidate commit before any push that can trigger GitHub Actions or a deployment. It covers Biome, i18n, typechecking, the production build and the full test suite.
- Run `npm run audit:dependencies` when registry access is available, review the complete diff, and batch a coherent change into one validated push.
- During the current autonomous-delivery phase, merge the reviewed PR to `main` only after the exact PR head and required checks are green; do not wait for a separate owner review unless an explicit approval boundary applies.
- Use the agent preview for real visual and interaction QA at representative widths: 320, 360, 390, 430, 768, 1024 and 1440px. Test at least one short and one tall viewport.
- On the homepage, test language switching, mobile menu, all anchor links, both CTAs, regional map controls and map overlays.
- In `/app`, test language switching, profile, notifications, mobile menu, Explore results, image gallery, map, My Trip, GemPoints and About.
- Inspect screenshots for overflow, clipped copy, grey image bars, overlay collisions, inaccessible controls and inconsistent spacing. Fix findings before checkpointing.
