'use client';

import { LogOut, Menu } from 'lucide-react';
import { useCurrentUser } from '@/components/auth/current-user';
import BrandLogo from '@/components/brand/brand-logo';
import LanguageSwitch from '@/components/i18n/language-switch';
import NotificationsBell from '@/components/notifications/notifications-bell';
import Link from '@/components/i18n/link';
import { useI18n } from '@/components/i18n/i18n-provider';

type AppTopbarProps = {
  mobileNavigationOpen: boolean;
  onOpenNavigation: () => void;
};

export default function AppTopbar({
  mobileNavigationOpen,
  onOpenNavigation,
}: AppTopbarProps) {
  const { t } = useI18n();
  const { user, signOut } = useCurrentUser();

  return (
    <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4">
      <Link
        href="/overview"
        aria-label={t.nav.overview}
        className="shrink-0 md:hidden"
      >
        <BrandLogo variant="mark" />
      </Link>

      <div className="ms-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
        <NotificationsBell />
        {user && (
          <div className="min-w-0 max-w-[34vw] text-end sm:max-w-52">
            <p className="truncate text-xs font-medium text-slate-900 sm:text-sm">
              {user.name}
            </p>
            <a
              href={`mailto:${user.email}`}
              className="hidden truncate text-xs text-slate-500 hover:text-brand-700 sm:block"
              dir="ltr"
            >
              {user.email}
            </a>
          </div>
        )}

        <LanguageSwitch className="size-9 shrink-0 justify-center px-0 sm:w-auto sm:px-3 [&>span]:hidden sm:[&>span]:inline" />

        <button
          type="button"
          onClick={() => void signOut()}
          aria-label={t.auth.signOut}
          title={t.auth.signOut}
          className="inline-flex size-9 shrink-0 items-center justify-center gap-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 sm:w-auto sm:px-3"
        >
          <LogOut size={18} className="rtl:rotate-180" aria-hidden="true" />
          <span className="hidden sm:inline">{t.auth.signOut}</span>
        </button>

        <button
          type="button"
          onClick={onOpenNavigation}
          aria-label={t.nav.openNavigation}
          aria-controls="mobile-navigation"
          aria-expanded={mobileNavigationOpen}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 md:hidden"
        >
          <Menu size={21} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
