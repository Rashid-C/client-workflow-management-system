import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const LANGUAGES = ['en', 'ar'] as const;
const STATUSES = ['Pending', 'In progress', 'Completed', 'Blocked', 'New', 'Contacted', 'Proposal sent', 'Won', 'Lost'] as const;

export class ReportQueryDto {
  @IsOptional() @Matches(DAY) from?: string;
  @IsOptional() @Matches(DAY) to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) employeeId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) clientId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) taskTypeId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) days?: number;
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @IsOptional() @IsIn(LANGUAGES) lang?: (typeof LANGUAGES)[number];
}
