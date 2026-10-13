import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export const MAX_STAGES = 30;

export class CreateTaskTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Stage names in the order the work happens. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_STAGES)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  stages!: string[];
}

export class UpdateTaskTypeDto extends CreateTaskTypeDto {
  @IsBoolean()
  isActive!: boolean;

  /** The version the editor loaded; a stale one is refused with 409. */
  @IsInt()
  @IsPositive()
  version!: number;
}

export class ListTaskTypesQuery {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;
}
