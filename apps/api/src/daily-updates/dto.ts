import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches, MaxLength } from 'class-validator';

const text = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

export class SaveDailyUpdateDto {
  @text() @IsString() @IsNotEmpty() @MaxLength(4000)
  done!: string;

  @IsOptional() @text() @IsString() @MaxLength(2000)
  plan?: string | null;

  @IsOptional() @text() @IsString() @MaxLength(2000)
  blockers?: string | null;

  /** The version being edited; leave out for the day's first post. */
  @IsOptional() @IsInt() @IsPositive()
  version?: number;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class DailyUpdateQueryDto {
  @IsOptional() @Matches(DAY, { message: 'day must use YYYY-MM-DD format' })
  day?: string;

  @IsOptional() @Type(() => Number) @IsInt() @IsPositive()
  employeeId?: number;

  /** Keyset cursor: updates older than this id. */
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive()
  before?: number;
}

export class MissingQueryDto {
  @IsOptional() @Matches(DAY, { message: 'day must use YYYY-MM-DD format' })
  day?: string;
}
