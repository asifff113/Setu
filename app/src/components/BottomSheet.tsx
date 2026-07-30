import { useEffect, useRef, type ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Generic slide-up sheet for the Help and Missing/Found report forms. */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Every caller passes `onClose` as an inline arrow, so its identity changes on
  // each parent render. Reading it through a ref keeps the focus effect below
  // keyed on `open` alone: when it also depended on `onClose`, typing one letter
  // in a field re-rendered the parent, re-ran the effect's cleanup (restoring
  // focus to whatever opened the sheet) and then refocused the panel — so the
  // caret was thrown out of the box after every single keystroke.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]',
      );
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl outline-none"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}
