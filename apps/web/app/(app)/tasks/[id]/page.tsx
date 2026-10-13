import { Suspense, use } from "react";
import TaskView from "@/components/tasks/task-view";

// The id is only known per request, so it is read inside Suspense
// (required with cacheComponents).
export default function TaskPage(props: PageProps<"/tasks/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading task...</p>}>
      <Task params={props.params} />
    </Suspense>
  );
}

function Task({ params }: Pick<PageProps<"/tasks/[id]">, "params">) {
  const { id } = use(params);
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId < 1) {
    return <p className="p-6 text-sm text-red-700">This task does not exist.</p>;
  }
  return <TaskView key={taskId} taskId={taskId} />;
}
