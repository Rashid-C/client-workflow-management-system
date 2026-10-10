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
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

const navigation = [
  {
    label: 'WORKSPACE',
    items: [
      { label: 'Overview', href: '/', icon: LayoutDashboard },
      { label: 'My Work', href: '/my-work', icon: ClipboardList },
      { label: 'Daily Updates', href: '/daily-updates', icon: CalendarDays },
    ],
  },
  {
    label: 'CLIENTS',
    items: [
      { label: 'Clients', href: '/clients', icon: BriefcaseBusiness },
      { label: 'Documents & Expiry', href: '/documents', icon: FileClock },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { label: 'Tasks', href: '/tasks', icon: ClipboardList },
      { label: 'Workflows', href: '/workflows', icon: Activity },
      { label: 'Time Logs', href: '/time-logs', icon: FileText },
    ],
  },
  {
    label: 'BUSINESS DEVELOPMENT',
    items: [
      { label: 'Leads & Follow-ups', href: '/leads', icon: CalendarDays },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { label: 'Employees', href: '/employees', icon: Users },
      { label: 'Roles & Permissions', href: '/roles', icon: ShieldCheck },
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
  const [internalCollapsed, setInternalCollapsed] = useState(false);
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
        {navigation.map((group) => (
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
          collapsed ? 'w-[76px]' : 'w-64',
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
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                <Settings size={18} />
                Settings
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
