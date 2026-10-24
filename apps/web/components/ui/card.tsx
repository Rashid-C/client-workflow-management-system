import type { ReactNode } from "react";

export const cardClass = "rounded-xl border border-slate-200 bg-white shadow-xs";

/** A white panel. Pass `labelledBy` when a CardHeader names it. */
export function Card({
  className = "",
  labelledBy,
  children,
}: {
  className?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={labelledBy} className={`${cardClass} ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({
  id,
  title,
  level = 2,
  action,
}: {
  id?: string;
  title: ReactNode;
  level?: 2 | 3;
  action?: ReactNode;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <Heading id={id} className="text-sm font-semibold text-slate-900">
        {title}
      </Heading>
      {action}
    </div>
  );
}

/** The quiet line shown in a card or list that has nothing in it yet. */
export function EmptyState({ title, hint }: { title: ReactNode; hint?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
