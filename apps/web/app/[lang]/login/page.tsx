import type { Metadata } from "next";
import AuthCard from "@/components/auth/auth-card";
import LoginForm from "@/components/auth/login-form";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  return { title: dictionaryFor(lang).auth.signIn };
}

export default async function LoginPage({ params }: PageProps<"/[lang]/login">) {
  const t = dictionaryFor((await params).lang);
  return (
    <AuthCard title={t.auth.signIn} subtitle={t.auth.signInSubtitle}>
      <LoginForm />
    </AuthCard>
  );
}
