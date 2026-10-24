'use client';

import { Suspense, useState, type ReactNode } from 'react';
import AppSidebar from '@/components/layout/app-sidebar';
import AppTopbar from '@/components/layout/app-topbar';

/**
 * The signed-in frame: the sidebar runs the full height on the start side;
 * the top bar sits over the content column only, level with the sidebar's
 * logo row.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-canvas text-slate-900">
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

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
