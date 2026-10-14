// Mirrors apps/api/src/clients (CLIENT_FIELDS and the DTO's allowed values).

export const ENTITY_TYPES = [
  "LLC",
  "Sole establishment",
  "Civil company",
  "Branch",
  "Joint stock company",
  "Partnership",
  "Individual",
  "Other",
] as const;
export const JURISDICTIONS = ["Mainland", "Free zone", "Offshore"] as const;
export const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];
export type Jurisdiction = (typeof JURISDICTIONS)[number];
export type Emirate = (typeof EMIRATES)[number];

export type PersonRef = { id: number; name: string };

/** A row of GET /clients. */
export type ClientSummary = {
  id: number;
  clientCode: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  emirate: Emirate | null;
  jurisdiction: Jurisdiction | null;
  vatTrn: string | null;
  isActive: boolean;
  accountManager: PersonRef | null;
  openTasks: number;
};

/** What staff edit; every optional field may be null (empty). */
export type ClientValues = {
  name: string;
  companyName: string | null;
  legalNameAr: string | null;
  entityType: EntityType | null;
  jurisdiction: Jurisdiction | null;
  freeZone: string | null;
  emirate: Emirate | null;
  tradeLicenseNumber: string | null;
  licenseAuthority: string | null;
  businessActivity: string | null;
  vatTrn: string | null;
  corporateTaxTrn: string | null;
  financialYearEndMonth: number | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactName: string | null;
  contactDesignation: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  accountManagerId: number | null;
  notes: string | null;
};

/** GET /clients/:id. */
export type ClientDetail = ClientValues & {
  id: number;
  clientCode: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  accountManager: PersonRef | null;
  openTasks: number;
  totalTasks: number;
};

export type AccountManagerOption = PersonRef & { designation: string };

export const EMPTY_CLIENT: ClientValues = {
  name: "",
  companyName: null,
  legalNameAr: null,
  entityType: null,
  jurisdiction: null,
  freeZone: null,
  emirate: null,
  tradeLicenseNumber: null,
  licenseAuthority: null,
  businessActivity: null,
  vatTrn: null,
  corporateTaxTrn: null,
  financialYearEndMonth: null,
  email: null,
  phone: null,
  address: null,
  contactName: null,
  contactDesignation: null,
  contactEmail: null,
  contactPhone: null,
  accountManagerId: null,
  notes: null,
};

/** The same checks the API makes, so most mistakes show before saving. */
export const TRN_PATTERN = /^[0-9]{15}$/;
export const PHONE_PATTERN = /^\+?[0-9(][0-9 ()-]{5,28}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "100 1234 5678 9003" → "100123456789003". */
export const compactTrn = (value: string) => value.replace(/[\s-]/g, "");

/** 12 → "December" / "ديسمبر". */
export function monthName(intlLocale: string, month: number): string {
  return new Intl.DateTimeFormat(intlLocale, { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2026, month - 1, 1)),
  );
}
