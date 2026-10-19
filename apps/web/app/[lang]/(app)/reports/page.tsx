import type { Metadata } from "next";
import ReportsPage from "@/components/reports/reports-page";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.reports.title, description: t.reports.subtitle };
}

export default async function ReportsRoute({ params }: { params: Promise<{ lang: string }> }) {
  await params;
  return <ReportsPage />;
}
