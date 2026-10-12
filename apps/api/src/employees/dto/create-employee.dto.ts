
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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

  @IsIn(['Super Admin', 'Manager', 'Staff'])
  role: string = 'Staff';

  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  joinedDate!: string;
}
