import type { Metadata } from "next";
import LeadList from "@/components/leads/lead-list";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/leads">): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.leads.title, description: t.leads.subtitle };
}

export default async function LeadsPage({ params }: PageProps<"/[lang]/leads">) {
  const t = dictionaryFor((await params).lang);

  return (
    <div className="mx-auto w-full max-w-7xl p-5 pb-10 text-slate-900 sm:p-7 lg:p-10">
      <header className="mb-6 border-b border-slate-200 pb-6">
        <p className="mb-2 text-sm font-medium text-brand-800">{t.leads.eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{t.leads.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t.leads.subtitle}</p>
      </header>

      <LeadList />
    </div>
  );
}
