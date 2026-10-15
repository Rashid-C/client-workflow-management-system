import type { Metadata } from "next";
import RolesManager from "@/components/roles/roles-manager";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/roles">): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.roles.title, description: t.roles.subtitle };
}

export default async function RolesPage({ params }: PageProps<"/[lang]/roles">) {
  const t = dictionaryFor((await params).lang);

  return (
    <div className="mx-auto w-full max-w-7xl p-5 pb-10 text-slate-900 sm:p-7 lg:p-10">
      <header className="mb-6 border-b border-slate-200 pb-6">
        <p className="mb-2 text-sm font-medium text-brand-800">{t.roles.eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{t.roles.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t.roles.subtitle}</p>
      </header>

      <RolesManager />
    </div>
  );
}
