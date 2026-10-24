import type { Metadata } from "next";
import RolesManager from "@/components/roles/roles-manager";
import { Page, PageHeader } from "@/components/ui/page";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/roles">): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.roles.title, description: t.roles.subtitle };
}

export default async function RolesPage({ params }: PageProps<"/[lang]/roles">) {
  const t = dictionaryFor((await params).lang);

  return (
    <Page>
      <PageHeader eyebrow={t.roles.eyebrow} title={t.roles.title} subtitle={t.roles.subtitle} />

      <RolesManager />
    </Page>
  );
}
