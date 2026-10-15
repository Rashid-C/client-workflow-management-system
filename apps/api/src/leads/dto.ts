import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const LEAD_STATUSES = ['New', 'Contacted', 'Proposal sent', 'Won', 'Lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const OPEN_LEAD_STATUSES: readonly LeadStatus[] = ['New', 'Contacted', 'Proposal sent'];

export const LEAD_SOURCES = ['Referral', 'Website', 'Walk-in', 'Phone', 'Social media', 'Other'] as const;
export const FOLLOW_UP_KINDS = ['Call', 'Meeting', 'Email', 'WhatsApp', 'Other'] as const;

// The firm's services (public site); the web app names them.
export const SERVICE_KEYS = [
  'audit',
  'icv',
  'accounting',
  'corporate_tax',
  'vat',
  'adnoc',
  'structuring',
  'consultancy',
  'compliance',
  'virtual_cfo',
  'tax_advisory',
  'incorporation',
] as const;

const text = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^\+?[0-9(][0-9 ()-]{5,28}$/;

export class SaveLeadDto {
  @text() @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @IsOptional() @text() @IsString() @MaxLength(150)
  contactName?: string | null;

  @IsOptional() @text() @IsEmail() @MaxLength(254)
  email?: string | null;

  @IsOptional() @text() @Matches(PHONE)
  phone?: string | null;

  @IsOptional() @IsIn(LEAD_SOURCES)
  source?: (typeof LEAD_SOURCES)[number] | null;

  @IsOptional() @IsArray() @ArrayUnique() @ArrayMaxSize(SERVICE_KEYS.length) @IsIn(SERVICE_KEYS, { each: true })
  services?: (typeof SERVICE_KEYS)[number][];

  @IsOptional() @IsInt() @Min(0) @Max(1_000_000_000)
  estimatedValue?: number | null;

  @IsOptional() @IsIn(LEAD_STATUSES)
  status?: LeadStatus;

  @IsOptional() @IsInt() @IsPositive()
  ownerId?: number | null;

  @IsOptional() @text() @Matches(DAY, { message: 'nextFollowUpDate must use YYYY-MM-DD format' })
  nextFollowUpDate?: string | null;

  @IsOptional() @text() @IsString() @MaxLength(300)
  lostReason?: string | null;

  @IsOptional() @text() @IsString() @MaxLength(2000)
  notes?: string | null;
}

export class UpdateLeadDto extends SaveLeadDto {
  @IsInt() @IsPositive()
  version!: number;
}

export class FollowUpDto {
  @IsIn(FOLLOW_UP_KINDS)
  kind!: (typeof FOLLOW_UP_KINDS)[number];

  @text() @IsString() @IsNotEmpty() @MaxLength(2000)
  note!: string;

  @Matches(DAY, { message: 'happenedOn must use YYYY-MM-DD format' })
  happenedOn!: string;

  /** Undefined keeps the planned date; null clears it. */
  @IsOptional() @text() @Matches(DAY, { message: 'nextFollowUpDate must use YYYY-MM-DD format' })
  nextFollowUpDate?: string | null;
}

export class LeadQueryDto {
  @IsOptional() @IsIn(LEAD_STATUSES)
  status?: LeadStatus;

  @IsOptional() @IsIn(['true'])
  due?: 'true';

  @IsOptional() @IsString() @MaxLength(100)
  search?: string;
}
