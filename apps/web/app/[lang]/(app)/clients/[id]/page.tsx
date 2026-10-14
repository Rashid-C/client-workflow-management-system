import { Suspense, use } from "react";
import ClientView from "@/components/clients/client-view";
import { dictionaryFor } from "@/lib/i18n/dictionary";

// The id is only known per request, so it is read inside Suspense
// (required with cacheComponents).
export default function ClientPage(props: PageProps<"/[lang]/clients/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500" aria-busy="true">…</p>}>
      <Client params={props.params} />
    </Suspense>
  );
}

function Client({ params }: Pick<PageProps<"/[lang]/clients/[id]">, "params">) {
  const { id, lang } = use(params);
  const clientId = Number(id);
  if (!Number.isInteger(clientId) || clientId < 1) {
    return <p className="p-6 text-sm text-red-700">{dictionaryFor(lang).clients.notFound}</p>;
  }
  return <ClientView key={clientId} clientId={clientId} />;
}
