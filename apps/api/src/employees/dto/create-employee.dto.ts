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

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employeeCode!: string;

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

  @IsOptional()
  @IsIn(EMPLOYEE_STATUSES)
  status?: EmployeeStatus;

  // Shape only; the database rejects impossible dates such as 2026-02-31.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'joinedDate must use YYYY-MM-DD format',
  })
  joinedDate!: string;

  // Issued by the admin; the employee must replace it at first sign-in.
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: `temporaryPassword must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`,
  })
  temporaryPassword!: string;
}

export class UpdateEmployeeStatusDto {
  @IsIn(EMPLOYEE_STATUSES)
  status!: EmployeeStatus;
}
