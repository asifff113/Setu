import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { MissingCard, PersonStatusCard } from '../components/BoardCards';
import { CoachMark } from '../components/CoachMark';
import { useI18n } from '../i18n';
import { areaLabel } from '../lib/area';
import { areaCounts, buildMapMarkers, type MapMarker } from '../lib/mapMarkers';
import { useEventsStore } from '../store/eventsStore';

const BANGLADESH_CENTER: [number, number] = [23.685, 90.3563];
const DEFAULT_ZOOM = 7;

// Mirror the Tailwind theme tokens (index.css `@theme`) — Leaflet's SVG
// renderer sets these as literal path attributes, not through the cascade,
// so a CSS var() reference here wouldn't resolve.
const SAFE_COLOR = '#18864b';
const NEED_COLOR = '#c92d2d';

/** `navigator.onLine`, kept live via the online/offline events. */
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return online;
}

/** Refits the view to the current markers whenever the plotted set changes, without fighting the user's own pan/zoom in between. */
function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  const key = markers.map((m) => m.id).join('|');

  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0]!.lat, markers[0]!.lng], 12);
      return;
    }
    const bounds = markers.map((m): [number, number] => [m.lat, m.lng]);
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 });
    // Intentionally keyed on the marker-id set, not `markers`/`map` — refit
    // only when who's plotted changes, not on every position/store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

function MarkerLayer({ markers }: { markers: MapMarker[] }) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  useMapEvents({
    zoomend: (event) => setZoom(event.target.getZoom()),
  });
  const groups = useMemo(() => {
    if (zoom > 9) return markers.map((marker) => ({ lat: marker.lat, lng: marker.lng, markers: [marker] }));
    const cell = zoom <= 7 ? 0.7 : 0.22;
    const byCell = new Map<string, MapMarker[]>();
    for (const marker of markers) {
      const key = `${Math.round(marker.lat / cell)}:${Math.round(marker.lng / cell)}`;
      const group = byCell.get(key);
      if (group) group.push(marker);
      else byCell.set(key, [marker]);
    }
    return [...byCell.values()].map((group) => ({
      lat: group.reduce((sum, marker) => sum + marker.lat, 0) / group.length,
      lng: group.reduce((sum, marker) => sum + marker.lng, 0) / group.length,
      markers: group,
    }));
  }, [markers, zoom]);

  return groups.map((group) => {
    const first = group.markers[0]!;
    const need = group.markers.some((marker) => marker.color === 'need');
    const clustered = group.markers.length > 1;
    return (
      <CircleMarker
        key={group.markers.map((marker) => marker.id).join(':')}
        center={[group.lat, group.lng]}
        radius={clustered ? Math.min(24, 10 + Math.sqrt(group.markers.length) * 3) : 9}
        pathOptions={{
          color: '#ffffff',
          weight: 2,
          fillColor: need ? NEED_COLOR : SAFE_COLOR,
          fillOpacity: 0.9,
        }}
      >
        {clustered ? (
          <>
            <Tooltip permanent direction="center" className="setu-cluster-label">
              {group.markers.length}
            </Tooltip>
            <Popup minWidth={220}>
              <div className="rounded-xl bg-surface p-3 text-ink">
                <p className="font-bold">{group.markers.length} {t('mapClusterReports')}</p>
                <p className="mt-1 text-sm text-muted">{t('mapClusterHint')}</p>
              </div>
            </Popup>
          </>
        ) : (
          <Popup minWidth={240}>
            {first.event.t === 'person' ? (
              <MissingCard event={first.event} />
            ) : (
              <PersonStatusCard event={first.event} />
            )}
          </Popup>
        )}
      </CircleMarker>
    );
  });
}

export function MapScreen() {
  const { t, lang } = useI18n();
  const events = useEventsStore((s) => s.events);
  const online = useOnlineStatus();

  // `navigator.onLine` only reports link state, not tile reachability: behind a
  // captive portal or a dead-but-connected Wi-Fi it stays true while every tile
  // 404s, leaving a blank map. Watch the TileLayer's own load/error events and
  // fall back to the area list when tiles are clearly unreachable.
  const [tilesFailed, setTilesFailed] = useState(false);
  const [layer, setLayer] = useState<'pins' | 'areas'>('pins');
  const tileStats = useRef({ loaded: 0, errored: 0 });

  // Regaining connectivity earns tiles a fresh attempt.
  useEffect(() => {
    if (online) {
      tileStats.current = { loaded: 0, errored: 0 };
      setTilesFailed(false);
    }
  }, [online]);

  useEffect(() => {
    if (!online || tilesFailed) return;
    const timer = window.setTimeout(() => {
      if (tileStats.current.loaded === 0) setTilesFailed(true);
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [online, tilesFailed]);

  const tileHandlers = useMemo(
    () => ({
      tileload: () => {
        tileStats.current.loaded += 1;
      },
      tileerror: () => {
        const stats = tileStats.current;
        stats.errored += 1;
        // Several tiles failed and not one has ever loaded → the tile server is
        // unreachable despite `online`. Swap to the fallback.
        if (stats.loaded === 0 && stats.errored >= 3) setTilesFailed(true);
      },
    }),
    [],
  );

  const markers = useMemo(() => buildMapMarkers(events), [events]);
  const counts = useMemo(() => areaCounts(events), [events]);
  const showMap = online && !tilesFailed && layer === 'pins';

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
      <h1 className="text-xl font-bold text-ink">{t('mapTitle')}</h1>
      <CoachMark id="map">{t('coachMap')}</CoachMark>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1">
        <button type="button" onClick={() => setLayer('pins')} className={`min-h-10 rounded-lg text-sm font-semibold ${layer === 'pins' ? 'bg-accent text-white' : 'text-muted'}`}>
          {t('mapPins')}
        </button>
        <button type="button" onClick={() => setLayer('areas')} className={`min-h-10 rounded-lg text-sm font-semibold ${layer === 'areas' ? 'bg-accent text-white' : 'text-muted'}`}>
          {t('mapAreas')}
        </button>
      </div>

      {showMap ? (
        <>
          <div className="relative h-[60vh] min-h-[320px] w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <MapContainer
              center={BANGLADESH_CENTER}
              zoom={DEFAULT_ZOOM}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                eventHandlers={tileHandlers}
              />
              <FitBounds markers={markers} />
              <MarkerLayer markers={markers} />
            </MapContainer>
            <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-3 rounded-full border border-line bg-surface/95 px-3 py-2 text-xs font-semibold text-muted shadow-sm backdrop-blur">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: SAFE_COLOR }} />
                {t('mapLegendSafe')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: NEED_COLOR }} />
                {t('mapLegendNeed')}
              </span>
            </div>
          </div>

          {markers.length === 0 && <p className="pt-2 text-center text-sm text-muted">{t('mapNoData')}</p>}
        </>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-ink">{layer === 'areas' ? t('mapAreasTitle') : t('mapOfflineTitle')}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{layer === 'areas' ? t('mapAreasHint') : t('mapOfflineHint')}</p>
          </div>

          {counts.length === 0 ? (
            <p className="pt-2 text-center text-sm text-muted">{t('mapNoData')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {counts.map(({ gh, count }) => (
                <div
                  key={gh || 'unknown'}
                  className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3"
                >
                  <span className="text-sm text-ink">{gh ? areaLabel(gh, lang) : t('unknownArea')}</span>
                  <span className="text-sm font-semibold text-muted">
                    {count} {t('mapReportsSuffix')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
