// Mirrors apps/api/src/leads.

export const LEAD_STATUSES = ["New", "Contacted", "Proposal sent", "Won", "Lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_SOURCES = ["Referral", "Website", "Walk-in", "Phone", "Social media", "Other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const FOLLOW_UP_KINDS = ["Call", "Meeting", "Email", "WhatsApp", "Other"] as const;
export type FollowUpKind = (typeof FOLLOW_UP_KINDS)[number];
export const SERVICE_KEYS = [
  "audit",
  "icv",
  "accounting",
  "corporate_tax",
  "vat",
  "adnoc",
  "structuring",
  "consultancy",
  "compliance",
  "virtual_cfo",
  "tax_advisory",
  "incorporation",
] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

type PersonRef = { id: number; name: string };

export type Lead = {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  source: LeadSource | null;
  services: ServiceKey[];
  estimatedValue: number | null;
  status: LeadStatus;
  owner: PersonRef | null;
  nextFollowUpDate: string | null;
  followUpDue: boolean;
  lostReason: string | null;
  notes: string | null;
  client: { id: number; name: string; clientCode: string } | null;
  createdBy: PersonRef;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type FollowUp = {
  id: number;
  kind: FollowUpKind;
  note: string;
  happenedOn: string;
  createdBy: PersonRef;
  createdAt: string;
};

export type LeadDetail = Lead & { followUps: FollowUp[] };

export type LeadSummary = {
  byStatus: Record<LeadStatus, number>;
  followUpsDue: number;
  openValue: number;
};

export type OwnerOption = PersonRef & { designation: string };

export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  New: "border-sky-200 bg-sky-50 text-sky-800",
  Contacted: "border-navy-200 bg-navy-50 text-navy-700",
  "Proposal sent": "border-amber-200 bg-amber-50 text-amber-800",
  Won: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Lost: "border-slate-200 bg-slate-100 text-slate-600",
};

/** 12000 → "12,000" with Western digits in both languages. */
export const formatAmount = (value: number) => new Intl.NumberFormat("en-US").format(value);
