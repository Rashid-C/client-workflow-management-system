import type { ReactNode } from "react";

/** Centered card for the signed-out pages (sign-in, password change). */
export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-2xl font-semibold tracking-tight">
          tickwise<span className="text-teal-700">.</span>
        </p>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mt-1 mb-5 text-sm text-slate-500">{subtitle}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
