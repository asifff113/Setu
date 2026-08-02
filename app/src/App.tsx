import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { db } from './db/schema';
import { useI18n } from './i18n';
import { tryDemo } from './lib/demoTrigger';
import { isNative } from './lib/platform';
import { BoardScreen } from './screens/BoardScreen';
import { HomeScreen } from './screens/HomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { useAppStore } from './store/appStore';

// Leaflet + react-leaflet are the app's heaviest dependency and only the Map
// screen needs them, so they load as their own chunk on first visit to /map.
// vite-plugin-pwa precaches every built JS chunk, so this stays offline-safe.
const MapScreen = lazy(() => import('./screens/MapScreen').then((m) => ({ default: m.MapScreen })));
const ChatScreen = lazy(() => import('./screens/ChatScreen').then((m) => ({ default: m.ChatScreen })));
const GuideScreen = lazy(() => import('./screens/GuideScreen').then((m) => ({ default: m.GuideScreen })));
const HistoryScreen = lazy(() => import('./screens/HistoryScreen').then((m) => ({ default: m.HistoryScreen })));
const ShareScreen = lazy(() => import('./screens/ShareScreen').then((m) => ({ default: m.ShareScreen })));
const CircleScreen = lazy(() => import('./screens/CircleScreen').then((m) => ({ default: m.CircleScreen })));
const MediaStorageScreen = lazy(() => import('./screens/MediaStorageScreen').then((m) => ({ default: m.MediaStorageScreen })));
const SyncScreen = lazy(() => import('./screens/SyncScreen').then((m) => ({ default: m.SyncScreen })));
const InfoScreen = lazy(() => import('./screens/InfoScreen').then((m) => ({ default: m.InfoScreen })));
const ManualScreen = lazy(() => import('./screens/ManualScreen').then((m) => ({ default: m.ManualScreen })));
const PublishScreen = lazy(() => import('./screens/PublishScreen').then((m) => ({ default: m.PublishScreen })));
const PanicScreen = lazy(() => import('./screens/PanicScreen').then((m) => ({ default: m.PanicScreen })));
const LinkBeamScreen = lazy(() => import('./screens/LinkBeamScreen').then((m) => ({ default: m.LinkBeamScreen })));

function ScreenFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <span className="text-lg font-semibold text-muted">সেতু</span>
    </div>
  );
}

export default function App() {
  const { t } = useI18n();
  const ready = useAppStore((s) => s.ready);
  const onboarded = useAppStore((s) => s.settings?.onboarded ?? false);
  const appearance = useAppStore((state) => state.settings);

  // `?demo=1` (used for screenshots/video and shared links) loads the demo
  // seed the same way the onboarding "Try the demo" button does. Strip the
  // param afterward so reloading doesn't repeat the navigation.
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('demo') !== '1') return;
    url.searchParams.delete('demo');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    void tryDemo();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const { checkAndProcessSharedBundle } = await import('./lib/sharedBundle');
      const { processCourierQueue } = await import('./lib/courier');
      await checkAndProcessSharedBundle();
      await processCourierQueue();
    })();
  }, [ready]);

  // N1 (share sheet while already running) + N5 (background auto-backup):
  // the effect above only fires once on cold start, which misses an intent
  // shared to Setu while it's already open (MainActivity.onNewIntent stashes
  // it, but nothing re-asks until the app is next foregrounded).
  useEffect(() => {
    if (!ready || !isNative()) return;
    let removeListener: (() => void) | undefined;
    void (async () => {
      const { App: CapacitorApp } = await import('@capacitor/app');
      const handle = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          void import('./lib/sharedBundle').then((m) => m.checkAndProcessSharedBundle());
        } else {
          void import('./lib/backup').then((m) => m.performAutoBackup());
        }
      });
      removeListener = () => handle.remove();
    })();
    return () => removeListener?.();
  }, [ready]);

  // N5 restore prompt: only reachable pre-onboarding with an empty log, so it
  // can never clobber real data — same gate the spec requires.
  useEffect(() => {
    if (!ready || onboarded || !isNative()) return;
    void (async () => {
      const [{ checkBackupExists, restoreBackup }, eventCount] = await Promise.all([
        import('./lib/backup'),
        db.events.count(),
      ]);
      if (eventCount > 0) return;
      const { exists, lastBackupAt } = await checkBackupExists();
      if (!exists) return;
      const label = lastBackupAt ? new Date(lastBackupAt).toLocaleString() : '';
      if (window.confirm(`${t('restorePromptTitle')}${label ? ` (${label})` : ''}`)) {
        const restored = await restoreBackup();
        if (restored) window.location.reload();
      }
    })();
  }, [ready, onboarded, t]);

  useEffect(() => {
    if (!appearance) return;
    document.documentElement.dataset.theme = appearance.batterySaver ? 'dark' : appearance.theme;
    document.documentElement.classList.toggle('battery-saver', appearance.batterySaver);
    document.documentElement.classList.toggle('large-text', appearance.largeText);
  }, [appearance]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <span className="text-2xl font-bold text-ink">সেতু</span>
      </div>
    );
  }

  if (!onboarded) return <OnboardingScreen />;

  return (
    <BrowserRouter>
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomeScreen />} />
            <Route path="board" element={<BoardScreen />} />
            <Route path="chat" element={<ChatScreen />} />
            <Route path="people" element={<BoardScreen initialTab="people" />} />
            <Route path="alerts" element={<BoardScreen initialTab="bulletins" />} />
            <Route path="map" element={<MapScreen />} />
            <Route path="connect" element={<SyncScreen />} />
            <Route path="more" element={<InfoScreen />} />
            <Route path="guide" element={<GuideScreen />} />
            <Route path="manual" element={<ManualScreen />} />
            <Route path="history" element={<HistoryScreen />} />
            <Route path="share" element={<ShareScreen />} />
            <Route path="circle" element={<CircleScreen />} />
            <Route path="media" element={<MediaStorageScreen />} />
            <Route path="sync" element={<Navigate to="/connect" replace />} />
            <Route path="info" element={<Navigate to="/more" replace />} />
          </Route>
          {/* Hidden: not in the tab bar, reached only by URL or shortcut. */}
          <Route path="publish" element={<PublishScreen />} />
          <Route path="panic" element={<PanicScreen />} />
          <Route path="b" element={<LinkBeamScreen />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
