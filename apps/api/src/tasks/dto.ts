import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { WORK_STATUSES, type WorkStatus } from './work-status.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayMessage = (field: string) => ({ message: `${field} must use YYYY-MM-DD format` });

export class StageAssignmentDto {
  @IsInt()
  @IsPositive()
  position!: number;

  @IsInt()
  @IsPositive()
  employeeId!: number;
}

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @IsPositive()
  clientId!: number;

  @IsInt()
  @IsPositive()
  taskTypeId!: number;

  @IsOptional()
  @Matches(DAY, dayMessage('dueDate'))
  dueDate?: string;

  /** Optional: stages can also be assigned later or handed over. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => StageAssignmentDto)
  assignees?: StageAssignmentDto[];
}

export class UpdateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** null clears the due date. */
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @Matches(DAY, dayMessage('dueDate'))
  dueDate?: string | null;

  @IsInt()
  @IsPositive()
  version!: number;
}

export class ListTasksQuery {
  @IsOptional()
  @IsIn(WORK_STATUSES)
  status?: WorkStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  clientId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  assigneeId?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  overdue?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeArchived?: boolean;

  /** Not completed yet. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  open?: boolean;

  /** Has an open stage nobody is assigned to. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unassigned?: boolean;

  /** Title text, or a reference number such as "#0004" or "4". */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

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

/** Time spent, recorded against the stage. */
class TimeFields {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720, { message: 'A single time entry can be at most 12 hours' })
  minutes?: number;

  /** The office day the work was done; defaults to today. */
  @IsOptional()
  @Matches(DAY, dayMessage('workDate'))
  workDate?: string;
}

// Not `extends TimeFields`: there minutes is optional, and class-validator
// keeps the parent's @IsOptional even when a subclass redeclares the field.
export class CompleteStageDto {
  /** Required: completing a stage always records the time spent. */
  @IsInt({ message: 'Enter the time spent in whole minutes' })
  @Min(1)
  @Max(720, { message: 'A single time entry can be at most 12 hours' })
  minutes!: number;

  @IsOptional()
  @Matches(DAY, dayMessage('workDate'))
  workDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  /** Who takes the next stage. */
  @IsOptional()
  @IsInt()
  @IsPositive()
  nextAssigneeId?: number;
}

export class BlockStageDto extends TimeFields {
  @IsString()
  @IsNotEmpty({ message: 'Say why the stage is blocked' })
  @MaxLength(2000)
  reason!: string;
}

export class ReassignStageDto extends TimeFields {
  /** null unassigns the stage. */
  @ValidateIf((_object, value) => value !== null)
  @IsInt()
  @IsPositive()
  assigneeId!: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ReopenStageDto {
  @IsString()
  @IsNotEmpty({ message: 'Say why the stage is reopened' })
  @MaxLength(2000)
  comment!: string;
}
