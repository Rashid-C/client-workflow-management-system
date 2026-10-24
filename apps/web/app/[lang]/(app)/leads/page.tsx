import type { Metadata } from "next";
import LeadList from "@/components/leads/lead-list";
import { Page, PageHeader } from "@/components/ui/page";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/leads">): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.leads.title, description: t.leads.subtitle };
}

export default async function LeadsPage({ params }: PageProps<"/[lang]/leads">) {
  const t = dictionaryFor((await params).lang);

  return (
    <Page>
      <PageHeader eyebrow={t.leads.eyebrow} title={t.leads.title} subtitle={t.leads.subtitle} />

      <LeadList />
    </Page>
  );
}
