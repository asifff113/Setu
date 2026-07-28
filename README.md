# সেতু · Setu

Offline-first crisis-communication PWA. People check in as **SAFE** or **NEEDS
HELP**, see a board of everyone their device knows about, and read
cryptographically signed bulletins — all backed by an immutable local event
log that syncs over whatever transport exists (cloud relay, a laptop on a
local Wi-Fi hotspot, QR codes between two phones, audio chirps between a
speaker and a mic, or SMS via a gateway phone). No accounts, no server of
record.

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

## Sync (relay + local node)

Setu's events are immutable and signed, so syncing is just union-by-id: every
transport funnels through one verified ingest path, and any event that fails
its signature is dropped. The relay is a store-and-forward cache, **not** a
server of record.

**How a phone picks a relay:**

- **Auto** — it connects to a `/ws` socket at whatever origin it was served
  from. A public host → the cloud relay (🟢 in the status pill); a LAN/localhost
  host (i.e. the app was served by a laptop node) → 🟡 local node.
- **Manual** — `Sync → Connect to local node`, then type `192.168.x.x:8787` or
  scan the QR at `http://<laptop-ip>:8787/node-qr`. Persisted across restarts;
  "Disconnect" returns to auto.

Reconciliation is server-driven: the phone opens with the ids it holds, the
relay sends back what the phone is missing and asks for what the relay is
missing, then both push new events live. Reconnect is automatic with backoff,
and the app re-syncs whenever it returns to the foreground or regains network
(Background Sync is Chromium-only, so we never depend on it).

> **Browser limitation to know for the demo:** browsers block `ws://` from an
> `https://` page (mixed content). So the manual local-node flow works when the
> app is loaded over **http** — which is exactly the offline-hotspot path:
> phones open `http://<laptop-ip>:8787` (served by the relay) and auto-connect.
> A phone running the cached *https* PWA can't dial a plaintext LAN node; point
> it at the laptop's http URL instead.

**Two-phone / three-device offline test (Phase 4 acceptance):**

1. On the laptop: `npm run node:local`. Note the LAN IP it prints, or open
   `http://localhost:8787/node-qr` to see it as a QR.
2. Turn the laptop's **internet off** but keep the Wi-Fi hotspot up (or use any
   router with no uplink). Connect the phones to it.
3. On each phone open `http://<laptop-ip>:8787`. The Sync tab should show
   🟡 **Local node connected**.
4. Check in as SAFE on one phone → it appears on the others' Board within a
   second, with no internet anywhere.

For pure UI dev, `npm run dev` proxies `/ws` to a relay on `:8787`, so
`npm run dev` + `npm run dev:relay` sync end-to-end at `http://localhost:5173`.

## Chirp — data over sound (Phase 8)

The last rung on the transport ladder: when there's no network, no camera to
scan a QR, and no SMS gateway, one device plays its latest check-in as an
audible [ggwave](https://github.com/ggerganov/ggwave) FSK tone and another
device decodes it through the mic. `Sync → 🔊 Chirp`.

- **Send** packs *one* event (your latest check-in) into a compact ~110–140
  byte binary frame — the 32-byte author key + 64-byte signature are
  unavoidable, so unlike QR Beam this carries a single event, not a bundle. It
  loops the sound until you stop. A full Bangla name + area still fits; if an
  event is too large it says so and points you at QR Beam.
- **Listen** decodes the mic stream and funnels the recovered event through the
  same verified `ingestEvents` gate as every other transport, so a forged or
  garbled chirp is dropped on its signature. The event id is *recomputed* on
  receive (never transmitted), so a tampered frame simply fails to verify.
- ggwave is a self-contained WASM module with its binary embedded as a data-URI
  — **no runtime fetch, works fully offline** — lazy-loaded on first use and
  precached by Workbox.

**Two-phone demo:** open `Sync → 🔊 Chirp → 🎧 Listen` on phone A (grant the
mic, tap *Start listening*), and `Sync → 🔊 Chirp → 📢 Play` on phone B. Hold
them close, turn B's volume up, keep it quiet. B chirps for ~5–9 s per loop;
A shows ✅ *1 new* when it decodes. *Quicker* vs *More reliable* trades transmit
time for robustness.

Like the camera, the mic needs a **secure context** (HTTPS or `localhost`). The
PWA installed from the HTTPS deploy stays secure even in airplane mode, so this
works **fully offline** — install on both phones first, then cut the network. A
phone pointed at a plaintext `http://<laptop-ip>:8787` node can't open the mic,
so demo Chirp from the installed HTTPS app, not the http hotspot URL.

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
| `DATA_DIR` | relay | — | SQLite event cache + persisted relay key live here. If unset, both are in-memory (fine for a laptop node; set it on the cloud relay for durability). |
| `GATEWAY_URL` / `GATEWAY_KEY` | relay | — | Reserved for the SMS bridge phase; not yet read. |
| `RELAY_SECRET_KEY` | relay | — | 32-byte hex seed for the relay's own key (used to sign SMS events from Phase 6). If unset, it's generated and persisted to `DATA_DIR/relay-key.hex`, or ephemeral when there's no `DATA_DIR`. |

## License

MIT.
