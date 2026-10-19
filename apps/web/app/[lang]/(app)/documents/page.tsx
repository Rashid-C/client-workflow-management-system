import type { Metadata } from "next";
import { Suspense } from "react";
import DocumentList from "@/components/documents/document-list";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/documents">): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.documents.title, description: t.documents.subtitle };
}

export default async function DocumentsPage({ params, searchParams }: PageProps<"/[lang]/documents">) {
  const t = dictionaryFor((await params).lang);
  return (
    <div className="mx-auto w-full max-w-7xl p-5 pb-10 text-slate-900 sm:p-7 lg:p-10">
      <header className="mb-6 border-b border-slate-200 pb-6">
        <p className="mb-2 text-sm font-medium text-brand-800">{t.documents.eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{t.documents.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t.documents.subtitle}</p>
      </header>
      <Suspense fallback={<div className="min-h-96" />}>
        <DocumentListFromSearch searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DocumentListFromSearch({ searchParams }: { searchParams: Promise<{ documentId?: string }> }) {
  const requestedId = Number((await searchParams).documentId);
  const documentId = Number.isInteger(requestedId) && requestedId > 0 ? requestedId : undefined;
  return <DocumentList documentId={documentId} />;
}
