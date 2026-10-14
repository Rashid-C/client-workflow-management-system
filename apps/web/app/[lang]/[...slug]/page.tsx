import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/[...slug]">): Promise<Metadata> {
  const { lang } = await params;
  const isArabic = lang === "ar";
  return {
    title: isArabic ? "الصفحة غير موجودة" : "Page not found",
    description: isArabic
      ? "الصفحة التي تبحث عنها غير موجودة في Tickwise."
      : "The page you are looking for could not be found in Tickwise.",
  };
}

export default function UnmatchedPage() {
  notFound();
}
