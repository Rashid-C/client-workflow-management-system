import type { Metadata } from "next";
import NotificationsPage from "@/components/notifications/notifications-page";
import { dictionaryFor } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return { title: dictionaryFor((await params).lang).notifications.title };
}

export default function Page() {
  return <NotificationsPage />;
}
