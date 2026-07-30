# Setu — Product Improvement Plan

A prioritized, architecture-aware feature and UX plan. Each item is written as a
mini-spec so it can be handed to an implementing model/developer as-is. Tiers at
the bottom give the build order.

**How to read this:** Setu is not a normal social app — events are immutable,
Ed25519-signed, TTL'd (72h default), tiny (they must survive QR/chirp/SMS), and
sync is union-by-id with no server of record and no accounts. So classic social
features must be *re-shaped* into this model:

| Social-app concept | Setu-shaped equivalent |
| --- | --- |
| Edit a post | Publish a newer event; views show latest-per-author (already how check-ins work) |
| Delete a message | Publish a signed **retraction** event referencing the old id (tombstone) |
| Reply / comment / chat | New event carrying a **reference** (`re`) to a parent event id |
| Mark help "done" | An **ack** event referencing the help event |
| Send a photo | Event carries a **blob hash**; the bytes travel separately, fetched lazily (Telegram-style) |
| Group chat | Area-scoped channel events (everyone in a district), not member lists |
| Friends list | Locally stored public keys exchanged via QR ("My Circle") — no server involved |

This is exactly how comparable systems do it: Secure Scuttlebutt layers deletion
and threads on top of append-only signed feeds and keeps attachments as
hash-referenced blobs fetched on demand; Google Person Finder's PFIF attaches
"note" records to person records for status updates; Ushahidi triages reports
through status workflows.

---

## 1. The keystone change: reference events (`re` field)

**One schema change unlocks replies, group threads, mark-as-done, and delete.**
Do this first; almost everything else builds on it.

### Schema

```ts
// shared/src/types.ts
export type SetuEventType = 'checkin' | 'help' | 'bulletin' | 'person'
  | 'reply'    // threaded comment under any event
  | 'ack'      // structured response: I'm on it / done / confirmed sighting
  | 'retract'; // author deletes their own earlier event

export type SetuAckKind = 'onit' | 'done' | 'seen';

export type SetuEvent = {
  // ...existing fields...
  re?: string;       // id of the referenced (parent) event — required for reply/ack/retract
  ak?: SetuAckKind;  // ack events only
};
```

Codec rules (mirror the strictness of the existing per-type checks in
`shared/src/codec.ts`):

- `reply`: requires `re` and `msg` (≤ 280 chars); `n` optional; no `st/cat/pn/pst`.
- `ack`: requires `re` and `ak`; optional short `msg`.
  - `ak:'done'` on a help event = resolved. Valid from the help event's own
    author (self-resolve) **or** any other author (a helper marks it done —
    render differently: "marked done by [name]" vs "resolved").
  - `ak:'onit'` = "I'm responding to this" (see §7 Offers/Responders).
  - `ak:'seen'` on a `person` event = a sighting confirmation (PFIF-note style).
- `retract`: requires `re`; **valid only when `au` matches the referenced
  event's author** — enforce at view level and at relay ingest (the relay may
  hold the parent; if the parent is unknown, hold the retract and apply lazily).

### View layer (`shared/src/views.ts`)

- `threadFor(events, id)` → replies + acks sorted by `ts`.
- `latestStatusEvents` / `latestPersonEvents` / `bulletinEvents`: exclude any
  event that has a valid retract; annotate help events with
  `{ resolved: boolean, responders: number }` derived from acks.
- Reply/ack/retract events never appear as top-level cards, only inside threads
  and badges.

### UI

- Tapping any Board card opens a **detail sheet**: full event, area, time, map
  chip if `loc` present, then the thread (replies + acks), then a reply box.
- On someone else's help card: buttons **"I'm on this"** (`ack onit`) and
  **"Mark done"** (`ack done`, with an "are you sure — only if this need is
  actually met" confirm).
- On your own cards: **"Resolved ✓"** and **"Delete"** (`retract`, with copy
  that is honest: "This removes it from boards. Devices that already synced it
  may keep a copy until it expires.").
- Resolved help cards: move under a collapsed "Resolved" divider in the Help
  tab (green check, struck summary) instead of vanishing — visible closure is
  motivating and prevents duplicate rescue effort.
- Card badges: 💬 reply count, "2 responding" chip, ✓ Resolved chip.

### Lifecycle rules

- A reply/ack/retract inherits relevance from its parent: drop it from views
  when the parent has expired (its own TTL can just be the default 72h).
- SMS grammar additions (relay `sms.ts`): `DONE <name>` → relay finds that
  author's latest open help event and emits an attested `ack done`. Keep
  parity with the existing `SAFE`/`HELP`/`FOUND` verbs.
- **Rollout order matters:** the codec rejects unknown types, so ship
  shared+relay first, then the app. Old app versions simply won't see threads
  (safe degradation — never a crash).
- Anti-abuse: cap replies per author per parent (e.g. 20), rate-limit `chat`
  and `reply` server-side like SMS; local **mute author** action in the detail
  sheet (stores `au` in a local blocklist, filters views client-side).

**Why this shape:** append-only logs can't hard-delete (Scuttlebutt documents
deletion as "a layer on top… using delta encoding" — i.e. tombstones), and
attaching updates as child records to a parent is precisely PFIF's
person/note design, proven across disaster deployments.

---

## 2. Onboarding & guidance revamp (the "confusing for new users" fix)

Crisis-UX research is unanimous: users arrive stressed, with reduced cognitive
capacity, possibly low digital literacy — the app must teach itself in seconds,
visually, not through text walls.

1. **Three-slide visual explainer before the settings form** (skippable, shown
   once). Slide 1: "Press SAFE so family knows" (big green button illustration).
   Slide 2: "Ask for help — rescuers see it on the board and map." Slide 3:
   "Works with NO internet — phones share by QR, sound, and SMS." Use simple
   SVG illustrations + the existing i18n dict; auto-advance optional. Keep
   the existing **Try the demo** button on every slide — it's the best teacher
   you have.
2. **Coach marks (first-visit hints):** one dismissible tooltip per screen,
   stored in settings (`hintsSeen: string[]`). Board: "Cards appear here from
   every phone this device has ever synced with." Sync: "No internet? Two
   phones can trade news with QR codes." Map: "Only events with a shared
   location appear here."
3. **Teaching empty states.** Every empty tab currently shows one grey line.
   Replace with icon + one-line explanation + an action: e.g. empty Board →
   "No one nearby yet. Bring neighbors on:" + **Share Setu** button (see §10)
   + **Load demo** link. An empty state is your best onboarding real estate.
4. **De-jargon the chrome.** "Sync" → "Connect" (tab icon: link/people, not
   arrows). The connectivity pill becomes tappable → a plain-language sheet:
   "🟢 Connected to the internet relay — news reaches everyone" / "🟡 Local
   hotspot only — news reaches phones on this Wi-Fi" / "⚪ Offline — your
   updates are saved and will send automatically." Never make users decode an
   emoji dot.
5. **Restructure Info into a Guide.** Accordion FAQ ("Does it work without
   internet?", "Who can see my name?", "How do I delete something?", "What do
   ✓ and ⚠ badges mean?"), an illustrated transport ladder (icons per rung),
   and the SMS card grammar with a **"Send this by SMS" share button** per
   command so users can forward instructions to feature-phone relatives.
6. **Post-onboarding home nudge:** until first check-in, show a soft banner
   "Tap SAFE once so your family can find you here — you can update anytime."

---

## 3. Area channels — the group-chat interface that fits

Setu has no accounts, so "create a group, invite members" (Briar-style private
groups) doesn't fit v1. What fits perfectly: **one open channel per district**
(and one per locality once set) — like a neighborhood walkie-talkie.

- New event type `chat`: requires `gh` and `msg` (≤ 280); `n` optional;
  **TTL 24h** (chatter must decay faster than safety data); relay + local-node
  + file-bundle transports only — excluded from QR beam and chirp budgets.
- UI: new **Chat tab** (or a segment on Board): channel = your area name,
  messages grouped by author with timestamps, newest at bottom, standard
  composer. Show day dividers and an "older messages expire automatically ⏳"
  header — impermanence is a feature; say it.
- Threads from §1 already give you *topic-scoped* group discussion under any
  help request / bulletin / missing-person card — that covers the most
  important "group coordination" use case (talking about *a specific need*)
  with zero extra schema.
- Rate limits: reuse the relay's existing WS message-rate machinery; cap chat
  events per author per window; local mute applies.
- Later (Tier 3): private groups via a shared symmetric key distributed by QR
  (the "group QR" is scanned in person, messages encrypted with it — offline
  key exchange like your circle QRs; Briar's model is the reference).

---

## 4. Photos & voice notes — Telegram-style lazy blobs

Exactly the model you described: media is **referenced, not embedded** — the
event stays tiny and syncs everywhere; the bytes are fetched on demand only by
devices that want them (Scuttlebutt's blob design; Telegram's tap-to-download).

### Blob layer

- Event gains an attachment field:
  `att?: { h: string; k: 'img' | 'aud'; sz: number; w?: number; hh?: string }`
  — `h` = base64url sha256 of the bytes, `sz` bytes, `w`×aspect for layout,
  `hh` = BlurHash (~30 chars) so cards can show a soft placeholder with zero
  network. Allowed on `help`, `person`, `bulletin`, `reply`.
- Client pipeline on attach: downscale to ≤ 1280px, re-encode WebP quality
  ~70, hard cap **150 KB** (re-encoding also strips EXIF/GPS — important:
  never leak location via photo metadata). Voice notes: Opus/WebM, ≤ 30s,
  ≤ 100 KB.
- Relay: `PUT /api/blob/:hash` (verify hash server-side, size cap, rate
  limit), `GET /api/blob/:hash`, SQLite or disk-backed, GC when no live event
  references the hash (blobs die with their event's TTL).
- App: IndexedDB blob cache; **placeholder → tap to download → cached**, with
  a Settings toggle "Auto-download photos when connected" (default off — data
  is precious in a disaster). Show `sz` on the placeholder ("📷 84 KB").
- Transport honesty: blobs move over relay/local-node HTTP only. A card whose
  blob isn't fetchable (offline, QR-synced event) keeps the BlurHash + "photo
  unavailable offline" — never a broken image.

### Why each media type matters

- **Photo on a missing-person report** is the single highest-value attachment
  in any disaster (every person-finder system supports it).
- **Photo on a help request**: "this is the collapsed wall / water level."
- **Voice note** is the low-literacy answer — many users who can't
  comfortably type Bangla under stress can speak. Same blob layer, trivial
  recorder UI, and it composes with §3 chat.

---

## 5. My Circle — family & friends without accounts

The #1 question in any crisis is "is MY family ok?" — today Setu answers "is
everyone ok?". Close that gap with zero infrastructure:

- **Add person to Circle:** in peacetime, two phones scan each other's QR
  (already have QR plumbing) exchanging `{ au, name }`. Stored locally only —
  no event, no server, no consent problem beyond the in-person scan itself.
- **Circle strip on Home:** avatar chips, green/red/grey per member's latest
  status, "last heard 2h ago via SMS". Tap → their thread/history.
- **Alerts:** when sync ingests a circle member's event → local notification
  ("Rahim checked in SAFE ✅"). This plus §8 notifications is the emotional
  core of the product.
- **Watch anyone:** a ☆ on any board card adds that author (or person-name for
  `person` events) to a watchlist with the same alerting — the in-app
  equivalent of the SMS `FIND` verb's "tell me when you know something".
- Board gains a **Circle filter chip** next to All / My area.

---

## 6. Offers & responder flow — close the loop

Today the board collects needs; nobody can announce capacity. Add the supply
side (Ushahidi deployments live on this):

- Allow `st: 'offer'` on `help` events, same categories: "Offering: shelter
  for 5 people", "Offering: boat, Feni". New **Offers** tab or chip on Board.
- Detail sheet on a need shows nearby matching offers ("2 shelter offers
  within your area") and vice versa — dumb `gh`-prefix + category matching is
  enough; no routing engine needed.
- `ack onit` from §1 shows "N responding" on need cards — prevents ten boats
  rowing to the same roof, the classic disaster-coordination failure.
- **Responder mode toggle** (Settings): sorts the Help tab by distance from
  your location, shows distance + compass bearing per card ("1.2 km NE"),
  larger tap targets. Purely a client-side lens over existing data.
- SMS: `OFFER <CAT> <name> [area] [- note]` verb for feature phones.

---

## 7. History & "done" lifecycle for your own items

Your "mark done → stored or deleted" idea, completed by the TTL system:

- **My History screen** (from Info/profile): every event you authored —
  including expired ones (they're already local; just stop hiding your own
  expired events locally) — with status: active ⏳ / resolved ✓ / retracted 🗑 /
  expired. Actions: re-publish ("bump" an unanswered help request as a fresh
  event), resolve, delete.
- Auto-expiry surfaced honestly everywhere: "Everything on Setu fades away
  after 72h by itself" is a *privacy feature* — say it in onboarding and the
  Guide. Resolved-then-expired items simply disappear from all boards; your
  own device keeps your history unless you clear it.

---

## 8. Notifications & freshness

- **Unread badges:** store `lastSeenTs` per Board tab; show count bubbles on
  the tab bar for new events since last visit (numbers only, no red hysteria
  for bulletins vs help — tune per tab).
- **Local notifications** (no infra): after each sync batch, if it contains a
  circle/watchlist event, a reply/ack to one of *your* events, or a verified
  bulletin for your area → `Notification` API (with permission prompt at a
  sensible moment: right after the user first checks in, not at first launch).
- **Web Push via relay** (Tier 3): relay stores push subscriptions keyed by
  area + author; pushes on matching ingests. Works only while the relay is
  reachable, but that's exactly when push matters (phone in pocket, app
  closed).
- **PWA manifest shortcuts:** long-press app icon → "I'm SAFE" / "Request
  help" jumping straight to those actions. Cheap, and it's the fastest path
  from panic to action.

---

## 9. Map & board upgrades

- **Offline map fallback:** Leaflet tiles need internet — on tile failure,
  render a bundled Bangladesh districts GeoJSON as a labeled choropleth
  (needs-count per district) so the Map tab is *never* a grey void offline.
  Bundled GeoJSON is ~100–200 KB simplified; precache with Workbox.
- Marker clustering at low zoom; color by category; tap → same detail sheet
  as Board (§1).
- **Needs layer toggle:** pins / district heat.
- **Aging & urgency on cards:** helps older than 12h get an "⏰ waiting 14h"
  amber chip; `med`/`rescue` sort above `other` within same recency. Aging
  unanswered needs are the ones that kill.
- Sort control (newest / oldest-unresolved / nearest) and a pull-to-refresh
  that triggers a sync round.
- Bulletins: severity field (`info | warning | danger`) rendered as border
  color; verified (✓) bulletins pin above unverified rumors.

---

## 10. Distribution & shelter tools

- **Share Setu screen:** big QR of the app URL + native `navigator.share`
  button + one-liner "Installs from the browser, then works with no internet."
  Reachable from empty states (§2) and the Guide. Every installed phone is
  new mesh coverage — make spreading the app a first-class feature.
- **Kiosk mode** (`/board?kiosk=1` or extend `/lite`): fullscreen auto-cycling
  board (People ↔ Help ↔ Missing) with huge type, for a laptop/TV at a shelter
  or relief camp — the relay already serves the app; this is a display mode,
  not new infrastructure.
- `/lite` gets the same resolved/thread annotations so feature-phone browsing
  stays in parity.

---

## 11. Preparedness content (works when nothing else does)

Ship a static, precached, bilingual **Emergency Guide** section: Bangladesh
emergency numbers (999, health 16263), flood/cyclone do's-and-don'ts, basic
first aid (bleeding, drowning, fractures), water purification, and a family
plan checklist. Pure static content + Workbox = works in airplane mode forever.
Highest value-per-effort item in this document, and it gives the app a reason
to exist on the phone *before* a crisis (which is when installation must
happen — you can't download an app when the network is down).

---

## 12. UI/UX polish pass

- **Dark mode** (media-query + manual toggle; near-black surfaces for OLED
  battery savings — battery is life during a disaster; you already have a
  token-based palette, so this is mostly CSS variables).
- **Battery-saver mode:** one toggle that = dark + no shadows/blur + reduced
  sync frequency + map tiles off.
- **Large-text mode** and a contrast audit (muted-on-surface combos are
  borderline in sunlight); respect `prefers-reduced-motion`.
- Haptics (`navigator.vibrate`) on SAFE/HELP confirm; skeleton cards while
  IndexedDB hydrates; toast → snackbar with undo for destructive actions.
- iOS install guidance (Safari has no install prompt — show the Share →
  "Add to Home Screen" walkthrough when `navigator.standalone` is false on
  iOS).
- Accessibility: every icon button gets an aria-label; detail sheet focus
  trap; check-in buttons announce success to screen readers.

---

## Build order

### Tier 1 — highest value, fits current architecture, no new infra
1. §1 Reference events (`re` + reply/ack/retract) — the keystone.
2. §2 Onboarding revamp + de-jargon + teaching empty states.
3. §7 History screen + resolved lifecycle UI.
4. §9 Board aging/urgency/sort + detail sheet.
5. §11 Preparedness content.
6. §10 Share-Setu screen.
7. §12 Dark mode + shortcuts + haptics.

### Tier 2 — new subsystems, still relay-compatible
8. §4 Blob layer: photos on person/help/bulletin, lazy download, then voice notes.
9. §5 My Circle + watchlist + local notifications (§8).
10. §3 Area chat channel.
11. §6 Offers + responder mode; SMS `DONE`/`OFFER` verbs.
12. §9 Offline map fallback + clustering.

### Tier 3 — bigger bets
13. Web Push via relay; §10 kiosk mode.
14. Encrypted DMs / private groups (QR-exchanged keys).
15. Coordinator dashboard on the relay (needs-by-category/area over time, CSV
    export — Ushahidi-style analytics for NGOs).
16. IVR/USSD exploration for non-SMS feature-phone access.

### Cross-cutting rules for the implementer
- **Ship order for schema changes:** shared → relay → app (codec rejects
  unknown event types; old clients must degrade silently, never crash).
- Every new event type gets: codec validation as strict as the existing four,
  a TTL policy, a transport policy (may it ride QR/chirp/SMS?), a rate limit,
  and a views.ts function — no exceptions.
- Every new feature must answer: *what does it look like fully offline?* If
  the answer is "broken", it needs a placeholder state (see blobs, map).
- Bangla is the primary language — every new string lands in `i18n/dict.ts`
  in both languages in the same PR.
