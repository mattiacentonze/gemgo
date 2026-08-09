# Branch and deployment status

`main` is the canonical development and production branch.

- The former `agent/pan-alpine-product-redesign` work is fully merged into `main` and the branch can be retired.
- The former `agent/fix-gemdrop-modal` branch has no behaviour missing from `main`; `main` independently contains the fix and its regression coverage.
- Vercel builds `main` automatically and serves the production application at `https://gemgo.vercel.app`.
- OpenAI Sites is no longer a release target. Its legacy D1 endpoint remains only as a temporary server-side compatibility dependency until Supabase replaces it.
- Crowd, public transport, parking, partner rewards and institutional metrics remain estimated or demonstrative unless an operational source is documented.
- Live weather and supported road routes use external providers with conservative fallback behaviour.
- Destination media is requested from Wikimedia Commons and accepted only when the API reports CC0, CC BY, CC BY-SA or public-domain licensing.

Before releasing, run the full verification suite and visually inspect the Vercel deployment on desktop and mobile.
