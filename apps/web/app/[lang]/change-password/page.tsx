import type { Metadata } from "next";
import AuthCard from "@/components/auth/auth-card";
import ChangePasswordForm from "@/components/auth/change-password-form";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/change-password">): Promise<Metadata> {
  const { lang } = await params;
  return { title: dictionaryFor(lang).auth.changePassword };
}

export default async function ChangePasswordPage({ params }: PageProps<"/[lang]/change-password">) {
  const t = dictionaryFor((await params).lang);
  return (
    <AuthCard title={t.auth.changePasswordTitle} subtitle={t.auth.changePasswordSubtitle}>
      <ChangePasswordForm />
    </AuthCard>
  );
}
