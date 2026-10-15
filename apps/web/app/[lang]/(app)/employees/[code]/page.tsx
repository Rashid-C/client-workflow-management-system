import { Suspense, use } from "react";
import EmployeeView from "@/components/employees/employee-view";

// The code is only known per request, so it is read inside Suspense
// (required with cacheComponents).
export default function EmployeePage(props: PageProps<"/[lang]/employees/[code]">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500" aria-busy="true">…</p>}>
      <Employee params={props.params} />
    </Suspense>
  );
}

function Employee({ params }: Pick<PageProps<"/[lang]/employees/[code]">, "params">) {
  const { code } = use(params);
  const employeeCode = decodeURIComponent(code);
  return <EmployeeView key={employeeCode} employeeCode={employeeCode} />;
}
