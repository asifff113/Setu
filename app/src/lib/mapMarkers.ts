/**
 * Pure derivation of Map screen data from the flat event log — no Leaflet,
 * no DOM, so it's cheap to unit test and reused by both the live map and the
 * offline area-count fallback.
 */
import { findAreaByGh, latestPersonEvents, latestStatusEvents, type SetuEvent } from '@setu/shared';

export type MarkerColor = 'safe' | 'need';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: MarkerColor;
  event: SetuEvent;
}

export interface AreaCount {
  gh: string;
  count: number;
}

// Degrees of deterministic spread applied to area-centroid fallback points,
// so several people from the same area (no GPS attached) don't render as one
// fully overlapping dot. Kept small relative to a precision-6 geohash cell
// (~1.2km x 0.6km) so a jittered point never drifts into a neighboring area.
const JITTER_DEGREES = 0.003;

/** Deterministic pseudo-random offset from an id, stable across re-renders. */
function hashJitter(id: string): [number, number] {
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < id.length; i++) {
    h1 = (h1 * 31 + id.charCodeAt(i)) | 0;
    h2 = (h2 * 131 + id.charCodeAt(i)) | 0;
  }
  return [((h1 % 1000) / 1000) * JITTER_DEGREES, ((h2 % 1000) / 1000) * JITTER_DEGREES];
}

/**
 * Where an event plots: its own reported GPS if attached, else its area's
 * centroid (jittered), else undefined when neither `loc` nor a resolvable
 * `gh` is known — those events simply can't be placed on a map.
 */
function positionOf(event: SetuEvent): [number, number] | undefined {
  if (event.loc) return event.loc;
  const area = findAreaByGh(event.gh);
  if (!area) return undefined;
  const [dLat, dLng] = hashJitter(event.id);
  return [area.lat + dLat, area.lng + dLng];
}

/**
 * One marker per person's latest checkin/help (green=safe, red=need) and per
 * missing-person's latest report (green=found/seen, red=missing). Bulletins
 * carry no location and are never plotted.
 */
export function buildMapMarkers(events: readonly SetuEvent[]): MapMarker[] {
  const markers: MapMarker[] = [];

  for (const event of latestStatusEvents(events)) {
    const pos = positionOf(event);
    if (!pos) continue;
    markers.push({
      id: event.id,
      lat: pos[0],
      lng: pos[1],
      color: event.st === 'safe' ? 'safe' : 'need',
      event,
    });
  }

  for (const event of latestPersonEvents(events)) {
    const pos = positionOf(event);
    if (!pos) continue;
    const positive = event.pst === 'found' || event.pst === 'seen';
    markers.push({
      id: event.id,
      lat: pos[0],
      lng: pos[1],
      color: positive ? 'safe' : 'need',
      event,
    });
  }

  return markers;
}

/** Per-area counts of the same plottable events, sorted highest first — the offline fallback list. */
export function areaCounts(events: readonly SetuEvent[]): AreaCount[] {
  const byGh = new Map<string, number>();
  for (const event of [...latestStatusEvents(events), ...latestPersonEvents(events)]) {
    byGh.set(event.gh, (byGh.get(event.gh) ?? 0) + 1);
  }
  return [...byGh.entries()]
    .map(([gh, count]) => ({ gh, count }))
    .sort((a, b) => b.count - a.count);
}
