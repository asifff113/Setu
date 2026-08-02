# Setu — Offline-Sharing Feature Specs (hand-off document)

This document is written for an AI coding assistant (or a developer) implementing
features in this repo. Read this entire preamble before touching code. Implement
features in the order listed. Each feature is independent unless noted.

---

## 0. Context you must internalize first

**What Setu is:** an offline-first crisis-communication PWA (React + TypeScript +
Vite + vite-plugin-pwa) for Bangladesh, bilingual Bangla/English. People check in
as SAFE / NEEDS HELP; every event is an immutable CBOR record signed with a
per-device Ed25519 key; syncing two devices is union-by-id; forged events fail
signature verification and are dropped.

**Repo layout:** npm workspaces — `app/` (the PWA), `relay/` (Node/Hono sync
server, also serves the built app), `shared/` (types, crypto, codec). You will
work almost entirely in `app/`. Do not modify `relay/` or `shared/` unless a
feature explicitly says so.

**Existing transports (do not rebuild these):** cloud relay WebSocket; laptop
"local node" on a hotspot; QR Beam (animated fountain-coded QR bundles,
`app/src/sync/beam/`); audio Chirp via ggwave (`app/src/sync/chirp/`); SMS
gateway on the relay; `.setu` file export/import (`app/src/screens/SyncScreen.tsx`).

**Non-negotiable invariants:**

1. **Every inbound event goes through `ingestEvents`** (`app/src/db/events.ts`).
   Never store decoded events directly. Never trust decoded bytes.
2. **Bundles** are `gzip(CBOR(SetuEvent[]))` via `encodeBundle`/`decodeBundle` in
   `app/src/lib/bundle.ts`. Respect `MAX_COMPRESSED_BUNDLE_BYTES` and
   `MAX_BUNDLE_EVENTS`. Do not invent a new payload format when a bundle fits.
3. **All user-facing text is bilingual.** Every new string gets a key in
   `app/src/i18n/dict.ts` with both `en` and `bn` values, used via the `t()`
   hook (`useI18n`). Follow the existing tone. Write real Bangla, not
   transliteration; leave a `TODO(bn-review)` comment on any translation you are
   unsure of.
4. **Screens are lazy-loaded** (see `app/src/App.tsx`). New heavy code follows
   the same `lazy(() => import(...))` pattern so it stays a separate chunk.
   vite-plugin-pwa precaches all built chunks, so this stays offline-safe.
5. **The app must work fully offline** after install. Nothing you add may fetch
   from the network at runtime (no CDN scripts, no remote assets).
6. **Feature-detect every capability API** (`navigator.share`, `NDEFReader`,
   `navigator.storage.persist`, Web Bluetooth). Missing API → hide the UI for
   it or show a short "not supported on this device" note. Never crash.

**Definition of done, for every feature:** `npm test`, `npm run lint`, and
`npm run build` all pass from the repo root; the offline check in the root
README ("Verifying offline caching") still passes; new logic that can be unit
tested has a vitest test next to it (see `app/src/lib/bundle.roundtrip.test.ts`
for the style).

**Do NOT, in any feature below:** add runtime dependencies not listed in the
feature; change the sync protocol in `app/src/sync/RelayWS.ts`; touch the
crypto in `shared/`; introduce accounts, analytics, or any tracking; attempt
phone-to-phone Web Bluetooth (the API is central-only — a browser cannot
advertise as a peripheral; two PWAs can never discover each other over BLE;
any such attempt is wasted work).

---

## Feature A — Web Share Target: receive `.setu` bundles from the Android share sheet

**Priority: highest. Effort: large (the only large one — mostly a service-worker
strategy migration).**

### Why

Export already hands a `.setu` file to `navigator.share()` (see
`handleExport` in `app/src/screens/SyncScreen.tsx`), so Android users can
already push bundles over Bluetooth, Quick Share, WhatsApp, etc. — all of which
work offline or near-offline. But the receiver currently has to manually open
Setu → Sync → Import → find the file. This feature makes Setu appear **in the
receiver's share sheet**: they tap the received file → Share → Setu → events
auto-ingest. This completes an offline phone-to-phone transfer loop using the
OS's own radios, with zero radio code.

### Platform reality (accept this; do not fight it)

- Works: Chrome/Chromium on Android, for the **installed** PWA.
- Does not work: iOS Safari (no Web Share Target support), desktop Firefox.
  The feature must degrade invisibly — no broken UI on unsupported platforms.

### Step 1 — migrate vite-plugin-pwa from `generateSW` to `injectManifest`

The current config (`app/vite.config.ts`) uses the default `generateSW`
strategy, which cannot host a custom fetch handler — and receiving a share
POST requires one. Migrate carefully; this is the risky step.

1. Add dev dependencies to `app/package.json`: `workbox-core`,
   `workbox-precaching`, `workbox-routing`, `workbox-strategies`,
   `workbox-expiration`, `workbox-cacheable-response`. (They are bundled into
   the SW at build time; devDependencies is correct.)
2. Create `app/src/sw.ts` that reproduces the current generated behavior
   **exactly**, plus the share handler:

```ts
/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// registerType: 'autoUpdate' equivalent — new SW takes over immediately.
self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback with the same relay-owned-route denylist as before
// (see the comment in vite.config.ts for why each entry exists).
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/lite/, /^\/sms-sim/, /^\/node-qr/, /^\/api\//, /^\/healthz/, /^\/ws/],
  }),
);

// OSM tile cache, identical to the old runtimeCaching entry.
registerRoute(
  ({ url }) => /^([abc])\.tile\.openstreetmap\.org$/.test(url.hostname),
  new CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Web Share Target: the OS POSTs the shared file here. Stash it in Cache
// Storage (the page and SW share it; no IndexedDB needed in the SW), then
// redirect to the Sync screen which ingests it.
const SHARE_INBOX = 'share-inbox';
const SHARE_KEY = '/share-inbox/bundle';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-receive') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get('bundle');
          if (file instanceof File) {
            const cache = await caches.open(SHARE_INBOX);
            await cache.put(SHARE_KEY, new Response(await file.arrayBuffer()));
          }
        } catch {
          // Fall through: the page will find no stashed bundle and show nothing.
        }
        return Response.redirect('/connect?shared=1', 303);
      })(),
    );
  }
});
```

3. In `app/vite.config.ts`, change the `VitePWA` options:
   - add `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'`;
   - **remove** the whole `workbox: { ... }` block (its behavior now lives in
     `sw.ts`) and instead set
     `injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] }`;
   - change `devOptions` to `{ enabled: true, type: 'module' }` (injectManifest
     dev SW is an ES module);
   - keep `registerType: 'autoUpdate'`, `manifest`, and everything else as-is.
   Registration is injected by the plugin into `index.html` (there is no manual
   `registerSW` call in `app/src` — do not add one).
4. Add to the `manifest` object:

```ts
share_target: {
  action: '/share-receive',
  method: 'POST',
  enctype: 'multipart/form-data',
  params: {
    files: [{ name: 'bundle', accept: ['application/octet-stream', '.setu'] }],
  },
},
```

   If the plugin's `ManifestOptions` type rejects `share_target`, cast that one
   property (`share_target: { ... } as unknown as undefined` is NOT acceptable —
   instead type the manifest object as
   `Partial<ManifestOptions> & { share_target: ... }` or use a targeted
   `// @ts-expect-error` with a comment). Verify the key appears in the built
   `app/dist/manifest.webmanifest`.

**Migration acceptance (before writing any receive UI):** build + serve
(`npm run node:local`), confirm in DevTools → Application that the SW activates,
the app loads offline (airplane-mode reload), `/lite` still reaches the relay
(not the SPA shell), and map tiles cache after visiting the Map screen. If any
of these regress, stop and fix before continuing.

### Step 2 — ingest the stashed bundle on the Sync screen

In `app/src/screens/SyncScreen.tsx` (or a small helper in `app/src/lib/` so it
is unit-testable), on mount:

1. If `location.search` contains `shared=1`: strip the param with
   `history.replaceState` (mirror the `?demo=1` pattern in `app/src/App.tsx`).
2. Open cache `share-inbox`, `match('/share-inbox/bundle')`. Nothing there →
   done, silently.
3. Found → `arrayBuffer()` → `Uint8Array` → enforce
   `MAX_COMPRESSED_BUNDLE_BYTES` → `decodeBundle` → `ingestEvents` → delete the
   cache entry (always delete, even on failure, so a poisoned file cannot wedge
   the screen) → refresh events/stats (see `handleImport` for the exact calls)
   → show the existing `fileMsg` banner with added/known counts.
4. Failures use the existing `syncFileFailed` string. Add one new i18n key,
   e.g. `syncSharedReceived` — "Received via share" / Bangla equivalent — used
   as the success prefix.

Note: run the ingest even if the check happens while another screen is mounted?
No — keep it simple: the SW always redirects to `/connect?shared=1`, so the
Sync screen is guaranteed to be the landing page. Do not add global listeners.

### Step 3 — tests + manual verification

- Unit test the helper (bundle bytes in → ingest result out) with the fake
  cache trick: inject the byte-source as a parameter rather than reading
  `caches` directly, so the test passes a `Uint8Array` and the screen passes a
  cache reader. (Vitest has no Cache Storage.)
- Manual, two Android phones, required before calling this done: install the
  PWA on both from an HTTPS deploy → phone A: Sync → Export → share via
  **Quick Share** (and once via Bluetooth) → phone B receives the file → Share
  → Setu appears in the sheet → tap → Setu opens on Sync with "Received via
  share — N new, M known". Repeat in airplane mode on both phones.

---

## Feature B — Name the offline share path in the UI ("Send via Bluetooth / Quick Share")

**Priority: high. Effort: small. Depends on: nothing (ship before A if convenient).**

Today the offline-capable share path is an unlabeled side effect of the export
button. Make it discoverable:

1. In the file-transfer section of `SyncScreen.tsx`, under the existing export
   button, add a one-line hint (muted text style, like other helper copy):
   *"The share sheet can send this with no internet — choose Bluetooth or
   Quick Share on the other phone's Android."* (+ Bangla).
2. Rename nothing; do not change `handleExport` logic.
3. In `app/src/screens/ManualScreen.tsx`, add a short section "Sending the
   board without internet" (follow the existing section component pattern in
   that file): three numbered steps — export, pick Bluetooth/Quick Share,
   receiver opens the file in Setu (wording updated by Feature A when it
   lands: "…or shares the file to Setu").
4. New i18n keys for every string, en + bn.

Acceptance: strings render in both languages (toggle via the existing language
switch), lint/tests/build pass. No logic changes.

---

## Feature C — Courier-model explainer ("news travels with people")

**Priority: high. Effort: small. Depends on: nothing.**

Setu's architecture already makes every user a data courier (bundles carry
*everyone's* events; merging is union-by-id), but nothing tells users this, so
they don't exploit it. Pure content feature:

1. New Manual section, e.g. **"Your phone carries the news"**: explain in plain
   language (both languages) that syncing with anyone — QR Beam, chirp, file
   share — exchanges *the whole board, both directions*, so walking between two
   neighborhoods and syncing in each moves everyone's status with you; you do
   not need internet or a direct meeting between the two people. One concrete
   example (A beams to B in the morning; B beams to C across the river in the
   evening; C now knows A is safe). Encourage the habit: "sync with anyone you
   pass."
2. One-line reinforcement on the Sync screen near the Beam/file section
   (muted helper text): *"Every sync carries everyone's updates — you are the
   network."* (+ Bangla).
3. Use the existing `CoachMark` component (`app/src/components/CoachMark.tsx`)
   only if a `courier` coach-mark id fits its existing pattern; otherwise plain
   text. Do not build new components.

Acceptance: content renders both languages; no logic changes; build green.

---

## Feature D — Printable "poster QR" (offline dead-drop for shelter walls)

**Priority: medium. Effort: medium. Depends on: nothing (reuses bundle + QR infra).**

A static, printable QR poster containing a small filtered bundle (one area, last
24 h). Tape it to a shelter wall / relief desk; anyone scans it with Setu and
ingests the events. The laptop running the local node can print it.

### Build

1. **Payload format:** `SETU1:` + base64 of the `encodeBundle` bytes (standard
   `btoa` over the binary string, or a tiny local helper; no new deps — the
   `qrcode` package is already a dependency). The prefix is the discriminator
   scanners use. Document the format in a comment in `bundle.ts`.
2. **Capacity:** a QR at error-correction level `L` holds ~2,950 bytes of text.
   Budget: total payload ≤ 2,900 chars ⇒ compressed bundle ≤ ~2,100 bytes.
   Selection: start from the newest events matching the filter, drop oldest one
   at a time, re-encode until it fits (encode is cheap at these sizes; a simple
   loop is fine). Show "N events on this poster."
3. **UI:** new section on `SyncScreen` — "Poster" — with the existing
   `EXPORT_FILTERS` choices (reuse `filterForBundle`; default to the area
   filter), a preview of the QR (`qrcode`'s `toDataURL`, `errorCorrectionLevel:
   'L'`, rendered ≥ 512 px), event count, generated-at timestamp, and a Print
   button calling `window.print()`.
4. **Print CSS:** an `@media print` stylesheet that hides the app chrome and
   shows only the poster block: app name (সেতু Setu), area label, "Scan with
   Setu → Sync → Scan" instruction in both languages, the QR, timestamp. Use a
   dedicated wrapper class (e.g. `poster-print`); simplest reliable pattern is
   `@media print { body > #root > * { display: none } .poster-print { display:
   block } }` — verify in Chrome's print preview.
5. **Scanning side:** the Sync screen already has a QR scan flow
   (`QrScanner`, used for node URLs — read how `CircleScreen.tsx` `accept()`
   and the node-QR path branch on content first). Extend that branch: scanned
   text starting with `SETU1:` → base64-decode → `decodeBundle` →
   `ingestEvents` → show added/known counts via the existing message pattern
   (reuse `beamNew` / `beamKnown` strings). Malformed base64 or a failing
   decode → existing generic scan-failure message. **All events still pass
   signature verification in `ingestEvents` — a tampered poster yields zero
   ingested events, which is the correct outcome.**
6. i18n keys for all new strings, en + bn.

### Acceptance

- Unit tests: payload encode/decode roundtrip (`SETU1:` prefix, base64,
  `decodeBundle`), and the fits-in-budget trimming loop (feed it >50 events,
  assert output ≤ 2,900 chars and newest-first retention).
- Manual: generate poster on a laptop → print preview shows only the poster →
  scan the on-screen QR with a phone's Setu → events ingest with correct
  counts. Then scan the same QR twice → second scan reports all-known, no
  duplicates.

---

## Feature E — Request persistent storage (protect the event log from eviction)

**Priority: high (it is nearly free). Effort: trivial. Depends on: nothing.**

Browsers may evict IndexedDB under storage pressure — fatal for an app whose
value is "the log survives." `navigator.storage.persist()` asks the browser to
exempt the origin.

1. After onboarding completes (find where `settings.onboarded` flips in
   `app/src/store/appStore.ts` / the onboarding flow), call
   `navigator.storage?.persist?.()` once; ignore rejection; store nothing.
   Installed PWAs are typically granted silently — there is no prompt to design
   for.
2. In `MediaStorageScreen.tsx` (which already shows storage stats), read
   `navigator.storage?.persisted?.()` and show one status line:
   "Storage: protected" vs "Storage: best-effort (browser may reclaim it)" —
   two new i18n keys, en + bn.
3. Feature-detect: no `navigator.storage` → show nothing.

Acceptance: on Chrome Android (installed PWA), the screen shows "protected";
in a desktop incognito window it shows "best-effort"; no console errors on
browsers without the API.

---

## Feature F — NFC tag writer for the local-node URL (optional; Chrome-on-Android only)

**Priority: low / optional. Effort: small. Depends on: nothing.**

Rationale: Web NFC **cannot** do phone-to-phone (Android Beam is dead; the API
reads/writes passive NDEF tags only). The one crisis-useful application: a
volunteer writes the local node's URL to cheap NTAG stickers stuck at a shelter
entrance. Any Android phone that taps one opens the hotspot URL in the browser
— **the reader needs no app installed**, because URL NDEF records are handled
by the OS natively. That bootstraps brand-new users onto an offline node.

1. In the local-node section of `SyncScreen.tsx`, when connected to a node AND
   `'NDEFReader' in window`: show "Write node address to NFC tag" button.
2. On tap (user gesture is required by the API):
   `await new NDEFReader().write({ records: [{ recordType: 'url', data: nodeHttpUrl }] })`
   — where `nodeHttpUrl` is the node's `http://…:8787` page URL (derive from the
   stored `nodeUrl` the same way the QR/manual-connect flow does — read
   `app/src/sync/wsurl.ts` first). Show "hold a tag to the phone…" while the
   promise is pending, success/failure message after. Wrap in try/catch; the
   promise rejects if the user moves the phone away.
3. Hide the button entirely when unsupported (all iOS, desktop, Firefox).
4. i18n keys en + bn.

Acceptance: manual only (needs a physical NTAG sticker + Android phone):
write succeeds; tapping the tag with a *different* phone (no Setu installed)
opens the node URL. Everything else: button simply absent on unsupported
platforms, lint/build green.

---

## Feature G — EXPERIMENT: phone↔phone sync over one phone's hotspot via WebRTC (no laptop)

**Priority: experimental — attempt only after A–F are merged. Effort: large.
Timebox it; if the spike fails, write up why and stop.**

Goal: two phones, one hotspot (created by either phone), zero internet, no
laptop — full two-way bundle sync at Wi-Fi speed. This removes the laptop from
the local-node story. It is genuinely uncertain (that's why it's an
experiment): WebRTC on an internet-less LAN should work with host/mDNS
candidates, but must be proven on real phones before any UI investment.

**Spike first (throwaway page, no Setu integration):** phone A creates a
hotspot; both phones open the installed PWA (HTTPS-cached, so secure context
holds in airplane mode); create an `RTCPeerConnection` with **no STUN/TURN
servers**; exchange offer/answer out-of-band by displaying gzip+base64 SDP as
QR codes and scanning them (A shows offer QR → B scans, B shows answer QR → A
scans — SDP compresses to roughly 1–2 QR codes' worth; if it exceeds one QR,
split across two static QRs shown sequentially, `SETURTC1:1/2:` prefixes);
open an `RTCDataChannel`; send 1 MB of random bytes; measure. **Success
criteria: transfer completes on two real Android phones in airplane mode +
hotspot.** If ICE never connects without internet, document the failure mode
and abandon.

**Only if the spike succeeds:** integrate as a "Direct" mode on the Sync
screen — after the channel opens, run the simplest possible reconciliation:
each side sends its full filtered bundle (`encodeBundle` → chunk at 16 KB —
data channels fragment poorly above ~64 KB — reassemble → `decodeBundle` →
`ingestEvents`). Do NOT reuse or modify the RelayWS protocol. Show
added/known counts both sides.

---

## Feature H — Panic mode: icon-first, one-hand, no-typing status screen

**Priority: high. Effort: small-medium. Depends on: nothing.**

For a user who is wet, scared, holding a child, or cannot read comfortably.
The app already has quick actions on Home and manifest shortcuts
(`/?action=safe`, `/?action=help`); this feature gives them a dedicated
full-screen surface built for panic, not browsing.

1. New lazy route `/panic`, reachable from a persistent, high-contrast button
   on `HomeScreen` (and add a third manifest shortcut). No tab-bar entry.
2. The screen shows at most three giant buttons (min 30% of screen height
   each, high contrast, icon + one word in the active language): **SAFE**,
   **NEED HELP**, **MISSING PERSON**. NEED HELP expands to the existing help
   categories (MED/RESCUE/FOOD/WATER/SHELTER) as icon tiles — read how the
   existing check-in/help flows create events and reuse those paths exactly;
   the display name and area come from settings, so no typing is required.
3. Every button uses **hold-to-confirm** (~1.2 s with a visible fill ring) to
   prevent pocket triggers, and fires the Vibration API on confirm
   (`navigator.vibrate` — real on Android Chrome; silently absent on iOS,
   feature-detect). Success state is a full-screen color flash + giant ✓,
   not a toast.
4. Icons: use the existing app iconography; where new pictograms are needed,
   prefer the UN OCHA humanitarian icon set (openly licensed — verify the
   current license file before vendoring). No text-only buttons.
5. All strings bilingual; respect the existing `largeText` and
   `batterySaver` settings.

Acceptance: from a cold app open, a SAFE check-in in ≤ 2 taps + one hold,
with zero keyboard appearances; each event lands on the Board identically to
one created through the normal flow.

---

## Feature I — Guest identity ("borrowed phone" mode)

**Priority: medium-high. Effort: medium. Depends on: nothing.**

Phones are shared in this market. Today a borrower's check-in is signed by —
and displayed as — the owner. Fix that without accounts:

1. Read `app/src/db/identity.ts` and the stores first: the app assumes a
   single identity — audit every place the UI derives "you" (own-event
   badges, own check-in state) before touching anything.
2. Add a second stored identity slot: "Lend this phone" (entry point on the
   More/Info screen) generates a fresh Ed25519 keypair + display name +
   area for the guest, switches the active signing identity, and shows a
   persistent banner ("Guest: <name> — tap to switch back") on every screen
   while active.
3. Guest events are ordinary signed events — they sync and remain valid
   forever. Switching back does not delete anything. A guest identity older
   than 72 h is auto-archived: no longer selectable, its events untouched.
4. v1 is identity separation ONLY: no PIN, no encryption of the local event
   view (the board is public-by-design; the thing being protected is
   attribution, not reading). Do not build a profile system.

Acceptance: guest checks in → board shows the guest's name; owner switches
back and checks in → both events coexist with distinct authors; a synced
second device sees both correctly; unit test that the active-identity
switch changes the signing key used by event creation.

---

## Feature J — Link Beam: one signed event as a URL (works over SMS and any messenger)

**Priority: medium-high. Effort: medium. Depends on: nothing (Feature K builds on it).**

Carry one signed event inside a URL, so any channel that moves short text —
SMS, WhatsApp, a messenger app, a QR — becomes a Setu transport with real
end-to-end signature verification (unlike the SMS-grammar path, which is
relay-attested).

1. **Payload:** the existing single-event Chirp frame codec
   (`app/src/sync/chirp/` — reuse byte-for-byte), base64url-encoded, in the
   URL **fragment**: `https://<deploy-origin>/b#<payload>`. Fragments are
   never sent to any server, and ~110–140 frame bytes ≈ 150–190 chars —
   fits in 1–2 concatenated SMS.
2. **Send:** "Share as link" action beside the existing Chirp/Beam senders:
   builds the URL for the user's latest check-in and hands it to
   `navigator.share` (text) with an `sms:` fallback link.
3. **Receive:** add a `/b` SPA route. On mount, read `location.hash`,
   base64url-decode, run the frame through the same verified single-event
   ingest the Chirp receiver uses, show the standard result, then navigate
   to the board. Because the installed PWA serves navigations from cache
   (`navigateFallback`), **this works fully offline on a phone that has
   Setu installed** — tapping the link in an SMS opens the cached app and
   ingests locally. A phone without Setu gets the normal online page (or
   nothing when offline — acceptable).
4. Tampered/garbled payloads fail signature verification and show the
   generic failure message. Verify long-URL linkification in the stock
   Android Messages app; if fragments get mangled anywhere, document it.

Acceptance: airplane-mode phone with the installed PWA taps a link
received earlier → event ingested offline; corrupted payload rejected;
round-trip unit test frame → URL → frame.

---

## Feature K — Low-battery lifeboat (hand off your status before the phone dies)

**Priority: medium. Effort: small. Depends on: Feature J.**

1. Feature-detect `navigator.getBattery()` (real on Android Chrome; absent
   elsewhere — silently skip). When level drops below 10% (and once more
   below 5%), show a one-time dismissible prompt: *"Battery critical — hand
   your status to a nearby phone now."*
2. The prompt opens a screen showing the user's latest check-in as a **QR
   code containing the Feature J URL** (one code path, no new format) plus
   a share button for the same link. Any phone's stock camera can scan it —
   a Setu-installed phone opens straight into offline ingest; others open
   the web page.
3. Max-brightness hint text, giant QR, nothing else on screen.

Acceptance: threshold prompt fires once per level; scanning the QR with a
second phone's stock camera ingests the event; no crash on browsers
without the Battery API.

---

## Feature L — Loudspeaker broadcast preset for Chirp

**Priority: medium. Effort: trivial. Depends on: nothing.**

Village PA systems and mosque loudspeakers keep working on generators when
everything else is down; a chirp played through one becomes a one-to-many
broadcast to every listening phone in acoustic range. The transport already
exists — this is a preset plus instructions:

1. In `ChirpSender`, add a "📢 Loudspeaker broadcast" mode: forces the most
   robust ggwave protocol variant already exposed by the "More reliable"
   option, loops continuously, and shows on-screen instructions (hold the
   phone to the PA microphone; announce first that people should open
   Setu → Sync → Chirp → Listen).
2. New Manual section describing the whole ritual, both languages, including
   the honest caveat: heavy rain/wind/generator noise can defeat it.

Acceptance: preset transmits and is decoded by a listening phone across a
quiet room via an external speaker; Manual section renders in both
languages.

---

## Suggested implementation order

| Order | Feature | Size | One-line goal |
|---|---|---|---|
| 1 | E | trivial | Persistent-storage request |
| 2 | B | small | Label the Bluetooth/Quick Share path |
| 3 | C | small | Courier-model explainer |
| 4 | L | trivial | Loudspeaker chirp preset |
| 5 | H | small-med | Panic mode screen |
| 6 | A | large | Web Share Target receive (SW migration) |
| 7 | D | medium | Printable poster QR |
| 8 | J | medium | Link Beam (event-in-URL) |
| 9 | K | small | Low-battery lifeboat (needs J) |
| 10 | I | medium | Guest identity |
| 11 | F | small | NFC tag writer (optional) |
| 12 | G | large | WebRTC hotspot experiment (timeboxed) |

Ship 1–5 in small PRs (1–3 may share one); A, D, J, and I each get their own
PR; K rides with or after J; F and G are separate and skippable.

## Evaluated and rejected — do not re-propose these

Ideas from external brainstorms that were checked and rejected; kept here so
future contributors (human or AI) don't re-litigate them:

- **Wi-Fi probe-request / beacon steganography** — Android 10+ MAC
  randomization and IE restrictions kill it without root.
- **FM/RDS data broadcast** — no public Android SDK API for RDS data;
  wired-headphone antenna requirement; not buildable.
- **Camera-to-camera color-grid codes** — large effort for marginal gain
  over the existing fountain-coded QR Beam.
- **Bloom-filter "blinded" missing-person matching** — the privacy claim is
  weak (phone numbers/NIDs are a small, guessable space — a Bloom filter of
  them can be brute-forced offline), and the "route the answer back" step
  assumes a routing layer Setu deliberately doesn't have.
- **PWA pre-caches and shares the APK via Web Share** — Chrome's Web Share
  file-type allowlist does not include `.apk` (verify, but expect
  rejection); APK distribution lives in the native track (Phase N4).
- **File System Access API directory auto-sync on phones** —
  `showDirectoryPicker()` is desktop-only; not available on Android Chrome.
- **Volunteer task board / multi-signer event co-signing** — genuinely good
  ideas, but both require evolving the signed event schema in `shared/`,
  which is a deliberate design exercise, not a lower-model feature PR.
  Parked, not rejected on merit.

## Explicitly out of scope for this pass

- Anything native (Capacitor wrapper, Nearby Connections, BLE mesh, SMS
  permissions). That track has its own hand-off document —
  `NATIVE_ANDROID_SPECS.md` — implemented after (or in parallel with, by a
  separate agent) the features above.
- LoRa / Meshtastic bridge (needs hardware in hand first).
- Any change to the relay's sync protocol or the event/crypto formats in
  `shared/`.
- Phone-to-phone Web Bluetooth — impossible in a browser; see invariants.
