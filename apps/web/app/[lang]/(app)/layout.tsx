import { Suspense, type ReactNode } from 'react';
import { CurrentUserProvider } from '@/components/auth/current-user';
import AppSidebar from '@/components/layout/app-sidebar';

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <CurrentUserProvider>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 md:flex-row">
        {/* The sidebar reads the current path, which dynamic routes such as
            /task-types/[id] only know per request. */}
        <Suspense
          fallback={
            <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white md:block" />
          }
        >
          <AppSidebar />
        </Suspense>

        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </CurrentUserProvider>
  );
}
