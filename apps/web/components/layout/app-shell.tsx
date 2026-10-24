'use client';

import { Suspense, useState, type ReactNode } from 'react';
import AppSidebar from '@/components/layout/app-sidebar';
import AppTopbar from '@/components/layout/app-topbar';
import { useI18n } from '@/components/i18n/i18n-provider';

/**
 * The signed-in frame: the sidebar runs the full height on the start side;
 * the top bar sits over the content column only, level with the sidebar's
 * logo row.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="app-theme flex h-dvh min-h-0 overflow-hidden bg-canvas text-slate-900">
      {/* First stop for keyboard users: past the sidebar, straight to the page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-700 focus:shadow-lg"
      >
        {t.nav.skipToContent}
      </a>
      {/* Dynamic routes need the pathname available per request. */}
      <Suspense
        fallback={
          <aside className="hidden h-full w-64 shrink-0 border-e border-slate-200 bg-white md:block" />
        }
      >
        <AppSidebar
          mobileOpen={mobileNavigationOpen}
          onMobileOpenChange={setMobileNavigationOpen}
        />
      </Suspense>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppTopbar
          mobileNavigationOpen={mobileNavigationOpen}
          onOpenNavigation={() => setMobileNavigationOpen(true)}
        />

        <main id="main-content" tabIndex={-1} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
