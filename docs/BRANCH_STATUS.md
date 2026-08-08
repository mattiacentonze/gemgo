# Redesign branch status

This document applies only to `agent/pan-alpine-product-redesign`.

- `main` remains unchanged and is not the source of this redesign work.
- The integrated application route is `/app`.
- The OpenAI Site is public, but a published Site represents the branch revision selected during the latest Work/Sites publish action. Newer branch commits require a new preview and publish action before they appear on the public domain.
- Public/private Site audience is selected in the ChatGPT Work/Sites publishing flow.
- Live weather and supported road routes use external providers.
- Crowd, public transport, parking, partner rewards and institutional metrics remain estimated or demonstration data unless an operational source is explicitly documented.
- Destination media is requested from Wikimedia Commons and accepted only when the API reports CC0, CC BY, CC BY-SA or public-domain licensing. Flagship experiences use manually reviewed Commons file sets; other catalogue entries use relevance-filtered Commons search and a branded fallback.
- The current branch restores the GemGo wordmark, crowd-coloured branded map pins, multiple-photo galleries, GemDrop comparison galleries, optional sounds, liquid mobile navigation, reduced-motion-aware animation, local data controls, post-visit feedback, Undo actions and refined mobile/desktop spacing.
- `Redesign CI` is configured for branch pushes, but connector-authored commits have not produced a visible Actions run in this environment. Build, lint and tests must therefore be run again in Work/Sites or a normal Git checkout before the draft PR is approved.
- The pull request must remain draft until build, lint, tests, a refreshed Sites deployment and desktop/mobile review of the latest branch revision are confirmed.
