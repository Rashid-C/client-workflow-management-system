import type { Metadata } from "next";
import SettingsForm from "@/components/settings/settings-form";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/settings">): Promise<Metadata> {
  const t = dictionaryFor((await params).lang);
  return { title: t.settings.title, description: t.settings.subtitle };
}

export default async function SettingsPage({ params }: PageProps<"/[lang]/settings">) {
  const t = dictionaryFor((await params).lang);

  return (
    <div className="mx-auto w-full max-w-4xl p-5 pb-10 text-slate-900 sm:p-7 lg:p-10">
      <header className="mb-6 border-b border-slate-200 pb-6">
        <p className="mb-2 text-sm font-medium text-brand-800">{t.settings.eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{t.settings.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t.settings.subtitle}</p>
      </header>

      <SettingsForm />
    </div>
  );
}
