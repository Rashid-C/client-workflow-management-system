import type { Metadata } from "next";
import AuthCard from "@/components/auth/auth-card";
import LoginForm from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthCard title="Sign in" subtitle="Use the email and password from your administrator.">
      <LoginForm />
    </AuthCard>
  );
}
