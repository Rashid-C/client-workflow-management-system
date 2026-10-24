'use client';

import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useI18n } from '@/components/i18n/i18n-provider';

type Theme = 'light' | 'dark';

// The theme lives on <html data-theme>, set before paint by the layout's
// script; watching the attribute keeps every toggle on the page in step.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}
const current = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const onServer = (): Theme => 'light';

/** Light ⇄ dark for the signed-in app; remembered on this computer. */
export default function ThemeToggle() {
  const { t } = useI18n();
  const theme = useSyncExternalStore(subscribe, current, onServer);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? t.nav.darkMode : t.nav.lightMode;

  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem('theme', next);
        } catch {
          // Private windows may refuse storage; the switch still applies now.
        }
      }}
      aria-label={label}
      title={label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
