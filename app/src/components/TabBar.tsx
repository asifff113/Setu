import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Home', bn: 'হোম', icon: '🏠' },
  { to: '/board', label: 'Board', bn: 'বোর্ড', icon: '📋' },
  { to: '/map', label: 'Map', bn: 'ম্যাপ', icon: '🗺️' },
  { to: '/sync', label: 'Sync', bn: 'সিঙ্ক', icon: '🔄' },
  { to: '/info', label: 'Info', bn: 'তথ্য', icon: 'ℹ️' },
] as const;

export function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-white/10 bg-surface pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
              isActive ? 'text-accent' : 'text-white/60'
            }`
          }
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          <span className="leading-none">{tab.bn}</span>
        </NavLink>
      ))}
    </nav>
  );
}
