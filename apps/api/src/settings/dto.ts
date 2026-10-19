import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
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

const text = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

const digits = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const compact = value.replace(/[\s-]/g, '');
    return compact === '' ? null : compact;
  });

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export class UpdateSettingsDto {
  @text() @IsString() @IsNotEmpty() @MaxLength(200)
  companyName!: string;

  @IsOptional() @text() @IsString() @MaxLength(200)
  companyNameAr?: string | null;

  @IsOptional() @digits() @Matches(/^[0-9]{15}$/, { message: 'companyTrn must be 15 digits' })
  companyTrn?: string | null;

  @IsOptional() @text() @IsEmail() @MaxLength(254)
  email?: string | null;

  @IsOptional() @text() @Matches(/^\+?[0-9(][0-9 ()-]{5,28}$/)
  phone?: string | null;

  @IsOptional() @text() @IsString() @MaxLength(500)
  address?: string | null;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @ArrayUnique() @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })
  workingDays!: number[];

  @Matches(TIME, { message: 'workdayStart must look like 08:30' })
  workdayStart!: string;

  @Matches(TIME, { message: 'workdayEnd must look like 17:30' })
  workdayEnd!: string;

  @IsInt() @Min(0) @Max(365)
  documentReminderDays!: number;

  @IsInt() @IsPositive()
  version!: number;
}
