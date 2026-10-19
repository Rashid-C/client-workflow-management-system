export type NotificationKind =
  | "document_expiring"
  | "document_expired"
  | "lead_follow_up_due"
  | "task_overdue"
  | "stage_assigned";

export type NotificationItem = {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = { items: NotificationItem[]; nextCursor: string | null };

export function notificationTime(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    timeZone: "Asia/Dubai",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
