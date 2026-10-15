import { Suspense, use } from "react";
import LeadView from "@/components/leads/lead-view";
import { dictionaryFor } from "@/lib/i18n/dictionary";

// The id is only known per request, so it is read inside Suspense
// (required with cacheComponents).
export default function LeadPage(props: PageProps<"/[lang]/leads/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500" aria-busy="true">…</p>}>
      <Lead params={props.params} />
    </Suspense>
  );
}

function Lead({ params }: Pick<PageProps<"/[lang]/leads/[id]">, "params">) {
  const { id, lang } = use(params);
  const leadId = Number(id);
  if (!Number.isInteger(leadId) || leadId < 1) {
    return <p className="p-6 text-sm text-red-700">{dictionaryFor(lang).leads.notFound}</p>;
  }
  return <LeadView key={leadId} leadId={leadId} />;
}
