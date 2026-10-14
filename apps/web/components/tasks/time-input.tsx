"use client";

import { useI18n } from "@/components/i18n/i18n-provider";
import { inputClass } from "@/components/ui/modal";

const QUICK_PICKS = [15, 30, 60, 120, 240];

/** Hours + minutes with quick picks from 15 minutes to 4 hours (slide 14). */
export default function TimeInput({
  id,
  label,
  required = false,
  minutes,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const { t, minutes: formatMinutes } = useI18n();
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const set = (h: number, m: number) =>
    onChange(Math.max(0, Math.min(12 * 60, (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0))));

  return (
    <fieldset>
      <legend className="text-sm font-medium">
        {label} {required && <span aria-hidden="true">*</span>}
      </legend>
      <div className="mt-1.5 flex gap-2">
        <label className="flex flex-1 items-center gap-1">
          <input
            id={`${id}-hours`}
            type="number"
            inputMode="numeric"
            min={0}
            max={12}
            value={hours || ""}
            placeholder="0"
            onChange={(event) => set(Number(event.target.value), rest)}
            className={`${inputClass} mt-0`}
            aria-label={t.tasks.hoursLabel(label)}
          />
          <span className="text-sm text-slate-500">{t.duration.hourUnit}</span>
        </label>
        <label className="flex flex-1 items-center gap-1">
          <input
            id={`${id}-minutes`}
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={rest || ""}
            placeholder="0"
            onChange={(event) => set(hours, Math.min(59, Number(event.target.value)))}
            className={`${inputClass} mt-0`}
            aria-label={t.tasks.minutesLabel(label)}
          />
          <span className="text-sm text-slate-500">{t.duration.minuteUnit}</span>
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_PICKS.map((pick) => (
          <button
            key={pick}
            type="button"
            onClick={() => onChange(pick)}
            aria-pressed={minutes === pick}
            className={[
              "rounded-full border px-3 py-1 text-xs",
              minutes === pick
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 text-slate-700 hover:bg-slate-100",
            ].join(" ")}
          >
            {formatMinutes(pick)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
