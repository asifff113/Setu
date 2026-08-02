# Setu — Native Android "Field Edition" Specs (hand-off document)

Companion to `FEATURE_SPECS.md` (the PWA track). Read that file's **section 0
(context + invariants)** first — every invariant there applies here too. This
document covers the hybrid strategy: the PWA stays the universal front door
(URL, demo links, iOS); a **Capacitor-wrapped Android build of the same web
code** adds the radio features a browser cannot have.

Implement phases strictly in this order: **N0 → N1 → N2 → N4 → N9 → N5 → N7 →
N3 → N6 → N8**. Each phase has a gate; do not start the next phase until the
gate passes. N3 and N8 are experimental (they have explicit stop conditions);
N6 is restricted to the sideload build flavor.

**Priority note from the project owner:** the top product priority is offline
sharing that does NOT require two people to stand together aligning cameras
the way QR does — automatic discovery of other Setu users at radio range, then
transfer. **N2 (Nearby sync) is that feature, and N3 (background courier) is
its multiplier; N0 is their prerequisite.** If schedule pressure forces a cut,
N1 may be deferred until after N2 (they are independent) — nothing else about
the order may change.

---

## Architecture rule that governs everything: native code is a dumb pipe

All event handling stays in the web layer. Native (Kotlin) code moves **opaque
bytes** — it never creates, parses, signs, or verifies events. Every byte
array a native transport receives is handed to the web layer, which runs it
through the existing `decodeBundle` → `ingestEvents` path (signature
verification included). This keeps the crypto in exactly one implementation
and means a bug in native code can at worst lose data, never forge it.

Corollaries:

- The bundle format (`gzip(CBOR(SetuEvent[]))`, `app/src/lib/bundle.ts`) is
  the ONLY payload native transports carry. No new formats.
- Web ↔ native boundary carries base64 strings (Capacitor bridge limitation);
  size-check against `MAX_COMPRESSED_BUNDLE_BYTES` on the web side after
  decoding, same as every other transport.
- One shared web-side helper ingests bytes from any native source and shows
  the standard "N new, M known" result. If PWA Feature A (Web Share Target)
  is built first, reuse its helper; otherwise create
  `app/src/lib/ingestBundleBytes.ts` now and have Feature A adopt it later.

**API-accuracy rule for the implementer:** Kotlin sketches below are
structurally correct reference shapes, but you MUST verify exact signatures,
permission names, and Gradle coordinates against current official docs
(Capacitor docs, Android docs, Google Play services Nearby docs) before
writing code. Where this document says "verify", that is an instruction, not
a suggestion.

---

## Phase N0 — Capacitor wrapper: an APK with full feature parity

**Goal:** an installable APK that is functionally identical to the installed
PWA. No new features. This phase exists to surface WebView quirks before any
native code is written.

### Steps

1. **Dependencies** (in `app/`): `@capacitor/core` (dependency);
   `@capacitor/cli`, `@capacitor/android` (devDependencies). Then
   `@capacitor/share` and `@capacitor/filesystem` (dependencies, used in step
   5). Run `npx cap init` in `app/` — appId e.g. `org.setu.app` (pick once,
   it's permanent), appName `Setu`, webDir `dist`. Then `npx cap add android`
  — this creates `app/android/` (the Android Studio project; commit it).
2. **Native build mode for Vite.** The service worker/manifest machinery is
   for browsers; inside the WebView the assets are bundled locally, so disable
   it for native builds. In `app/vite.config.ts` switch to the function form
   `defineConfig(({ mode }) => ({ ... }))` and pass
   `disable: mode === 'native'` to the `VitePWA` plugin options. Add root
   scripts: `"build:native": "npm run build -w app -- --mode native"` and
   `"cap:sync": "npm run build:native && npx cap sync android"` (run from
   `app/` — adjust paths so both work; verify workspace flag plumbing on
   Windows).
3. **Platform detection helper** `app/src/lib/platform.ts`:
   `export const isNative = () => Capacitor.isNativePlatform();`
   (import from `@capacitor/core`). Import it lazily where used so the web
   bundle doesn't grow for browser users — `@capacitor/core` is small, but
   keep the pattern consistent with the app's lazy-loading convention.
4. **Permissions for existing features.** In
   `app/android/app/src/main/AndroidManifest.xml` add `CAMERA` and
   `RECORD_AUDIO` permissions (QR Beam scanning and Chirp use getUserMedia
   inside the WebView; Capacitor's WebChromeClient forwards the permission
   request when the app holds the Android permission — verify this works on a
   real device; if the in-WebView prompt never resolves, request the Android
   runtime permission from the plugin side before opening the scanner).
5. **Share export on native.** `navigator.share` does not exist inside
   Android WebView. In `SyncScreen.tsx`'s `handleExport`, branch on
   `isNative()`: write the bundle with `Filesystem.writeFile` (base64 data,
   `Directory.Cache`), get a shareable URI, and call the `@capacitor/share`
   plugin with the file (verify the current plugin's file-sharing option
   name/shape). The existing browser code path stays untouched.
6. **Relay URL.** In the browser the app dials `/ws` on its own origin; the
   native app has no meaningful origin. Read how `app/src/sync/wsurl.ts`
   resolves the socket URL, and on native default to the public relay URL
   (add a build-time constant or setting) while keeping the manual
   "connect to local node" flow working unchanged — that flow is MORE
   important on native (no mixed-content restriction in the WebView for
   `ws://` LAN nodes — verify; if the WebView does enforce it, document it).

### Gate N0 (all on a real Android phone, not an emulator)

- App installs, launches offline (airplane mode), onboards, checks in.
- QR Beam send AND scan work (camera permission flow included).
- Chirp send AND listen work (mic permission flow included).
- Relay sync works on Wi-Fi; local-node manual connect works on a hotspot.
- Export → share sheet → file arrives in another app (e.g. Files).
- Data survives app restart and phone reboot.
- `npm run build` (web) still passes and the browser PWA is byte-identical
  in behavior (the native mode must not leak into the default build).

---

## Phase N1 — Receive `.setu` files from the Android share sheet (native parity with PWA Feature A)

**Goal:** other apps (Bluetooth receive, Quick Share, WhatsApp, Files) can
share a `.setu` file **to** the Setu app.

### Steps

1. **Intent filter** on the main activity in `AndroidManifest.xml`:
   `ACTION_SEND` with `mimeType="application/octet-stream"` (and
   `ACTION_VIEW` with the same MIME as a secondary path). Accept that MIME
   matching is coarse — the ingest path safely rejects non-bundle bytes.
2. **Custom Capacitor plugin** `SharedBundlePlugin` (Kotlin, in
   `app/android/`): on activity `onCreate`/`onNewIntent`, if the intent
   matches, read the `content://` stream via `contentResolver`, cap the read
   at 2 MiB (`MAX_COMPRESSED_BUNDLE_BYTES` — hardcode the constant with a
   comment pointing at `bundle.ts`), hold the bytes in memory as a pending
   item. Expose one method `consumePending(): { data: string | null }`
   (base64) that returns-and-clears it. **Pull, not push:** the WebView may
   not be ready when the intent arrives, so JS asks on startup instead of the
   plugin firing an event into the void.
3. **Web side:** on app start (and on Capacitor `appStateChange` → active,
   verify event name), if `isNative()`, call `consumePending()`; on data:
   base64-decode → the shared ingest helper → navigate to `/connect` and show
   the standard result banner.
4. Register the plugin per current Capacitor docs (MainActivity
   registration), keep ProGuard/R8 from stripping it if minification is on.

### Gate N1

Two phones: A exports a bundle and sends it via **Bluetooth** and via
**Quick Share**; B (Setu native app installed) receives the file, opens the
share sheet on it, chooses Setu; Setu opens showing "N new, M known" — with
both phones in airplane mode (Bluetooth re-enabled manually) for the
Bluetooth leg. Also: sharing a random non-bundle file to Setu shows the
generic failure message and nothing is ingested.

---

## Phase N2 — "Nearby sync": user-initiated offline discovery + exchange (Nearby Connections)

**Goal:** the SHAREit-class experience. Two users open Sync → "Nearby", see
each other by name within seconds with zero internet, tap, and both boards
merge in both directions. This is the headline native feature.

### Design

- **API:** Google Play services **Nearby Connections**
  (`com.google.android.gms:play-services-nearby` — verify current version).
  Strategy `P2P_CLUSTER` (many-to-many, fits the courier model). Every device
  both advertises and discovers while the Nearby screen is open
  ("simultaneous advertise + discover" is the documented pattern for
  cluster topologies — verify current guidance).
- **Service ID:** the app's applicationId (`org.setu.app`). Endpoint name:
  the user's display name (it is already self-declared and public inside the
  app; no new privacy surface).
- **Payloads:** one whole bundle per direction. Bundles can reach 2 MiB —
  above the bytes-payload limit (~32 KB) — so use **stream payloads**
  (`Payload.fromStream`), reassembled to a byte array in Kotlin, delivered to
  JS as base64. (Verify the limit constant; if stream payloads prove awkward,
  chunked bytes payloads with a 4-byte sequence header are the fallback —
  pick ONE, don't build both.)
- **Protocol (keep it this dumb):** on connection established, each side
  immediately sends its full filtered bundle (`filterForBundle(..., 'all')`
  from the web layer), receives the peer's, ingests, disconnects. Union-by-id
  makes duplicate sends harmless. NO negotiation, NO delta protocol in v1.
- **Permissions:** Android 12+ needs `BLUETOOTH_ADVERTISE`,
  `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`; Android 13+ adds
  `NEARBY_WIFI_DEVICES`; pre-13 requires `ACCESS_FINE_LOCATION` for BLE scan.
  **This matrix changes across Android versions — verify against the current
  Nearby Connections permission documentation and implement their
  recommended runtime-request flow.** All requests happen when the user first
  opens the Nearby screen, with a plain-language rationale dialog (bilingual)
  BEFORE the system prompts.

### Plugin surface (`NearbySyncPlugin`)

- `start(options: { endpointName: string })` — begin advertising+discovery.
- `stop()` — stop both, disconnect all.
- `sendBundle(data: { base64: string })` — to all connected endpoints.
- Events to JS (Capacitor plugin events): `peerFound { id, name }`,
  `peerLost { id }`, `connected { id, name }`, `disconnected { id }`,
  `bundleReceived { base64 }`, `transferProgress { id, pct }` (from
  `onPayloadTransferUpdate`), `error { code, message }`.
- Kotlin skeleton (verify signatures): `Nearby.getConnectionsClient(context)`;
  `startAdvertising(name, SERVICE_ID, lifecycleCallback, AdvertisingOptions)`;
  `startDiscovery(SERVICE_ID, discoveryCallback, DiscoveryOptions)`;
  discovery `onEndpointFound` → `requestConnection(...)`;
  `onConnectionInitiated` → `acceptConnection(endpointId, payloadCallback)`
  (auto-accept: the payloads are signed events, the trust model does not
  depend on the pipe); `onConnectionResult` / `onDisconnected`;
  `PayloadCallback.onPayloadReceived` / `onPayloadTransferUpdate`.

### UI (web layer, `SyncScreen.tsx`)

New "Nearby" section, rendered only when `isNative()`. States: idle →
searching (spinner + "make sure the other phone also has Nearby open") →
peer list (name + connect state) → transferring (progress) → result banner
(standard N new / M known). Stop discovery automatically when the user
leaves the screen and on `pagehide` — radios must not run when the screen
is closed in this phase. All strings bilingual.

### Gate N2

- Two phones, **airplane mode, Bluetooth + location toggled on, no Wi-Fi
  network joined**: both open Nearby → discover each other by name in < 15 s
  → connect → a board with ~200 events + a few photo attachments (~1 MB
  total) merges both directions in < 60 s → both show correct counts.
- Three phones: A↔B sync, then B walks away and syncs with C; C ends up
  knowing A's events (courier hop verified end-to-end).
- Denying permissions shows the rationale + a graceful "Nearby unavailable"
  state, never a crash. Play-services-free devices (rare, but they exist)
  also get the graceful state (verify availability check API).

---

## Phase N4 — Distribution: the app that travels like its data

(Ordered before N3 because it is far easier and unblocks field trials.)

1. **Signed release APK pipeline.** Document keystore generation and signing
   in `app/android/README.md` (keystore NEVER committed); produce
   `setu-release.apk` via Gradle. Verify current Play requirements if/when
   publishing there (AAB for Play; APK for direct distribution — both from
   the same project).
2. **Relay serves the APK.** In `relay/`: serve a static
   `GET /setu.apk` (`Content-Type: application/vnd.android.package-archive`)
   from a configurable path (`APK_PATH` env var; route 404s when unset), and
   add a download link on the `/lite` page and the app's Share screen. Now a
   laptop node on a dead-internet hotspot can hand out the app itself, not
   just the data. This is the one permitted `relay/` change in this document.
3. **In-app "share this app".** On the native Share screen: a button that
   shares the app's own installed APK file (readable from
   `ApplicationInfo.sourceDir`; copy to cache dir first, then share via the
   share sheet — same plumbing as N0 step 5). Receiving phone sideloads it
   ("install unknown apps" consent is the user's, standard in this market).
   Include a short bilingual explainer of sideloading consent. (Split APKs /
   AABs installed from Play may have multiple splits — if `sourceDir` alone
   produces a broken install on a Play-installed build, scope this feature
   to the direct-APK build and document that.)

**Gate N4:** phone A (no internet) downloads the APK from a laptop node and
installs it; phone B shares the app to phone C via Quick Share and C installs
it; both new installs pass Gate N0's smoke checks.

---

## Phase N9 — Hub mode: the phone becomes the local node

**Goal:** everything the laptop node does today — serve the app and sync
bundles to any device on an internet-less Wi-Fi network — from any
field-edition phone. One volunteer's phone in a shelter becomes the hub that
PWA users, iPhones, laptops, and browser-only phones gather around. This is
the single highest-leverage two-edition synergy: it gives browser users a
way into the mesh without installing anything.

### Radio: two ways to stand up the network (build both, prefer the first)

1. **Wi-Fi Direct autonomous group:** `WifiP2pManager.createGroup()` creates
   a group instantly with this phone as group owner — no peer negotiation.
   On API 29+ pass a `WifiP2pConfig.Builder` with `setNetworkName()` /
   `setPassphrase()` to get a stable, recognizable SSID (prefix
   `DIRECT-SETU-`); below API 29 accept the auto-generated credentials from
   `requestGroupInfo()` (verify builder availability and the required
   `NEARBY_WIFI_DEVICES` / location permissions per API level). Crucially,
   ordinary devices join this group as a **normal WPA2 Wi-Fi network** —
   they need no Wi-Fi Direct support, no dialog on the hub side.
2. **Fallback:** `WifiManager.startLocalOnlyHotspot()` (API 26+) when Wi-Fi
   Direct is unavailable/broken on the device. Credentials are always
   auto-generated here (custom SSID/passphrase for LOHS is not available to
   normal apps — do not fight this).

Known field hazard (reported across OEMs): the Wi-Fi Direct stack can wedge
after repeated group create/teardown cycles. Auto-restart the group on
failure, and surface a "toggle Wi-Fi off/on" recovery hint if creation fails
twice.

### Joining UX

Show the credentials as a standard **Wi-Fi QR code** (`WIFI:T:WPA;S:<ssid>;
P:<pass>;;` — verify the exact format string): stock Android and iOS camera
apps parse this natively and offer to join, no Setu required. Below the QR,
show the hub URL to type/open once joined (`http://192.168.49.1:<port>` for
a Wi-Fi Direct group — verify the GO address at runtime instead of
hardcoding; LOHS uses a different subnet). Print-friendly variant optional.

### Server: bundles only, dumb pipe preserved

Embed a small Kotlin HTTP server (NanoHTTPD or Ktor's embedded engine —
pick ONE) in a foreground service, bound to the group-owner interface:

- `GET /` → the built PWA static assets, bundled into the APK (the same
  `dist` the WebView already ships — serve it, don't duplicate it).
- `GET /bundle.setu` → the hub's current full bundle (produced by the web
  layer via the existing `encodeBundle`; the plugin asks the web layer,
  never builds bundles natively).
- `POST /bundle` → accept an uploaded bundle (cap 2 MiB), hand bytes to the
  web layer for the normal verified ingest.
- A dead-simple `GET /sync` HTML page (part of the served PWA or a static
  page) with "Download board" / "Upload my events" buttons for browsers
  where the full PWA won't run.

This is explicitly NOT the relay's WebSocket protocol — no live push, no
reconciliation; visitors pull and push whole bundles. One honest limitation
to document in-app: pages served over plain `http://` get no service worker,
so browser visitors get a working *online-while-connected* app, not an
installed offline PWA — identical to the existing laptop-node limitation in
the root README.

### Discovery of hubs

- Hub advertises `_setu._tcp` via `NsdManager.registerService`; other
  field-edition phones browse for it when on any network.
- Field-edition phones may also surface `DIRECT-SETU-*` SSIDs from normal
  Wi-Fi scan results ("Setu hub nearby — join?") — respect Android's
  foreground scan throttling (verify current limits; do not poll).
- Everyone else: the QR / a paper poster.

### UX and safety rails

"Hub mode" toggle on the Sync screen (native only): foreground service with
persistent notification, connected-client count, bundles-served counter,
battery drain warning up front, auto-off option after N hours. All strings
bilingual.

### Gate N9

With zero internet anywhere: hub phone starts Hub mode → an Android phone
with only Chrome, an iPhone with Safari, and a laptop all join via the QR →
each loads the board over `http://`, downloads the current bundle, and
uploads its own events → hub board reflects them, and a fourth device
syncing with the hub afterward receives everything. Wi-Fi Direct path and
LOHS fallback both tested; stack-wedge recovery hint verified by forcing
repeated restarts. Measure and record battery drain per hour of hub mode.

---

## Phase N3 — EXPERIMENT: background courier sync

**Goal:** bundles exchange automatically when two Setu users pass each other,
app closed. This multiplies the courier model — and it is genuinely hard on
modern Android (Doze, background-location/BT policy, OEM task killers).
Timebox: if the spike below fails on 2 of 3 test devices, write up the
failure modes in this file and stop.

**Spike (no product UI):** a foreground service (persistent notification —
required for reliable radio use; verify the current foreground-service-type
declaration required for connected-device use) that runs a duty cycle:
every X minutes, advertise + discover for Y seconds (start with X=10, Y=30);
on peer found → connect → exchange bundles exactly as N2 → disconnect →
radios off. Measure over a full day on real phones: battery %/day, exchanges
missed vs. phones-actually-nearby. **Success criteria:** < 3%/day battery
and > 50% encounter capture with X=10/Y=30 on two mid-range devices.

**Adaptive duty cycle (tune inside the spike, don't hardcode):** scale X by
battery level via `BatteryManager` — e.g. >60%: X=10; 30–60%: X=20; 15–30%:
X=45; <15%: listen/advertise only, never initiate. Optionally elevate to
X=2–5 while the step detector (`Sensor.TYPE_STEP_DETECTOR`, batched) reports
sustained walking — a moving phone is an active courier, a stationary one
isn't. Both signals are cheap; both thresholds are spike parameters.

**Optional add-on experiment (only if the main spike passes, capability-
gated):** a BLE Coded PHY "lighthouse" — extended advertising of a tiny
presence digest (device id prefix + latest-event count, ≤ 200 bytes) on
long-range Coded PHY via `BluetoothLeAdvertiser.startAdvertisingSet()`,
gated on `BluetoothAdapter.isLeCodedPhySupported()` with silent fallback to
standard 1M PHY advertising. Honest expectations: Coded PHY can multiply
discovery range severalfold outdoors, but support is optional in BT 5.0 and
weak on budget chipsets, and BOTH ends need it — on a low-end fleet the
mutual-support probability is low. Measure real mutual-support rate across
the test-device matrix first; productize only if it clears ~25%.

**Only if the spike passes:** productize as an opt-in toggle on the Sync
screen ("Courier mode — exchanges news with Setu users you pass; uses more
battery"), with the notification showing last-exchange time, and a hard
kill-switch. Ingest still happens in the web layer: the service queues
received bundles to disk; the app ingests the queue on next open (the
service must NOT get its own crypto path — see the dumb-pipe rule).

---

## Phase N5 — Durable storage: automatic backup + restore of the event log and identity

**Goal:** "the log survives" becomes a guarantee, not a hope. WebView
IndexedDB lives in the app's private data directory and is not subject to
browser eviction heuristics, but it can still be lost to corruption, a WebView
data reset, or a bad app update. This phase adds an app-private backup that
survives all of those, plus restore. It also protects the Ed25519 identity
key — losing it silently orphans every event the user ever signed.

### Design decision (do not deviate)

Do NOT rewrite the Dexie/IndexedDB layer to native SQLite — that is a
high-risk migration for zero user-visible gain. Instead: periodic snapshot of
everything to app-private files via `@capacitor/filesystem`, restore on
empty database.

### Steps

1. **What gets backed up** (each as its own file under a `backup/` directory
   in `Directory.Data`):
   - The full event log as one or more bundle files (`backup-0001.setu`, …).
     `encodeBundle` caps at `MAX_BUNDLE_EVENTS` (5000) — chunk the log into
     ≤5000-event slices, newest first. Reuse `encodeBundle` unchanged.
   - The identity (read how `app/src/db/identity.ts` stores the keypair;
     serialize exactly that, as `identity.bin`). This file is as sensitive as
     the IndexedDB copy — same threat model (app-private storage, unreadable
     by other apps on an unrooted device). Do not upload it anywhere, do not
     include it in any share/export flow, never write it outside
     `Directory.Data`.
   - Settings worth keeping (`app/src/db/settings.ts` — name, area, language,
     onboarded flag) as `settings.json`.
2. **When:** on Capacitor `appStateChange` → background (verify event name),
   debounced so rapid foreground/background flips don't thrash, and at most
   once per N new events (start N=25) while in the foreground. Write to temp
   names, then rename over the old backup, so a mid-write kill never leaves a
   half backup as the only copy (verify Filesystem plugin rename support; if
   absent, write-new-then-delete-old with a completion marker file).
3. **Restore:** on startup, if the events table is empty AND the onboarded
   flag is unset AND a backup exists → show a bilingual prompt ("A backup
   from <date> exists on this phone — restore it?"). Restore order: identity
   first, then settings, then ingest every backup bundle through the normal
   `ingestEvents` path (signatures re-verified — a corrupted backup degrades
   to partial restore, never to garbage in the log).
4. **Surface it:** one line in the storage screen ("Last backup: <time> —
   automatic") with i18n keys. No manual backup button in v1 — automatic or
   it doesn't exist.

### Gate N5

Populate ~300 events on a device → background the app → verify backup files
exist and have plausible sizes → clear the app's WebView data (or reinstall
the APK, which preserves nothing — use `adb shell pm clear` semantics
carefully; document the exact test procedure that clears IndexedDB but not
`Directory.Data`... if no such procedure exists on the test device, test
restore by copying the backup directory off-device and back) → relaunch →
restore prompt appears → accept → same event count, same identity (author id
unchanged — verify by checking a previously authored event still shows as
"you"). Unit-test the chunking logic (5001 events → 2 files, newest-first).

---

## Phase N7 — Offline alert notifications (local, no Firebase)

**Goal:** the phone taps its owner on the shoulder when something that
matters arrives over ANY transport — including Nearby sync and (later)
background courier exchanges. This is deliberately LOCAL notifications on
ingest, not push: it works with zero internet and adds no Firebase/FCM
dependency, no server coupling, and nothing to the trust model. (Revisit real
push only if a product need appears that WS-relay delivery doesn't cover.)

### Steps

1. First read `app/src/lib/notifications.ts` — the web app already has a
   notifications concept. Extend it behind one interface with two backends:
   the existing web path, and `@capacitor/local-notifications` on native
   (Android 13+ needs the `POST_NOTIFICATIONS` runtime permission — request
   it on first relevant settings opt-in, not at app start; verify plugin
   permission API).
2. **What notifies (exactly these, all opt-in via settings toggles):**
   - A help/need event ingested for the user's own area (match the settings
     geohash the way the board's area filter does — read
     `app/src/lib/area.ts` / `geo.ts` first).
   - Any event authored by a circle member (read `app/src/db/social.ts` for
     how circle membership is stored).
   - A missing-person/found event naming the user's area.
3. **Where the hook lives:** one place — immediately after a successful
   `ingestEvents` with `added > 0`, in shared code, so every transport
   (relay, Nearby, share-receive, QR, chirp, courier queue) triggers it
   identically. Do not sprinkle per-transport notification calls.
4. Batch: one summary notification per ingest ("3 new help requests in your
   area"), not one per event. Tapping opens the board filtered accordingly
   (deep link via the existing routes). Bilingual strings.

### Gate N7

With the app closed: phone receives a bundle via Nearby sync (N2) containing
a help event in the user's area → notification appears → tap opens the board
showing it. Toggles genuinely suppress. No notification for events outside
area/circle. Web build behavior unchanged.

---

## Phase N6 — Phone-as-SMS-gateway (sideload "field" flavor ONLY)

**Goal:** any volunteer's Android phone becomes the bridge between
feature-phone users and the network — replacing the separate
android-sms-gateway app in the current architecture.

### Policy reality (this shapes the whole phase)

Google Play policy restricts `RECEIVE_SMS`/`SEND_SMS` to default-SMS-handler
apps plus narrow exceptions; assume the Play build CANNOT ship this. Create
two Android **product flavors**: `play` and `field`. The SMS permissions and
all gateway code exist ONLY in the `field` flavor's manifest and source set —
the `play` flavor must not even declare the permissions. The `field` APK is
what the relay serves (Phase N4). Verify current Play policy before ever
merging any of this into the `play` flavor.

### Architecture (reuse the relay, don't reimplement it)

The relay already parses the SMS grammar, attests events with its own
signature, and serves replies. The phone gateway is a dumb forwarder — it
does NOT parse SAFE/HELP grammar and does NOT create events:

1. **Inbound (v1 — build this first):** a `RECEIVE_SMS` BroadcastReceiver
   captures sender + body and POSTs to the relay's existing
   `POST /api/sms/inbound`. Read `relay/src/` to find the two accepted JSON
   shapes (android-sms-gateway and httpSMS) and send one of them verbatim,
   with the `SMS_INBOUND_KEY` the volunteer enters in a new gateway settings
   panel (stored app-private). Offline queue: undeliverable messages persist
   and retry with backoff whenever any relay/node connection exists.
2. **Outbound (v2 — only after v1 is field-tested):** the relay currently
   pushes outbound replies to a `GATEWAY_URL` webhook, which a phone can't
   receive. Add ONE relay feature (explicitly permitted here): an
   authenticated pull endpoint (e.g. `GET /api/sms/outbound` returning and
   marking a batch of queued replies; auth via the same key). The phone polls
   while its gateway toggle is on (foreground service, same
   notification/UX rules as N3) and sends via `SmsManager` (verify current
   API + per-app send rate limits; respect them with a queue).
3. **UX:** a "Gateway mode" panel (field flavor only): relay URL, key, on/off
   toggle, counters (forwarded / queued / failed), and a bilingual plain-text
   explanation that the phone will forward strangers' texts and (v2) send
   replies that cost SMS credit from the volunteer's SIM.

### Gate N6

v1: text `SAFE Rahim Dhanmondi` from a feature phone to the gateway phone's
number → event appears on every synced Setu board, attributed as an SMS
check-in exactly as it would via the existing gateway app; kill the
gateway phone's data connection mid-test → the message queues and delivers
when connectivity returns. The `play` flavor APK contains zero SMS
permissions (verify by inspecting the built manifest with `aapt`).

---

## Phase N8 — EXPERIMENT: LoRa bridge (Meshtastic) for kilometer-range offline text

**Goal:** two clusters of people a few km apart, no infrastructure at all —
check-ins hop between them over cheap LoRa radios. This is the only
technology in either document that truly solves "far away AND offline."

**Preconditions (hard):** at least two Meshtastic-compatible boards in hand
(e.g. Heltec or RAK dev boards — a device choice is a purchasing decision,
not a spec decision), and a licensing check: Meshtastic firmware and protobuf
definitions are GPL-licensed — before writing any code, verify what an
MIT-licensed app may link/embed, and if the answer is unfavorable, isolate
the bridge in a separate GPL-compatible module or stop. Do not skip this.

**Spike (timeboxed, throwaway branch):**

1. Native BLE **central** connection from the field-flavor app to the
   Meshtastic node (the node is a BLE peripheral — this is ordinary,
   supported BLE). Implement the minimum of Meshtastic's client protocol
   (ToRadio/FromRadio protobufs over the documented BLE service — verify
   against current Meshtastic docs) to send/receive a broadcast text or data
   payload on a dedicated channel.
2. **Payload = the existing Chirp frame** (`app/src/sync/chirp/` packs one
   signed event into ~110–140 bytes — read that codec and reuse it byte-for-
   byte). It fits Meshtastic's per-packet payload budget (~230 bytes —
   verify). One event per packet, no fragmentation in the spike.
3. Receive side: frame → same verified single-event ingest the chirp
   receiver uses. A forged or garbled radio frame fails signature
   verification and is dropped — nothing about LoRa changes the trust model.
4. **Success criteria:** a check-in published on phone A (bridged to node A)
   appears on phone B's board (bridged to node B) at ≥1 km separation,
   outdoors, no other infrastructure. Log delivery rate over 50 sends.

If the spike passes, productize later as its own document (channel/config
UX, duty-cycle compliance for the Bangladesh ISM band — verify local
regulations, multi-event queueing). If it fails, record why here and stop.

---

## What stays out of scope even now — and why (do not "helpfully" add these)

- **BLE mesh multi-hop routing** (Bridgefy/bitchat-style live relaying).
  Real-time mesh needs user density that cannot be assumed during rollout,
  and a routing protocol is research-grade work. The courier model (N2/N3)
  IS multi-hop — hops happen over minutes as people move, instead of
  milliseconds — and LoRa (N8) covers the long-range case with hardware
  that actually has the range. Revisit only with field evidence that
  delay-tolerant hops are insufficient.
- **iOS build.** Possible via the same Capacitor project, and
  MultipeerConnectivity would be the N2 equivalent — but no sideloading, App
  Store review latency, and heavily restricted background Bluetooth make it
  a poor fit for the field edition. Revisit after N2+N4 ship, as its own
  document, if iOS demand materializes. iOS users keep the PWA.
- **Phone-to-phone NFC via Host Card Emulation.** Technically real, but
  strictly worse than N2 at the same distance. Not worth the surface area.
- **Wi-Fi Aware (NAN) as a transport.** Real API (`WifiAwareManager`,
  Android 8+), but hardware support requires vendor HAL/firmware that budget
  MediaTek/Unisoc devices routinely omit — exactly the fleet this app
  targets — and Nearby Connections already covers the practical
  discovery+transfer path. Gate-check is one `hasSystemFeature` call; a
  parallel NAN transport is not worth building. Revisit only with field
  data showing meaningful NAN prevalence in the target device pool.
- **Wi-Fi probe-request / beacon-frame steganography.** Requires
  root/NDK-level frame access; Android 10+ MAC randomization and IE
  restrictions defeat it. Not buildable as an app.
- **Bluetooth SIG Mesh.** There is no public Android application API for it
  (a claimed "`BluetoothMeshManager`" does not exist in the SDK — treat any
  source asserting it as unreliable).
- **FM/RDS data broadcast.** No public Android SDK API for RDS data;
  device- and antenna-dependent. Not buildable.
- **Firebase/FCM push.** N7's local notifications cover the offline cases;
  WS delivery covers the online case. Adding a Google service dependency to
  a crisis app that must work without Google reachability is backwards.
- **Any change to event formats, crypto, or the RelayWS protocol** (N6's
  single pull endpoint on the relay is the one sanctioned relay change).

## Suggested PR breakdown

| PR | Content | Gate |
|---|---|---|
| 1 | N0 wrapper + parity fixes | Gate N0 |
| 2 | N1 share-receive plugin | Gate N1 |
| 3 | N2 Nearby sync (plugin + UI) | Gate N2 |
| 4 | N4 distribution (relay APK route, share-the-app) | Gate N4 |
| 5 | N9 Hub mode (Wi-Fi Direct group / LOHS + embedded HTTP server) | Gate N9 |
| 6 | N5 backup + restore | Gate N5 |
| 7 | N7 offline alert notifications | Gate N7 |
| 8 | N3 courier spike incl. adaptive duty cycle (branch; merge only on success) | spike criteria |
| 9 | N6 SMS gateway v1, field flavor (then v2 with relay pull endpoint) | Gate N6 |
| 10 | N8 LoRa spike (branch; merge only on success) | spike criteria |
