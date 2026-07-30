/**
 * GET /lite — a server-rendered, zero-JavaScript, read-only board. The last
 * rung of the transport ladder: it must render in Opera Mini's extreme/proxy
 * mode and 2G-era browsers, so no scripts, tiny inline CSS, a <meta refresh>
 * instead of live updates, and a payload well under 20 KB.
 *
 * Content is derived from the same shared view functions the app uses, over the
 * relay's live event cache, grouped by area.
 */
import {
  bulletinEvents,
  findAreaByGh,
  isPinnedPublisher,
  latestPersonEvents,
  latestStatusEvents,
  shortAgo,
  type SetuEvent,
  type SetuEventView,
} from '@setu/shared';
import { escapeHtml } from './html.js';
import type { EventStore } from './store.js';

/** "বাংলা (English)" for a known area, else a generic unknown-area label. */
function areaLabel(gh: string): string {
  const area = findAreaByGh(gh);
  if (area) return `${area.bn} (${area.name})`;
  return gh ? 'অজানা এলাকা / Unknown area' : 'এলাকা অজানা / No area';
}

/** Group events by their area label, areas ordered by descending event count. */
function groupByArea(events: readonly SetuEvent[]): Array<[string, SetuEvent[]]> {
  const byArea = new Map<string, SetuEvent[]>();
  for (const e of events) {
    const label = areaLabel(e.gh);
    const list = byArea.get(label);
    if (list) list.push(e);
    else byArea.set(label, [e]);
  }
  return [...byArea.entries()].sort((a, b) => b[1].length - a[1].length);
}

function badge(e: SetuEvent): string {
  return e.src === 'sms' ? ' <span class="b sms">📟 SMS</span>' : '';
}

function statusRow(e: SetuEvent): string {
  const name = escapeHtml(e.n ?? 'Anonymous');
  const ago = escapeHtml(shortAgo(nowSeconds() - e.ts));
  const view = e as SetuEventView;
  const activity = `${view.replies ? ` <span class="b">💬 ${view.replies}</span>` : ''}${
    view.responders ? ` <span class="b">${view.responders} responding</span>` : ''
  }${view.resolved ? ' <span class="b ok">✓ Resolved</span>' : ''}`;
  if (e.st === 'offer') {
    const cat = e.cat ? ` · ${escapeHtml(e.cat)}` : '';
    const msg = e.msg ? ` — ${escapeHtml(e.msg)}` : '';
    return `<li><span class="s safe">🤝 সহায়তার প্রস্তাব / OFFER</span> <b>${name}</b>${cat}${badge(e)} ${activity}<span class="t">${ago}</span>${msg}</li>`;
  }
  if (e.t === 'help' || e.st === 'need') {
    const cat = e.cat ? ` · ${escapeHtml(e.cat)}` : '';
    const msg = e.msg ? ` — ${escapeHtml(e.msg)}` : '';
    return `<li><span class="s need">🆘 সাহায্য দরকার / NEEDS HELP</span> <b>${name}</b>${cat}${badge(e)} ${activity}<span class="t">${ago}</span>${msg}</li>`;
  }
  return `<li><span class="s safe">✅ নিরাপদ / SAFE</span> <b>${name}</b>${badge(e)} <span class="t">${ago}</span></li>`;
}

function personRow(e: SetuEvent): string {
  const name = escapeHtml(e.pn ?? '—');
  const ago = escapeHtml(shortAgo(nowSeconds() - e.ts));
  const found = e.pst === 'found' || e.pst === 'seen';
  const label = found ? '🟢 পাওয়া গেছে / FOUND' : '🔴 নিখোঁজ / MISSING';
  return `<li><span class="s ${found ? 'safe' : 'need'}">${label}</span> <b>${name}</b>${badge(e)} <span class="t">${ago}</span></li>`;
}

function bulletinRow(e: SetuEvent): string {
  const verified = isPinnedPublisher(e.au);
  const mark = verified
    ? '<span class="b ok">✓ যাচাইকৃত / Verified</span>'
    : '<span class="b warn">⚠ অযাচাইকৃত / Unverified</span>';
  const ago = escapeHtml(shortAgo(nowSeconds() - e.ts));
  return `<li>${mark} ${escapeHtml(e.msg ?? '')} <span class="t">${ago}</span></li>`;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Render one "grouped by area" section, or nothing if there are no events. */
function section(title: string, events: SetuEvent[], row: (e: SetuEvent) => string): string {
  if (events.length === 0) return '';
  const groups = groupByArea(events)
    .map(
      ([label, list]) =>
        `<div class="area"><h3>${escapeHtml(label)}</h3><ul>${list.map(row).join('')}</ul></div>`,
    )
    .join('');
  return `<section><h2>${escapeHtml(title)} <span class="n">${events.length}</span></h2>${groups}</section>`;
}

/** Full HTML document for GET /lite. */
export function litePage(store: EventStore): string {
  const now = nowSeconds();
  const events = store.allLive(now);
  const people = latestStatusEvents(events);
  const persons = latestPersonEvents(events);
  const bulletins = bulletinEvents(events);

  const body =
    people.length + persons.length + bulletins.length === 0
      ? '<p class="empty">এখনো কোনো তথ্য নেই। / No reports yet.</p>'
      : section('মানুষ / People', people, statusRow) +
        section('নিখোঁজ / Missing & Found', persons, personRow) +
        section('ঘোষণা / Bulletins', bulletins, bulletinRow);

  const updated = new Date(now * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  // Inline CSS kept tiny and high-contrast; dark theme reads in sunlight.
  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="60">
<title>Setu · Lite board</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:14px;background:#121212;color:#f5f5f5;font-family:system-ui,"Segoe UI",Roboto,sans-serif;line-height:1.45;font-size:15px}
header{border-bottom:2px solid #e5322d;padding-bottom:8px;margin-bottom:12px}
h1{margin:0;font-size:20px}
h1 span{color:#e5322d}
.sub{color:#9a9a9a;font-size:12px;margin-top:2px}
section{margin:0 0 18px}
h2{font-size:16px;margin:14px 0 6px;border-bottom:1px solid #333;padding-bottom:3px}
h2 .n{color:#9a9a9a;font-size:12px;font-weight:400}
.area{margin:6px 0 10px}
h3{font-size:13px;margin:8px 0 4px;color:#cfcfcf}
ul{list-style:none;margin:0;padding:0}
li{padding:6px 8px;margin:4px 0;background:#1d1d1f;border-radius:8px;font-size:14px}
.s{font-weight:700;font-size:12px;display:inline-block}
.safe{color:#38b000}
.need{color:#e5322d}
.t{color:#8a8a8a;font-size:12px}
.b{font-size:11px;padding:1px 5px;border-radius:5px;background:#2a2a2c}
.b.ok{color:#38b000}
.b.warn{color:#e0a800}
.b.sms{color:#7fb3ff}
.empty{color:#9a9a9a;text-align:center;padding:40px 0}
footer{color:#7a7a7a;font-size:11px;border-top:1px solid #333;padding-top:8px;margin-top:16px}
footer code{background:#1d1d1f;padding:1px 4px;border-radius:4px}
</style>
</head>
<body>
<header>
<h1><span>সেতু</span> · Lite board</h1>
<div class="sub">যাচাইহীন হালকা পাতা · auto-refresh 60s · updated ${escapeHtml(updated)} · ${events.length} live events</div>
</header>
${body}
<footer>
No internet? SMS <code>SAFE YourName Area</code> to the gateway number. This page needs no JavaScript and refreshes every 60s.
</footer>
</body>
</html>`;
}
