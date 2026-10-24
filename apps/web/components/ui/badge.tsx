import type { ReactNode } from "react";

const TONES = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  brand: "border-brand-200 bg-brand-50 text-brand-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  purple: "border-violet-200 bg-violet-50 text-violet-700",
} as const;

export type BadgeTone = keyof typeof TONES;

export const badgeClass = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export default function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`${badgeClass} ${TONES[tone]}`}>{children}</span>;
}
