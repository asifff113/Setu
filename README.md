# সেতু · Setu

Offline-first crisis-communication PWA. People check in as **SAFE** or **NEEDS
HELP**, see a board of everyone their device knows about, and read
cryptographically signed bulletins — all backed by an immutable local event
log that syncs over whatever transport exists (cloud relay, a laptop on a
local Wi-Fi hotspot, QR codes between two phones, or SMS via a gateway
phone). No accounts, no server of record.

Monorepo (npm workspaces):

- **`app/`** — React + TypeScript + Vite PWA (the thing people install on
  their phone).
- **`relay/`** — Node/Hono sync server. Also serves the built `app/` as
  static files, so "the relay" is the one thing you deploy.
- **`shared/`** — types, crypto, codec, and the area/geohash lookup table
  used by both.

## Quickstart (local dev)

Requires Node 20+.

```bash
npm install
npm run dev            # app at http://localhost:5173 (Vite, hot reload)
npm run dev:relay       # relay at http://localhost:8787 (separate terminal)
```

`npm run dev` is enough on its own for UI work — the app is fully offline
(IndexedDB-backed) and doesn't need the relay running. `dev:relay` only
matters once you're working on sync (later phases) or want to test the
combined static-serving path (below).

Run the shared-package unit tests (crypto/codec/views):

```bash
npm test
```

## Offline-laptop mode (one command, zero internet)

This is the "relay running on a local Wi-Fi hotspot" transport from the demo
script: build the app once, then serve app + relay together from a single
process, so any phone on the same Wi-Fi can reach it — no internet required.

```bash
npm run node:local
```

Then open `http://<this-laptop's-LAN-IP>:8787` on a phone connected to the
same Wi-Fi/hotspot. Set `PORT` to change the port.

## Building for production

```bash
npm run build            # app -> app/dist
npm run build:relay      # type-checks the relay (relay runs from TS via tsx, no compile step)
```

## Verifying offline caching (do this before every demo)

1. `npm run build && npm run node:local`
2. Open `http://localhost:8787` in Chrome, confirm the app loads and the
   install icon appears in the address bar.
3. Open DevTools → Application → Service Workers and confirm one is
   `activated and running` for that origin.
4. Turn on **airplane mode** (or DevTools → Network → Offline) and reload the
   page. The app must still load and be fully usable — check-ins, board, and
   navigation between tabs all work with zero network, since everything is
   IndexedDB-backed and the app shell is precached.
5. In DevTools → Application → Service Workers you can also click **Update**
   / bump the version after a rebuild to confirm the new build takes over
   (`registerType: 'autoUpdate'` in `vite.config.ts` means this happens
   automatically for real users on next foreground, no prompt needed).

## Deploying the relay (+ app)

The relay serves the built PWA, so deploying the relay deploys both. Both
paths below build the Docker image remotely — **you don't need Docker
installed locally** for either.

### Fly.io

```bash
flyctl auth login
# fly.toml already has an app name — either rename `app = "..."` in fly.toml
# to something globally unique, or run `fly launch --no-deploy` and let it
# rewrite fly.toml / register the app for you.
fly deploy
```

Health checks hit `/healthz`. `min_machines_running = 0` in `fly.toml` scales
to zero when idle to save cost during development — set it to `1` shortly
before a live demo so there's no cold-start delay for judges.

### Render

Push this repo to GitHub, then in the Render dashboard: **New → Blueprint**,
point it at the repo. Render reads `render.yaml` and builds `Dockerfile`
automatically. Health checks hit `/healthz`.

### After deploying

Open the live URL on your Android phone, and confirm:

- Chrome offers **"Add to Home screen" / Install app**.
- After installing, open it from the home-screen icon, then turn on airplane
  mode — it must still load (same check as the local verification above,
  now against the deployed service worker).

## Environment variables

| Var | Used by | Default | Notes |
| --- | --- | --- | --- |
| `PORT` | relay | `8787` | Also respected by Fly/Render's own port injection. |
| `STATIC_DIR` | relay | `<repo>/app/dist` | Override only if you're not using the standard repo layout. |
| `DATA_DIR` | relay | — | Reserved for SQLite persistence (relay sync phase); not yet read. |
| `GATEWAY_URL` / `GATEWAY_KEY` | relay | — | Reserved for the SMS bridge phase; not yet read. |
| `RELAY_SECRET_KEY` | relay | — | Reserved for signing relay-originated (SMS) events; not yet read. |

## License

MIT.
