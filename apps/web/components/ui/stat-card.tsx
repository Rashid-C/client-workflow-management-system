"use client";

import type { ReactNode } from "react";
import Link from "@/components/i18n/link";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const VALUE_TONES: Record<Tone, string> = {
  neutral: "text-slate-950",
  brand: "text-brand-700",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
};

const ICON_TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-500",
  brand: "bg-brand-50 text-brand-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
};

/**
 * One number with its label. A link with `href`, a toggle with `onClick`
 * (`active` marks it pressed), otherwise plain.
 */
export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  compact = false,
  href,
  onClick,
  active = false,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  compact?: boolean;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className={`${compact ? "text-xs" : "text-sm"} leading-5 text-slate-500`}>{label}</p>
        {icon && (
          <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-lg ${ICON_TONES[tone]}`}>
            {icon}
          </span>
        )}
      </div>
      <p className={`mt-auto pt-2 font-semibold tracking-tight tabular-nums ${compact ? "text-xl" : "text-2xl"} ${VALUE_TONES[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </>
  );

  const base = `flex h-full flex-col rounded-xl border bg-white text-start shadow-xs ${compact ? "p-3" : "p-4"}`;
  const interactive = "transition hover:border-slate-300 hover:shadow-sm";
  const border = active ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200";

  if (href) {
    return <Link href={href} className={`${base} ${border} ${interactive}`}>{body}</Link>;
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={`${base} ${border} ${interactive}`}>
        {body}
      </button>
    );
  }
  return <div className={`${base} ${border}`}>{body}</div>;
}
