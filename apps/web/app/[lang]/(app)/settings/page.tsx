import type { Metadata } from "next";
import SettingsForm from "@/components/settings/settings-form";
import { Page, PageHeader } from "@/components/ui/page";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/settings">): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.settings.title, description: t.settings.subtitle };
}

export default async function SettingsPage({ params }: PageProps<"/[lang]/settings">) {
  const t = dictionaryFor((await params).lang);

  return (
    <Page size="form">
      <PageHeader eyebrow={t.settings.eyebrow} title={t.settings.title} subtitle={t.settings.subtitle} />

      <SettingsForm />
    </Page>
  );
}
