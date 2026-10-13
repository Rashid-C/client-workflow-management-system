import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { MyWorkItem } from "@/lib/dashboard";
import { formatDay, isOverdue, STATUS_STYLES, taskRef } from "@/lib/tasks";

/** Open stages assigned to the signed-in person, earliest due date first. */
export default function MyWorkList({ items }: { items: MyWorkItem[] }) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm font-medium">Nothing assigned to you</p>
        <p className="mt-1 text-xs text-slate-500">Stages assigned to you will show up here.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => {
        const overdue = isOverdue({ dueDate: item.task.dueDate, status: item.task.status });
        return (
          <li key={`${item.task.id}-${item.stage.position}`}>
            <Link
              href={`/tasks/${item.task.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    <span className="text-slate-400">{taskRef(item.task.id)}</span> {item.task.title}
                  </p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[item.stage.status]}`}>
                    {item.stage.status}
                  </span>
                  {item.waiting && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                      Waiting on earlier stage
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {item.client.name} · Stage {item.stage.position}: {item.stage.name}
                </p>
              </div>
              {item.task.dueDate && (
                <span className={`shrink-0 text-xs ${overdue ? "font-semibold text-red-700" : "text-slate-500"}`}>
                  Due {formatDay(item.task.dueDate)}
                </span>
              )}
              <ChevronRight size={16} className="shrink-0 text-slate-300" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
