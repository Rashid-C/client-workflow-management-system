import { Suspense, use } from "react";
import TaskTypeEditor from "@/components/task-types/task-type-editor";

// The id is only known per request, so it is read inside Suspense
// (required with cacheComponents).
export default function TaskTypePage(props: PageProps<"/task-types/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading task type...</p>}>
      <Editor params={props.params} />
    </Suspense>
  );
}

function Editor({ params }: Pick<PageProps<"/task-types/[id]">, "params">) {
  const { id } = use(params);
  const typeId = id === "new" ? null : Number(id);

  if (typeId !== null && !Number.isInteger(typeId)) {
    return <p className="p-6 text-sm text-red-700">This task type does not exist.</p>;
  }

  // key: a fresh editor when moving from /new to the created type.
  return <TaskTypeEditor key={id} typeId={typeId} />;
}
