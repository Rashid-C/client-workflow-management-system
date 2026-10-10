import type { ReactNode } from 'react';
import AppSidebar from '@/components/layout/app-sidebar';

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 md:flex-row">
      <AppSidebar />

      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}