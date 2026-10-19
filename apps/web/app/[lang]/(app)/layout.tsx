import type { ReactNode } from 'react';
import { CurrentUserProvider } from '@/components/auth/current-user';
import AppShell from '@/components/layout/app-shell';

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <CurrentUserProvider>
      <AppShell>{children}</AppShell>
    </CurrentUserProvider>
  );
}
