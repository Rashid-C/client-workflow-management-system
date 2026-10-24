'use client';

import { Menu } from 'lucide-react';
import BrandLogo from '@/components/brand/brand-logo';
import LanguageSwitch from '@/components/i18n/language-switch';
import NotificationsBell from '@/components/notifications/notifications-bell';
import Link from '@/components/i18n/link';
import { useI18n } from '@/components/i18n/i18n-provider';
import UserMenu from '@/components/layout/user-menu';

type AppTopbarProps = {
  mobileNavigationOpen: boolean;
  onOpenNavigation: () => void;
};

export default function AppTopbar({
  mobileNavigationOpen,
  onOpenNavigation,
}: AppTopbarProps) {
  const { t } = useI18n();

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenNavigation}
        aria-label={t.nav.openNavigation}
        aria-controls="mobile-navigation"
        aria-expanded={mobileNavigationOpen}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 md:hidden"
      >
        <Menu size={21} aria-hidden="true" />
      </button>
      <Link
        href="/overview"
        aria-label={t.nav.overview}
        className="shrink-0 md:hidden"
      >
        <BrandLogo variant="mark" />
      </Link>

      <div className="ms-auto flex min-w-0 items-center gap-1 sm:gap-2">
        <NotificationsBell />
        <LanguageSwitch className="size-9 shrink-0 justify-center px-0 sm:w-auto sm:px-3 [&>span]:hidden sm:[&>span]:inline" />
        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
