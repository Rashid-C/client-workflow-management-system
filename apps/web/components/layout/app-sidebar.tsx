'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Activity,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileClock,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useCurrentUser } from '@/components/auth/current-user';
import { useI18n } from '@/components/i18n/i18n-provider';
import LanguageSwitch from '@/components/i18n/language-switch';
import Link from '@/components/i18n/link';
import type { Dictionary } from '@/lib/i18n/en';
import { withoutLocale } from '@/lib/i18n/config';

type NavKey = Exclude<keyof Dictionary['nav'], 'groups'>;

type NavItem = {
  label: NavKey;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: string;
};

// `permission` hides an item from people who could not use the page; the
// API still enforces access on every request.
const navigation: { label: keyof Dictionary['nav']['groups']; items: NavItem[] }[] = [
  {
    label: 'workspace',
    items: [
      { label: 'overview', href: '/overview', icon: LayoutDashboard },
      { label: 'myWork', href: '/my-work', icon: ClipboardList },
      { label: 'dailyUpdates', href: '/daily-updates', icon: CalendarDays, permission: 'daily_updates.view' },
    ],
  },
  {
    label: 'clients',
    items: [
      { label: 'clients', href: '/clients', icon: BriefcaseBusiness, permission: 'clients.view' },
      { label: 'documents', href: '/documents', icon: FileClock, permission: 'documents.view' },
    ],
  },
  {
    label: 'operations',
    items: [
      { label: 'tasks', href: '/tasks', icon: ClipboardList, permission: 'tasks.view' },
      { label: 'taskTypes', href: '/task-types', icon: Activity, permission: 'workflows.view' },
      { label: 'timeLogs', href: '/time-logs', icon: FileText, permission: 'time_logs.view' },
    ],
  },
  {
    label: 'business',
    items: [
      { label: 'leads', href: '/leads', icon: CalendarDays, permission: 'leads.view' },
    ],
  },
  {
    label: 'management',
    items: [
      { label: 'employees', href: '/employees', icon: Users, permission: 'employees.view' },
      { label: 'roles', href: '/roles', icon: ShieldCheck, permission: 'roles.view' },
      { label: 'activity', href: '/activity', icon: History, permission: 'history.view' },
    ],
  },
];

type AppSidebarProps = {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

export default function AppSidebar({
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: AppSidebarProps) {
  const pathname = withoutLocale(usePathname());
  const { t } = useI18n();
  const { user, can, signOut } = useCurrentUser();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const visibleNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => item.permission === undefined || can(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const collapsed = controlledCollapsed ?? internalCollapsed;

  function toggleCollapsed() {
    const next = !collapsed;
    setInternalCollapsed(next);
    onCollapsedChange?.(next);
  }

  function renderNavigation(mobile = false) {
    return (
      <nav aria-label={t.nav.mainNavigation} className="space-y-6">
        {visibleNavigation.map((group) => (
          <section key={group.label}>
            {!collapsed || mobile ? (
              <h2 className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                {t.nav.groups[group.label]}
              </h2>
            ) : (
              <div className="mx-3 mb-3 border-t border-slate-200" />
            )}

            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const label = t.nav[item.label];
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={!mobile && collapsed ? label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                        collapsed && !mobile ? 'justify-center px-0' : '',
                        active
                          ? 'bg-slate-900 font-medium text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                      ].join(' ')}
                    >
                      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                      {!collapsed || mobile ? <span>{label}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
    );
  }

  const logo = (
    <span dir="ltr">
      tickwise<span className="text-teal-700">.</span>
    </span>
  );

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <Link href="/overview" className="text-lg font-semibold tracking-tight text-slate-950">
          {logo}
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={t.nav.openNavigation}
          aria-expanded={mobileOpen}
          className="inline-flex size-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <Menu size={21} />
        </button>
      </header>

      {/* Desktop and tablet sidebar */}
      <aside
        className={[
          'hidden min-h-screen shrink-0 flex-col border-e border-slate-200 bg-white transition-[width] duration-200 md:flex',
          collapsed ? 'w-19' : 'w-64',
        ].join(' ')}
      >
        <div
          className={[
            'flex h-16 items-center border-b border-slate-100 px-5',
            collapsed ? 'justify-center px-2' : 'justify-between',
          ].join(' ')}
        >
          <Link
            href="/overview"
            aria-label={t.nav.overview}
            className="text-xl font-semibold tracking-tight text-slate-950"
          >
            {collapsed ? <span dir="ltr">t.</span> : logo}
          </Link>

          {!collapsed && (
            <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              {t.nav.workspaceBadge}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-6">
          {renderNavigation()}
        </div>

        <div className="border-t border-slate-100 p-3">
          {user && !collapsed && (
            <div className="mb-2 px-3 py-1">
              <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
              <a href={`mailto:${user.email}`} className="block truncate text-xs text-slate-500 hover:text-blue-700" dir="ltr">{user.email}</a>
            </div>
          )}

          {can('settings.manage') && (
            <Link
              href="/settings"
              title={collapsed ? t.nav.settings : undefined}
              className={[
                'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100',
                collapsed ? 'justify-center px-0' : '',
              ].join(' ')}
            >
              <Settings size={18} strokeWidth={1.8} aria-hidden="true" />
              {!collapsed && <span>{t.nav.settings}</span>}
            </Link>
          )}

          <LanguageSwitch
            className={['min-h-10 w-full px-3', collapsed ? 'justify-center px-0' : ''].join(' ')}
          />

          <button
            type="button"
            onClick={() => void signOut()}
            title={collapsed ? t.auth.signOut : undefined}
            className={[
              'flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100',
              collapsed ? 'justify-center px-0' : '',
            ].join(' ')}
          >
            <LogOut size={18} strokeWidth={1.8} className="rtl:rotate-180" aria-hidden="true" />
            {!collapsed && <span>{t.auth.signOut}</span>}
          </button>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t.nav.expand : t.nav.collapse}
            className="mt-2 hidden min-h-9 w-full items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:flex"
          >
            {collapsed ? (
              <ChevronRight size={17} className="rtl:rotate-180" />
            ) : (
              <ChevronLeft size={17} className="rtl:rotate-180" />
            )}
            {!collapsed && <span className="ms-2 text-xs">{t.nav.collapse}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t.nav.closeOverlay}
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/40"
          />

          <aside
            id="mobile-navigation"
            aria-label={t.nav.mobileNavigation}
            className="absolute inset-y-0 start-0 flex w-[min(300px,85vw)] flex-col bg-white shadow-xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
              <Link href="/overview" className="text-lg font-semibold tracking-tight text-slate-950">
                {logo}
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t.nav.closeNavigation}
                className="inline-flex size-9 items-center justify-center rounded-md hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-6">
              {renderNavigation(true)}
            </div>

            <div className="border-t border-slate-100 p-3">
              {user && (
                <div className="mb-2 px-3 py-1">
                  <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                  <a href={`mailto:${user.email}`} className="block truncate text-xs text-slate-500 hover:text-blue-700" dir="ltr">{user.email}</a>
                </div>
              )}
              {can('settings.manage') && (
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100"
                >
                  <Settings size={18} />
                  {t.nav.settings}
                </Link>
              )}
              <LanguageSwitch className="min-h-10 w-full px-3" />
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                <LogOut size={18} className="rtl:rotate-180" />
                {t.auth.signOut}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
