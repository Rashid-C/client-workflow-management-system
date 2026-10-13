import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class ListAuditLogsQuery {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  actorEmployeeId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  /** First office day included, YYYY-MM-DD. */
  @IsOptional()
  @Matches(DAY, { message: 'from must use YYYY-MM-DD format' })
  from?: string;

  /** Last office day included, YYYY-MM-DD. */
  @IsOptional()
  @Matches(DAY, { message: 'to must use YYYY-MM-DD format' })
  to?: string;

  /** Cursor: return entries older than this id. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  before?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(200)
  limit?: number;
}
