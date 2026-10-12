import type { Metadata } from "next";
import AuthCard from "@/components/auth/auth-card";
import ChangePasswordForm from "@/components/auth/change-password-form";

export const metadata: Metadata = {
  title: "Change password",
};

export default function ChangePasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Replace your temporary password before you continue. Other devices will be signed out."
    >
      <ChangePasswordForm />
    </AuthCard>
  );
}
