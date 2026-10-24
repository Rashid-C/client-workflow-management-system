import type { Metadata } from "next";
import { Suspense } from "react";
import DocumentList from "@/components/documents/document-list";
import { Page, PageHeader } from "@/components/ui/page";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/documents">): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.documents.title, description: t.documents.subtitle };
}

export default async function DocumentsPage({ params, searchParams }: PageProps<"/[lang]/documents">) {
  const t = dictionaryFor((await params).lang);
  return (
    <Page>
      <PageHeader eyebrow={t.documents.eyebrow} title={t.documents.title} subtitle={t.documents.subtitle} />
      <Suspense fallback={<div className="min-h-96" />}>
        <DocumentListFromSearch searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function DocumentListFromSearch({ searchParams }: { searchParams: Promise<{ documentId?: string; status?: string }> }) {
  const search = await searchParams;
  const requestedId = Number(search.documentId);
  const documentId = Number.isInteger(requestedId) && requestedId > 0 ? requestedId : undefined;
  return <DocumentList documentId={documentId} initialStatus={search.status === "attention" ? "attention" : ""} />;
}
