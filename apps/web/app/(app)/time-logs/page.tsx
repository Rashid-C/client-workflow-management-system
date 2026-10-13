import { connection } from "next/server";
import { Suspense } from "react";
import TimeLogsView from "@/components/time-logs/time-logs-view";
import { OFFICE_TIME_ZONE } from "@/lib/audit";

export default function TimeLogsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading time logs...</p>}>
      <TimeLogs />
    </Suspense>
  );
}

// "This month" depends on today, so it is worked out per request rather
// than baked into the prerendered page (cacheComponents).
async function TimeLogs() {
  await connection();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: OFFICE_TIME_ZONE }).format(new Date());
  return <TimeLogsView defaultFrom={`${today.slice(0, 8)}01`} />;
}
