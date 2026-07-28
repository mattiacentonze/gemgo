# Contributing to GemGo

## Principles

1. Design for a phone viewport first, then verify desktop layouts.
2. Keep Explore, GemDrop, GemPoints, GemDeals and notifications as SPA views.
3. Never present estimated or mocked values as live facts.
4. Use `lucide-react` for interface icons. GemGo brand artwork and map tiles are
   assets, not interface icon substitutes.
5. Keep GPS-only actions gated by the current location. Presentation-mode
   simulation must remain clearly labelled in Settings.
6. Update the README or the relevant document when behaviour, data or
   deployment changes.

## Before proposing a change

```bash
npm ci
npm run lint
npm test
```

Commit source and documentation together when the change affects user-visible
behaviour or data provenance.
