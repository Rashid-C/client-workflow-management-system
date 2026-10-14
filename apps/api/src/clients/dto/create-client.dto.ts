import { Transform } from 'class-transformer';
import {
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

export const ENTITY_TYPES = [
  'LLC',
  'Sole establishment',
  'Civil company',
  'Branch',
  'Joint stock company',
  'Partnership',
  'Individual',
  'Other',
] as const;
export const JURISDICTIONS = ['Mainland', 'Free zone', 'Offshore'] as const;
export const EMIRATES = [
  'Abu Dhabi',
  'Dubai',
  'Sharjah',
  'Ajman',
  'Umm Al Quwain',
  'Ras Al Khaimah',
  'Fujairah',
] as const;

/** Trims text; blank becomes null so "cleared" and "never set" look the same. */
const text = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

/** A TRN as typed ("100 1234 5678 9003") → digits only. */
const digits = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const compact = value.replace(/[\s-]/g, '');
    return compact === '' ? null : compact;
  });

// Phone numbers as people write them: +971 50 123 4567, (02) 555-1234.
const PHONE = /^\+?[0-9(][0-9 ()-]{5,28}$/;
const TRN = /^[0-9]{15}$/;

/**
 * Everything staff can set on a client. The client code is not here: the
 * API issues it (CL-0001, …). Optional fields accept null to clear them.
 */
export class CreateClientDto {
  @text()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional() @text() @IsString() @MaxLength(200)
  companyName?: string | null;

  @IsOptional() @text() @IsString() @MaxLength(200)
  legalNameAr?: string | null;

  @IsOptional() @text() @IsEmail() @MaxLength(254)
  email?: string | null;

  @IsOptional() @text() @Matches(PHONE)
  phone?: string | null;

  @IsOptional() @text() @IsString() @MaxLength(500)
  address?: string | null;

  @IsOptional() @text() @IsString() @MaxLength(2000)
  notes?: string | null;

  @IsOptional() @IsIn(ENTITY_TYPES)
  entityType?: (typeof ENTITY_TYPES)[number] | null;

  @IsOptional() @IsIn(JURISDICTIONS)
  jurisdiction?: (typeof JURISDICTIONS)[number] | null;

  @IsOptional() @text() @IsString() @MaxLength(100)
  freeZone?: string | null;

  @IsOptional() @IsIn(EMIRATES)
  emirate?: (typeof EMIRATES)[number] | null;

  @IsOptional() @text() @IsString() @MaxLength(50)
  tradeLicenseNumber?: string | null;

  @IsOptional() @text() @IsString() @MaxLength(100)
  licenseAuthority?: string | null;

  @IsOptional() @text() @IsString() @MaxLength(300)
  businessActivity?: string | null;

  @IsOptional() @digits() @Matches(TRN, { message: 'vatTrn must be 15 digits' })
  vatTrn?: string | null;

  @IsOptional() @digits() @Matches(TRN, { message: 'corporateTaxTrn must be 15 digits' })
  corporateTaxTrn?: string | null;

  @IsOptional() @IsInt() @Min(1) @Max(12)
  financialYearEndMonth?: number | null;

  @IsOptional() @text() @IsString() @MaxLength(150)
  contactName?: string | null;

  @IsOptional() @text() @IsString() @MaxLength(100)
  contactDesignation?: string | null;

  @IsOptional() @text() @IsEmail() @MaxLength(254)
  contactEmail?: string | null;

  @IsOptional() @text() @Matches(PHONE)
  contactPhone?: string | null;

  @IsOptional() @IsInt() @IsPositive()
  accountManagerId?: number | null;
}

/** An edit sends the whole form plus the version it was based on. */
export class UpdateClientDto extends CreateClientDto {
  @IsInt()
  @IsPositive()
  version!: number;
}

export class ArchiveClientDto {
  @IsOptional() @text() @IsString() @MaxLength(500)
  reason?: string | null;
}
