'use client';

import { ChevronDown, LogOut } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useCurrentUser } from '@/components/auth/current-user';
import { useI18n } from '@/components/i18n/i18n-provider';

/** Up to two letters for the avatar: "Aisha Rahman" → "AR". */
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/** The signed-in person's avatar; opens a panel with who they are and sign out. */
export default function UserMenu() {
  const { t } = useI18n();
  const { user, signOut } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return <span aria-hidden="true" className="size-8 rounded-full bg-slate-100" />;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t.nav.accountMenu}
        className="flex items-center gap-2 rounded-lg p-1 text-slate-700 hover:bg-slate-100 sm:pe-2"
      >
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white"
        >
          {initialsOf(user.name)}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-medium sm:block">{user.name}</span>
        <ChevronDown size={16} aria-hidden="true" className="hidden text-slate-500 sm:block" />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute end-0 top-full z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <div className="mb-1 border-b border-slate-100 px-3 pt-2 pb-3">
            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">
              <span dir="ltr">{user.email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <LogOut size={16} aria-hidden="true" className="text-slate-500 rtl:rotate-180" />
            {t.auth.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
