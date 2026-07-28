import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { BoardScreen } from './screens/BoardScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InfoScreen } from './screens/InfoScreen';
import { MapScreen } from './screens/MapScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { PublishScreen } from './screens/PublishScreen';
import { SyncScreen } from './screens/SyncScreen';
import { useAppStore } from './store/appStore';

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const onboarded = useAppStore((s) => s.settings?.onboarded ?? false);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <span className="text-2xl font-bold text-white">সেতু</span>
      </div>
    );
  }

  if (!onboarded) return <OnboardingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomeScreen />} />
          <Route path="board" element={<BoardScreen />} />
          <Route path="map" element={<MapScreen />} />
          <Route path="sync" element={<SyncScreen />} />
          <Route path="info" element={<InfoScreen />} />
        </Route>
        {/* Hidden: not in the tab bar, reached only by typing the URL. */}
        <Route path="publish" element={<PublishScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
