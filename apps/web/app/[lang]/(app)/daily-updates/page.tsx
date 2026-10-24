import type { Metadata } from "next";
import DailyUpdatesView from "@/components/daily-updates/daily-updates-view";
import { Page, PageHeader } from "@/components/ui/page";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/daily-updates">): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.dailyUpdates.title, description: t.dailyUpdates.subtitle };
}

export default async function DailyUpdatesPage({ params }: PageProps<"/[lang]/daily-updates">) {
  const t = dictionaryFor((await params).lang);

  return (
    <Page>
      <PageHeader eyebrow={t.dailyUpdates.eyebrow} title={t.dailyUpdates.title} subtitle={t.dailyUpdates.subtitle} />

      <DailyUpdatesView />
    </Page>
  );
}
