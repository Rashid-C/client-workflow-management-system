import type { NotificationKind } from './notifications.service.js';

export type NotificationCopy = { title: string; body: string; link: string };

export function notificationCopy(
  kind: NotificationKind,
  language: 'en' | 'ar',
  values: { label: string; detail?: string; targetId: number },
): NotificationCopy {
  const ar = language === 'ar';
  const label = ar ? documentTypeArabic(values.label) : values.label;
  const text: Record<NotificationKind, { en: [string, string]; ar: [string, string] }> = {
    document_expiring: { en: ['Document expiring soon', `${values.label} for ${values.detail} is nearing expiry.`], ar: ['مستند يوشك على الانتهاء', `اقترب موعد انتهاء ${label} للعميل ${values.detail}.`] },
    document_expired: { en: ['Document expired', `${values.label} for ${values.detail} has expired.`], ar: ['انتهت صلاحية مستند', `انتهت صلاحية ${label} للعميل ${values.detail}.`] },
    lead_follow_up_due: { en: ['Lead follow-up due', `Follow up with ${values.label}.`], ar: ['متابعة عميل محتمل مستحقة', `حان موعد متابعة ${values.label}.`] },
    task_overdue: { en: ['Task overdue', `${values.label} is past its due date.`], ar: ['مهمة متأخرة', `تجاوزت المهمة ${values.label} تاريخ استحقاقها.`] },
    stage_assigned: { en: ['Stage assigned to you', `${values.label}: ${values.detail ?? ''}`], ar: ['أُسندت إليك مرحلة', `${values.label}: ${values.detail ?? ''}`] },
  };
  const [title, body] = text[kind][ar ? 'ar' : 'en'];
  const link = kind.startsWith('document_') ? `/documents?documentId=${values.targetId}`
    : kind === 'lead_follow_up_due' ? `/leads/${values.targetId}`
      : `/tasks/${values.targetId}`;
  return { title, body, link };
}

function documentTypeArabic(label: string) {
  const values: Record<string, string> = {
    'Trade licence': 'الرخصة التجارية',
    'VAT certificate': 'شهادة ضريبة القيمة المضافة',
    'Corporate tax certificate': 'شهادة ضريبة الشركات',
    'ICV certificate': 'شهادة القيمة المحلية المضافة',
    'ADNOC vendor registration': 'تسجيل مورد أدنوك',
    'Emirates ID': 'الهوية الإماراتية',
    Passport: 'جواز السفر',
    'Residence visa': 'تأشيرة الإقامة',
    'Tenancy contract (Ejari)': 'عقد الإيجار (إيجاري)',
    'Memorandum of association': 'عقد التأسيس',
    'Power of attorney': 'التوكيل الرسمي',
    Other: 'أخرى',
  };
  const titleStart = label.indexOf(' (');
  const type = titleStart < 0 ? label : label.slice(0, titleStart);
  return `${values[type] ?? type}${titleStart < 0 ? '' : label.slice(titleStart)}`;
}
