import { Outlet } from 'react-router-dom';
import { TabBar } from './TabBar';

export function Layout() {
  return (
    <div className="flex h-full flex-col bg-bg">
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
