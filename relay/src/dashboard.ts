import {
  findAreaByGh,
  latestStatusEvents,
  type SetuCategory,
  type SetuEvent,
} from '@setu/shared';
import { escapeHtml } from './html.js';

const CATEGORIES: SetuCategory[] = ['med', 'rescue', 'food', 'water', 'shelter', 'other'];

function areaName(gh: string): string {
  const area = findAreaByGh(gh);
  return area ? `${area.name} / ${area.bn}` : 'Unknown area';
}

export function dashboardPage(events: SetuEvent[]): string {
  const statuses = latestStatusEvents(events);
  const needs = statuses.filter((event) => event.t === 'help' && event.st === 'need');
  const offers = statuses.filter((event) => event.t === 'help' && event.st === 'offer');
  const open = needs.filter((event) => !event.resolved);
  const resolved = needs.filter((event) => event.resolved);
  const areas = new Map<string, number>();
  for (const event of open) areas.set(event.gh, (areas.get(event.gh) ?? 0) + 1);
  const areaRows = [...areas.entries()].sort((a, b) => b[1] - a[1]);
  const categoryRows = CATEGORIES.map((category) => ({
    category,
    count: open.filter((event) => event.cat === category).length,
  })).filter((row) => row.count > 0);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Setu coordinator dashboard</title><style>
body{font-family:system-ui,sans-serif;margin:0;background:#f4f7f9;color:#142129}main{max-width:960px;margin:auto;padding:28px}
h1{margin:0 0 4px}.sub{color:#596870}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}
.card,section{background:#fff;border:1px solid #d8e1e6;border-radius:16px;padding:18px}.n{font-size:32px;font-weight:750}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px;border-bottom:1px solid #eaf0f3}
a{color:#1769aa}@media(max-width:650px){.cards,.grid{grid-template-columns:1fr 1fr}}
</style></head><body><main><h1>Setu coordinator dashboard</h1><p class="sub">Live, TTL-bounded aggregate view. Urgency is self-reported.</p>
<div class="cards"><div class="card"><div class="n">${open.length}</div>Open needs</div><div class="card"><div class="n">${resolved.length}</div>Resolved</div><div class="card"><div class="n">${offers.length}</div>Offers</div><div class="card"><div class="n">${events.length}</div>Live events</div></div>
<div class="grid"><section><h2>Open needs by category</h2><table><tbody>${categoryRows.map((row) => `<tr><td>${escapeHtml(row.category)}</td><td>${row.count}</td></tr>`).join('') || '<tr><td>No open needs</td></tr>'}</tbody></table></section>
<section><h2>Open needs by area</h2><table><tbody>${areaRows.map(([gh, count]) => `<tr><td>${escapeHtml(areaName(gh))}</td><td>${count}</td></tr>`).join('') || '<tr><td>No open needs</td></tr>'}</tbody></table></section></div>
<p><a href="/api/coordinator/export.csv">Download live CSV</a> · <a href="/lite">Open Lite board</a></p>
</main></body></html>`;
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export function eventCsv(events: SetuEvent[]): string {
  const header = ['id', 'type', 'timestamp', 'area', 'author_name', 'status', 'category', 'person_name', 'person_status', 'message'];
  const rows = events.map((event) => [
    event.id,
    event.t,
    new Date(event.ts * 1000).toISOString(),
    areaName(event.gh),
    event.n,
    event.st,
    event.cat,
    event.pn,
    event.pst,
    event.msg,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
