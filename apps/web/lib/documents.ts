// Mirrors apps/api/src/documents.

export const DOCUMENT_TYPES = [
  "Trade licence",
  "VAT certificate",
  "Corporate tax certificate",
  "ICV certificate",
  "ADNOC vendor registration",
  "Emirates ID",
  "Passport",
  "Residence visa",
  "Tenancy contract (Ejari)",
  "Memorandum of association",
  "Power of attorney",
  "Other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ["Expired", "Expiring soon", "Valid", "No expiry"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export type DocumentRecord = {
  id: number;
  client: { id: number; name: string; clientCode: string };
  type: DocumentType;
  title: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  reminderDays: number;
  notes: string | null;
  status: DocumentStatus;
  /** Days until expiry in office time; negative once expired. */
  daysLeft: number | null;
  createdBy: { id: number; name: string };
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentSummary = Record<DocumentStatus, number>;

export const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, string> = {
  Expired: "border-red-200 bg-red-50 text-red-700",
  "Expiring soon": "border-amber-200 bg-amber-50 text-amber-800",
  Valid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "No expiry": "border-slate-200 bg-slate-50 text-slate-600",
};
