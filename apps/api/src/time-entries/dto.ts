import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Matches, Max } from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class ListTimeEntriesQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  employeeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  clientId?: number;

  /** First office day included, YYYY-MM-DD. */
  @IsOptional()
  @Matches(DAY, { message: 'from must use YYYY-MM-DD format' })
  from?: string;

  /** Last office day included, YYYY-MM-DD. */
  @IsOptional()
  @Matches(DAY, { message: 'to must use YYYY-MM-DD format' })
  to?: string;

  /** Cursor from the previous page: "<workDate>_<id>". */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}_\d{1,10}$/, { message: 'before is not a valid cursor' })
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(200)
  limit?: number;
}
