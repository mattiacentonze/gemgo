# Branch and deployment status

`main` is the canonical development and production branch.

- The former `agent/pan-alpine-product-redesign` work is fully merged into `main` and the branch can be retired.
- The former `agent/fix-gemdrop-modal` branch has the same final tree as `main`; `main` already contains the fix and its regression coverage.
- Vercel builds `main` automatically and serves the production application at `https://gemgo.vercel.app`.
- OpenAI Sites is published separately from the same reviewed source state at `https://gemgo-pan-alpine.aloneeagle.chatgpt.site`.
- A Sites checkpoint and a Vercel deployment are distinct releases. Compare their source revision and visible build stamp before calling them aligned.
- Crowd, public transport, parking, partner rewards and institutional metrics remain estimated or demonstrative unless an operational source is documented.
- Live weather and supported road routes use external providers with conservative fallback behaviour.
- Destination media is requested from Wikimedia Commons and accepted only when the API reports CC0, CC BY, CC BY-SA or public-domain licensing.

Before releasing, run the full verification suite and visually inspect both deployments on desktop and mobile.
