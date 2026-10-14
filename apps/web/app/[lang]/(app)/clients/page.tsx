import type { Metadata } from 'next';
import ClientList from '@/components/clients/client-list';
import { dictionaryFor } from '@/lib/i18n/dictionary';

export async function generateMetadata({ params }: PageProps<'/[lang]/clients'>): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.clients.title, description: t.clients.subtitle };
}

export default async function ClientsPage({ params }: PageProps<'/[lang]/clients'>) {
  const t = dictionaryFor((await params).lang);

  return (
    <div className="mx-auto w-full max-w-[1600px] p-5 sm:p-7 lg:p-10">
      <header className="mb-6 border-b border-slate-200 pb-6">
        <p className="mb-2 text-sm font-medium text-brand-800">{t.clients.eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{t.clients.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t.clients.subtitle}</p>
      </header>

      <ClientList />
    </div>
  );
}
