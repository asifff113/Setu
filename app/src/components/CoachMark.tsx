import type { ReactNode } from 'react';
import { useAppStore } from '../store/appStore';

export function CoachMark({ id, children }: { id: string; children: ReactNode }) {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  if (!settings || settings.hintsSeen.includes(id)) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/8 px-4 py-3 text-sm text-ink">
      <span aria-hidden="true">💡</span>
      <p className="flex-1 leading-relaxed">{children}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => void updateSettings({ hintsSeen: [...settings.hintsSeen, id] })}
        className="rounded-lg px-2 text-lg text-muted"
      >
        ×
      </button>
    </div>
  );
}
