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

# Required before first deploy: fly.toml sets NODE_ENV=production, and the
# relay refuses to start in production without a SMS_INBOUND_KEY (unlike
# render.yaml below, fly.toml doesn't auto-generate one).
fly secrets set SMS_INBOUND_KEY="$(openssl rand -hex 32)"

fly deploy
```

Health checks hit `/healthz` (liveness/readiness only — no counts; see
`METRICS_KEY` in [Environment variables](#environment-variables) for
authenticated numbers). `min_machines_running = 0` in `fly.toml` scales to
zero when idle to save cost during development — set it to `1` shortly
before a live demo so there's no cold-start delay for judges.

### Render

Push this repo to GitHub, then in the Render dashboard: **New → Blueprint**,
point it at the repo. Render reads `render.yaml` and builds `Dockerfile`
automatically; it also auto-generates `SMS_INBOUND_KEY` for you (see
`generateValue: true` in `render.yaml`), so there's no manual secret step
here the way there is on Fly. Health checks hit `/healthz`.

The included Blueprint uses Render's free tier and therefore does not attach a
persistent disk. SQLite and the relay signing key use `/tmp/data`, Render's
temporary filesystem, and may reset when the instance is replaced or
redeployed; events already stored on phones remain safe and are uploaded again
on their next sync. Use a paid Render disk or Fly volume when the relay itself
must retain events across instance replacements.

`/sms-sim` is disabled by default once `NODE_ENV=production` (both platforms
set this). To demo it on a Render/Fly deploy, set `SMS_SIM_KEY` — an
operator-chosen value, separate from `SMS_INBOUND_KEY` — then open
`/sms-sim` and paste that same value into the page's "Simulator key" field.

### After deploying

Open the live URL on your Android phone, and confirm:

- Chrome offers **"Add to Home screen" / Install app**.
- After installing, open it from the home-screen icon, then turn on airplane
  mode — it must still load (same check as the local verification above,
  now against the deployed service worker).

## SMS bridge + the no-JS `/lite` board (Phase 7)

Button-phone users are first-class citizens, not just broadcast targets. A
gateway phone (or the [android-sms-gateway](https://github.com/capcom6/android-sms-gateway)
app / [httpSMS](https://httpsms.com/)) forwards inbound texts to the relay's
`POST /api/sms/inbound`, which auto-detects either JSON shape, parses the
grammar below (case-insensitive, Bangla digits tolerated), and turns it into
a normal `src:'sms'` SetuEvent — attested with the relay's own signature
(since a phone number has no Ed25519 key of its own) and synced to every
peer exactly like an app-authored event. See `Info` in the app for the
grammar reference shown to users.

- `SAFE <name> [area]` → checkin/safe
- `HELP <MED|RESCUE|FOOD|WATER|SHELTER> <name> [area] [- message]` → help/need
- `MISSING <name> [area]` / `FOUND <name> [area]` → person event
- `FIND <name>` → the relay texts back that person's latest known status —
  the two-way exchange, not just one-way broadcast
- anything else → a usage-help reply

Outbound replies (`FIND` answers, usage help) go out through `GATEWAY_URL` +
`GATEWAY_KEY` (below); if unset, replies are logged only, not sent — useful
for local dev.

No real gateway handy? `GET /sms-sim` is a fake-phone page that POSTs to the
same webhook, for demoing the whole flow from a browser.

`GET /lite` is a server-rendered, zero-JavaScript, <20 KB plain-HTML
read-only board (grouped by area, `<meta http-equiv="refresh" content="60">`)
for feature phones and 2G-era browsers that can't run the PWA at all.

## Environment variables

| Var | Used by | Default | Notes |
| --- | --- | --- | --- |
| `PORT` | relay | `8787` | Also respected by Fly/Render's own port injection. |
| `STATIC_DIR` | relay | `<repo>/app/dist` | Override only if you're not using the standard repo layout. |
| `DATA_DIR` | relay | — | SQLite event cache + persisted relay key live here. If unset, both are in-memory (fine for a laptop node; set it on the cloud relay for durability). |
| `NODE_ENV` | relay | — | Set to `production` on a real deploy (Fly/Render do this for you). Requires `SMS_INBOUND_KEY`, and disables `/sms-sim` unless `SMS_SIM_KEY` is also set. |
| `GATEWAY_URL` | relay | — | Outbound SMS-send endpoint (an android-sms-gateway or httpSMS URL). Unset → outbound replies (`FIND` answers, usage help) are logged only, not sent. Must be `https://` unless it's a LAN/loopback address or `GATEWAY_ALLOW_INSECURE=1` is set — it carries `GATEWAY_KEY`. |
| `GATEWAY_KEY` | relay | — | Auth key/token for `GATEWAY_URL`. |
| `GATEWAY_KIND` | relay | inferred from `GATEWAY_URL` | `android` or `httpsms` — override only if URL-sniffing guesses wrong. |
| `GATEWAY_FROM` | relay | — | Sender number; required by httpSMS' send API, ignored by android-sms-gateway. |
| `GATEWAY_ALLOW_INSECURE` | relay | — | Set to `1` to allow a plaintext `http://` `GATEWAY_URL` outside a LAN/loopback address. Leave unset unless you specifically accept `GATEWAY_KEY` traveling in the clear. |
| `RELAY_SECRET_KEY` | relay | — | 32-byte hex seed for the relay's own key (used to sign `src:'sms'` events). If unset, it's generated and persisted to `DATA_DIR/relay-key.hex`, or ephemeral when there's no `DATA_DIR`. |
| `SMS_INBOUND_KEY` | relay | — | Shared secret the gateway (and `/sms-sim`, via its own key field) must present to `POST /api/sms/inbound`. **Required** in production and whenever `GATEWAY_URL` is set — without it, anyone who finds the webhook URL can post arbitrary "SMS" events. Send it as `X-Setu-Key: <key>` or `Authorization: Bearer <key>`. |
| `SMS_SIM_KEY` | relay | — | Separate key that unlocks the `/sms-sim` demo page itself in production (page 404s otherwise) and authenticates its POSTs via `X-Setu-Sim-Key`, without exposing the real `SMS_INBOUND_KEY` to a browser tab. Type it into the page's own "Simulator key" field — it's never embedded in the HTML. |
| `SMS_RATE_LIMIT` / `SMS_RATE_WINDOW_MS` | relay | `30` / `60000` | Max inbound SMS-webhook requests per client IP per window. |
| `TRUST_PROXY` | relay | — | Set to `1` only behind a reverse proxy you control that sets `X-Forwarded-For` (e.g. a self-managed nginx in front of the relay). Trusts the first hop of that header for rate-limiting and origin checks — never set this on an untrusted/public-facing proxy. |
| `WS_ALLOWED_ORIGINS` | relay | — | Comma-separated exact origins (e.g. `https://setu.example.com`) allowed to open `/ws`. Unset → same-host match, plus any private/LAN origin (needed for the cross-node QR handoff). Set this explicitly to lock a public relay down tighter. |
| `WS_MAX_PEERS` / `WS_MAX_PEERS_PER_IP` | relay | `5000` / `20` | Global and per-IP concurrent `/ws` connection caps. |
| `WS_MAX_MESSAGES` / `WS_MESSAGE_WINDOW_MS` | relay | `60` / `10000` | Per-connection message rate limit (protocol messages per window) before the socket is closed as a policy violation. |
| `METRICS_KEY` | relay | — | Unlocks `GET /metrics` (event count) via `X-Setu-Metrics-Key`. Unset → `/metrics` is disabled entirely; `/healthz` never leaks counts, only `{ ok }`. |
| `FLY_APP_NAME` | relay | set by Fly | Presence gates whether the `Fly-Client-Ip` header is trusted for rate-limiting/origin decisions — only Fly's own proxy sets it truthfully, so it's ignored anywhere else (Render, a bare VPS, local dev). |

## Demo / seed mode

Any URL with `?demo=1` (or the "Try the demo" button on first run) loads ~16
realistic sample events — mixed check-ins, help requests, a missing + a found
person, one ✓ verified bulletin, one ⚠ unverified rumor, and one 📟 SMS-sourced
check-in — entirely client-side, never pushed to a relay. It's what a
first-time, often anonymous, Facebook-referred visitor sees instead of an
empty board, and it's what `?demo=1` links in screenshots/video point at.

## Trust model & accepted risks

Setu optimizes for "works with no accounts, no server of record, during a
crisis" — that comes with tradeoffs worth stating explicitly rather than
leaving implicit:

- **Anyone can claim any display name.** There's no identity verification —
  a checked-in name is whatever the device typed in. This is by design (an
  account system is exactly the friction a crisis app can't afford), but it
  means the board is a self-reported roster, not a verified one.
- **`FIND <name>` (SMS) answers anyone who asks.** There's no pairing or
  consent step between the person who checked in and the person querying —
  matches the two-way SMS UX the feature is for, but means status lookup by
  name has no access control.
- **The device secret key lives unencrypted in IndexedDB.** Anyone with
  physical/debugger access to an unlocked device can extract it and sign as
  that identity. There's no passphrase/keychain wrapping today.
- **Demo-seed authors are publicly derivable** (`shared/src/demo.ts` — the
  seeds are `setu-demo-seed-v1:0..15`, deliberately not secret so the sync
  layer can recognize and exclude them). The relay rejects events from these
  authors outright (`EventStore.ingest`), so this can't be used to plant
  content on a real board; it only means "signed by a demo key" is not a
  meaningful trust signal on its own.
- **`react-router-dom` is pinned at `7.18.2`**, which carries one open high
  advisory ([GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2),
  an RSC-mode CSRF bypass). Setu doesn't use React Router's RSC/framework
  mode — this app is a client-only SPA (`BrowserRouter` + `Routes`/`Route`,
  no loaders/actions/server functions) — so the advisory's attack surface
  isn't present here. It isn't fixed by upgrading within v7 (every 7.12+
  release is in the vulnerable range) or by downgrading (versions below
  7.12 reintroduce several *worse*, since-patched issues, including an
  unauthenticated RCE via `turbo-stream` deserialization). The real fix is
  React Router v8, which drops the `react-router-dom` package entirely in
  favor of `react-router` + `react-router/dom` and requires React
  19.2.7+/Node 22.22+ — a deliberate, larger migration to take on
  separately, not a drive-by version bump.
- **`npm audit` shows the `brace-expansion` DoS advisory
  ([GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg))
  as still open on two dev-only nodes** (under `eslint`'s config resolver and,
  transitively, `vite-plugin-pwa`'s workbox build chain) even after patching.
  The advisory's tracked `first_patched_version` is `5.0.8`, but the older
  `minimatch` majors these tools pin (`3.x`, `5.x`) can't take a `brace-expansion`
  5.x without breaking — confirmed by trying it: forcing 5.x tree-wide made
  `eslint .` crash with `expand is not a function`, because the 5.x line
  changed its internal call signature. What actually shipped is a same-day
  backport: the maintainer patched `1.1.17` and `2.1.3` with the identical
  fix (`EXPANSION_MAX_LENGTH` bound + iterative rewrite, verified by diffing
  the packed tarballs) for exactly this compatibility reason. `overrides` in
  the root `package.json` pins the one node that doesn't self-resolve to a
  patched version (`minimatch@3.1.5`'s `brace-expansion` was stuck on
  `1.1.16`) up to `1.1.17`; the other node already resolves to `2.1.3` on its
  own. Both are patched in practice — `npm audit`'s advisory data just hasn't
  caught up to the backports — and the vulnerability itself (attacker-supplied
  glob input exhausting memory) has no reachable path here regardless: nothing
  in this repo runs `eslint` or `vite-plugin-pwa` against untrusted input.

## License

MIT — see [`LICENSE`](./LICENSE).
