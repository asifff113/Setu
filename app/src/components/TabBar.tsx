import { bulletinEvents, chatEvents, latestStatusEvents } from '@setu/shared';
import type { ComponentType, SVGProps } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n, type DictKey } from '../i18n';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';

type IconProps = SVGProps<SVGSVGElement>;

function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function BoardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6" />
      <path d="M8 11h8" />
      <path d="M8 15h6" />
    </svg>
  );
}

function ChatIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  );
}

function AlertIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function InfoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

const TABS: { to: string; Icon: ComponentType<IconProps>; key: DictKey }[] = [
  { to: '/', Icon: HomeIcon, key: 'tabHome' },
  { to: '/board', Icon: BoardIcon, key: 'tabBoard' },
  { to: '/chat', Icon: ChatIcon, key: 'tabChat' },
  { to: '/alerts', Icon: AlertIcon, key: 'tabAlerts' },
  { to: '/more', Icon: InfoIcon, key: 'tabMore' },
];

export function TabBar() {
  const { t } = useI18n();
  const events = useEventsStore((state) => state.events);
  const settings = useAppStore((state) => state.settings);
  const requestSeen = Math.max(
    settings?.lastSeen.help ?? 0,
    settings?.lastSeen.people ?? 0,
    settings?.lastSeen.missing ?? 0,
    settings?.lastSeen.offers ?? 0,
  );
  const badges: Record<string, number> = {
    '/board': latestStatusEvents(events).filter((event) => event.ts > requestSeen).length,
    '/chat': chatEvents(events, settings?.gh).filter((event) => event.ts > (settings?.lastSeen.chat ?? 0)).length,
    '/alerts': bulletinEvents(events).filter((event) => event.ts > (settings?.lastSeen.bulletins ?? 0)).length,
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(20,33,41,0.08)] backdrop-blur">
      {TABS.map(({ Icon, ...tab }) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 px-1 py-2 text-xs font-semibold transition-colors ${
              isActive ? 'text-accent' : 'text-muted hover:text-ink focus-visible:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`relative flex h-8 w-11 items-center justify-center rounded-full ${
                  isActive ? 'bg-accent/12' : 'bg-transparent'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {(badges[tab.to] ?? 0) > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-need px-1 text-center text-[10px] leading-5 text-white">
                    {Math.min(99, badges[tab.to] ?? 0)}
                  </span>
                )}
              </span>
              <span className="leading-none">{t(tab.key)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
