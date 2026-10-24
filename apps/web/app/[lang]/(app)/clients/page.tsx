import type { Metadata } from 'next';
import ClientList from '@/components/clients/client-list';
import { Page, PageHeader } from '@/components/ui/page';
import { dictionaryFor } from '@/lib/i18n/dictionary';

export async function generateMetadata({ params }: PageProps<'/[lang]/clients'>): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.clients.title, description: t.clients.subtitle };
}

export default async function ClientsPage({ params }: PageProps<'/[lang]/clients'>) {
  const t = dictionaryFor((await params).lang);

  return (
    <Page size='wide'>
      <PageHeader eyebrow={t.clients.eyebrow} title={t.clients.title} subtitle={t.clients.subtitle} />

      <ClientList />
    </Page>
  );
}
