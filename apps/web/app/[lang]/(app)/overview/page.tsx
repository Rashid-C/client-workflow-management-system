import type { Metadata } from "next";
import OverviewPage from "@/components/dashboard/overview-page";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/overview">): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.dashboard.title, description: t.dashboard.subtitle };
}

export default function OverviewRoute() {
  return <OverviewPage />;
}
