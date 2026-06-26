# epic-offers-bridge

Tiny Flask relay that exists for exactly one reason: `store.epicgames.com/graphql`
(Epic's offer pricing/discount/tags endpoint) sits behind a Cloudflare challenge that
blocks plain HTTP clients — Node's `fetch`, `curl`, even with full browser headers,
get a real 403 challenge page. Only a TLS/JS-capable client passes it; `cloudscraper`
(used here) does. See `app.py`'s docstring and
[docs/epic-game-details-pipeline.md](../../docs/epic-game-details-pipeline.md) for
the full context — everything else in the pipeline (get_product, namespace mapping,
catalog metadata) is NOT behind this wall and stays in the main Next.js app.

## Run locally

```bash
cd services/epic-offers-bridge
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
BRIDGE_SECRET=dev-secret python app.py   # listens on :8000
```

Then in the main app's `.env.local`:

```
EPIC_OFFERS_BRIDGE_URL=http://localhost:8000
EPIC_OFFERS_BRIDGE_SECRET=dev-secret
```

`BRIDGE_SECRET` is optional but recommended even for local dev — without it `/offers`
is open to anyone who finds the URL, who'd effectively get a free Cloudflare-bypass
relay for Epic's API through your service.

## Deploy

**Deployed on Render** (`render.yaml` at the repo root is a ready-to-use Blueprint).
Needs a host that runs a persistent Python process with unrestricted outbound
internet — **not** Vercel (Node functions can't spawn Python; its native Python
runtime doesn't fit `cloudscraper` well either), and **not PythonAnywhere's free
tier** — confirmed by hand: its outbound traffic goes through a mandatory proxy that
only allows a fixed domain whitelist, and `store.epicgames.com` isn't on it
(`ProxyError(... 403 Forbidden)` on every request). Render's free web services have
normal outbound access; the trade-off is they sleep after ~15min idle and take
30-60s to wake on the next request — fine here, this only runs as a background
enrichment call, never something a user stares at waiting for.

1. On Render: **New +** → **Blueprint** → pick this repo. It reads `render.yaml` and
   configures the service (root dir, build/start commands) automatically.
2. Set `BRIDGE_SECRET` when prompted (Render's Blueprint flow asks for any env var
   marked `sync: false`).
3. Point the main app's `EPIC_OFFERS_BRIDGE_URL` (production env, in Vercel) at the
   deployed `https://<service>.onrender.com` URL, and `EPIC_OFFERS_BRIDGE_SECRET` at
   the same secret.

## Contract

`POST /offers`
```json
{ "offers": [{ "namespace": "...", "offerId": "..." }] }
```
→
```json
{ "offers": { "<offerId>": { "id": "...", "description": "...", "keyImages": [...], "tags": [...], "price": {...} } } }
```

`GET /health` → `{ "status": "ok" }` (no secret required, for host health checks).
