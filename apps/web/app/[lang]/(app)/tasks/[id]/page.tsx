import { Suspense, use } from "react";
import TaskView from "@/components/tasks/task-view";
import { dictionaryFor } from "@/lib/i18n/dictionary";

// The id is only known per request, so it is read inside Suspense
// (required with cacheComponents).
export default function TaskPage(props: PageProps<"/[lang]/tasks/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500" aria-busy="true">…</p>}>
      <Task params={props.params} />
    </Suspense>
  );
}

function Task({ params }: Pick<PageProps<"/[lang]/tasks/[id]">, "params">) {
  const { id, lang } = use(params);
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId < 1) {
    return <p className="p-6 text-sm text-red-700">{dictionaryFor(lang).tasks.notFound}</p>;
  }
  return <TaskView key={taskId} taskId={taskId} />;
}
