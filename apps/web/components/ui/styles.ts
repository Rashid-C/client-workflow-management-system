// Shared class names for controls, so every page draws them the same way.

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm" | "icon";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none";

// Filled buttons turn grey when disabled: a faded brand colour reads as "loading".
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-xs hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50",
  danger: "bg-red-600 text-white shadow-xs hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: "min-h-10 px-4 py-2 text-sm",
  sm: "min-h-8 px-3 py-1.5 text-xs",
  icon: "size-9 shrink-0",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]}`;
}

export const primaryButton = buttonClass("primary");
export const secondaryButton = buttonClass("secondary");

export const labelClass = "text-sm font-medium text-slate-800";

/** A form or page error the person needs to read before trying again. */
export const alertClass = "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700";

export const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-500";

/** The dashed box shown where a list has nothing in it. */
export const emptyClass = "rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-500";
