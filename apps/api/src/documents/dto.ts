import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const DOCUMENT_TYPES = [
  'Trade licence',
  'VAT certificate',
  'Corporate tax certificate',
  'ICV certificate',
  'ADNOC vendor registration',
  'Emirates ID',
  'Passport',
  'Residence visa',
  'Tenancy contract (Ejari)',
  'Memorandum of association',
  'Power of attorney',
  'Other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ['Expired', 'Expiring soon', 'Valid', 'No expiry'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** Trims text; blank becomes null. */
const text = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

// Shape only; the database rejects impossible dates such as 2026-02-31.
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class SaveDocumentDto {
  @IsInt()
  @IsPositive()
  clientId!: number;

  @IsIn(DOCUMENT_TYPES)
  type!: DocumentType;

  @IsOptional() @text() @IsString() @MaxLength(150)
  title?: string | null;

  @IsOptional() @text() @IsString() @MaxLength(60)
  documentNumber?: string | null;

  @IsOptional() @text() @Matches(DAY, { message: 'issueDate must use YYYY-MM-DD format' })
  issueDate?: string | null;

  @IsOptional() @text() @Matches(DAY, { message: 'expiryDate must use YYYY-MM-DD format' })
  expiryDate?: string | null;

  @IsOptional() @IsInt() @Min(0) @Max(365)
  reminderDays?: number;

  @IsOptional() @text() @IsString() @MaxLength(1000)
  notes?: string | null;
}

export class UpdateDocumentDto extends SaveDocumentDto {
  @IsInt()
  @IsPositive()
  version!: number;
}

export class DocumentQueryDto {
  @IsOptional() @IsIn([...DOCUMENT_STATUSES, 'attention'])
  status?: DocumentStatus | 'attention';

  @IsOptional() @Type(() => Number) @IsInt() @IsPositive()
  clientId?: number;

  @IsOptional() @IsIn(DOCUMENT_TYPES)
  type?: DocumentType;

  @IsOptional() @IsString() @MaxLength(100)
  search?: string;
}
