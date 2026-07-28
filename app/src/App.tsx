import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { BoardScreen } from './screens/BoardScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InfoScreen } from './screens/InfoScreen';
import { MapScreen } from './screens/MapScreen';
import { SyncScreen } from './screens/SyncScreen';

export default function App() {
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
      </Routes>
    </BrowserRouter>
  );
}
