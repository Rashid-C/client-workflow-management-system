import { Suspense } from "react";
import TasksList from "@/components/tasks/tasks-list";

// The list reads its starting filters from the URL, which cacheComponents
// requires to happen inside Suspense.
export default function TasksPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500" aria-busy="true">…</p>}>
      <TasksList />
    </Suspense>
  );
}
