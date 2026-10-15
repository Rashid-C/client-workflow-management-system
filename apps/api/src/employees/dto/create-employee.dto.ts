import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../auth/password.js';

export const EMPLOYEE_STATUSES = ['Active', 'Inactive'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

/** The details staff edit; the code (EMP-001, …) is issued by the API. */
export class EmployeeDetailsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  designation!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  roleIds!: number[];

  // Shape only; the database rejects impossible dates such as 2026-02-31.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'joinedDate must use YYYY-MM-DD format',
  })
  joinedDate!: string;
}

const TEMPORARY_PASSWORD_RULE = {
  message: `temporaryPassword must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`,
};

export class CreateEmployeeDto extends EmployeeDetailsDto {
  @IsOptional()
  @IsIn(EMPLOYEE_STATUSES)
  status?: EmployeeStatus;

  // Issued by the admin; the employee must replace it at first sign-in.
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, TEMPORARY_PASSWORD_RULE)
  temporaryPassword!: string;
}

/** An edit sends every detail plus the version it was based on. */
export class UpdateEmployeeDto extends EmployeeDetailsDto {
  @IsInt()
  @IsPositive()
  version!: number;
}

export class ResetPasswordDto {
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, TEMPORARY_PASSWORD_RULE)
  temporaryPassword!: string;
}

export class UpdateEmployeeStatusDto {
  @IsIn(EMPLOYEE_STATUSES)
  status!: EmployeeStatus;
}
