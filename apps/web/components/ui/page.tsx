import type { ReactNode } from "react";

const WIDTHS = {
  form: "max-w-4xl",
  narrow: "max-w-5xl",
  default: "max-w-7xl",
  wide: "max-w-[1600px]",
} as const;

/** The content column of a signed-in page: one width and gutter everywhere. */
export function Page({
  size = "default",
  className = "",
  children,
}: {
  size?: keyof typeof WIDTHS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full ${WIDTHS[size]} px-4 pt-6 pb-12 text-slate-900 sm:px-6 lg:px-8 lg:pt-8 ${className}`}>
      {children}
    </div>
  );
}

/** Title block at the top of a page, with its main actions at the end. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold tracking-wider text-brand-700 uppercase">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
