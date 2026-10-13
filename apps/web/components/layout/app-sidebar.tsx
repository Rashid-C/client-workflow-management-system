'use client';

import Link from 'next/link';
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

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: string;
};

// `permission` hides an item from people who could not use the page; the
// API still enforces access on every request.
const navigation: { label: string; items: NavItem[] }[] = [
  {
    label: 'WORKSPACE',
    items: [
      { label: 'Overview', href: '/', icon: LayoutDashboard },
      { label: 'My Work', href: '/my-work', icon: ClipboardList },
      { label: 'Daily Updates', href: '/daily-updates', icon: CalendarDays, permission: 'daily_updates.view' },
    ],
  },
  {
    label: 'CLIENTS',
    items: [
      { label: 'Clients', href: '/clients', icon: BriefcaseBusiness, permission: 'clients.view' },
      { label: 'Documents & Expiry', href: '/documents', icon: FileClock, permission: 'documents.view' },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { label: 'Tasks', href: '/tasks', icon: ClipboardList, permission: 'tasks.view' },
      { label: 'Task types', href: '/task-types', icon: Activity, permission: 'workflows.view' },
      { label: 'Time Logs', href: '/time-logs', icon: FileText, permission: 'time_logs.view' },
    ],
  },
  {
    label: 'BUSINESS DEVELOPMENT',
    items: [
      { label: 'Leads & Follow-ups', href: '/leads', icon: CalendarDays, permission: 'leads.view' },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { label: 'Employees', href: '/employees', icon: Users, permission: 'employees.view' },
      { label: 'Roles & Permissions', href: '/roles', icon: ShieldCheck, permission: 'roles.view' },
      { label: 'Activity', href: '/activity', icon: History, permission: 'history.view' },
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
  const pathname = usePathname();
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
      <nav aria-label="Main navigation" className="space-y-6">
        {visibleNavigation.map((group) => (
          <section key={group.label}>
            {!collapsed || mobile ? (
              <h2 className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                {group.label}
              </h2>
            ) : (
              <div className="mx-3 mb-3 border-t border-slate-200" />
            )}

            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
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
                      title={!mobile && collapsed ? item.label : undefined}
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
                      {!collapsed || mobile ? (
                        <span>{item.label}</span>
                      ) : null}
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

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-950">
          tickwise<span className="text-teal-700">.</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          className="inline-flex size-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <Menu size={21} />
        </button>
      </header>

      {/* Desktop and tablet sidebar */}
      <aside
        className={[
          'hidden min-h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 md:flex',
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
            href="/"
            aria-label="Tickwise overview"
            className="text-xl font-semibold tracking-tight text-slate-950"
          >
            {collapsed ? 't.' : (
              <>
                tickwise<span className="text-teal-700">.</span>
              </>
            )}
          </Link>

          {!collapsed && (
            <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              Workspace
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
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          )}

          {can('settings.manage') && (
            <Link
              href="/settings"
              title={collapsed ? 'Settings' : undefined}
              className={[
                'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100',
                collapsed ? 'justify-center px-0' : '',
              ].join(' ')}
            >
              <Settings size={18} strokeWidth={1.8} aria-hidden="true" />
              {!collapsed && <span>Settings</span>}
            </Link>
          )}

          <button
            type="button"
            onClick={() => void signOut()}
            title={collapsed ? 'Sign out' : undefined}
            className={[
              'flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100',
              collapsed ? 'justify-center px-0' : '',
            ].join(' ')}
          >
            <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
            {!collapsed && <span>Sign out</span>}
          </button>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="mt-2 hidden min-h-9 w-full items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:flex"
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            {!collapsed && <span className="ml-2 text-xs">Collapse sidebar</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/40"
          />

          <aside
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col bg-white shadow-xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
              <Link href="/" className="text-lg font-semibold tracking-tight text-slate-950">
                tickwise<span className="text-teal-700">.</span>
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
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
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              )}
              {can('settings.manage') && (
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100"
                >
                  <Settings size={18} />
                  Settings
                </Link>
              )}
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
