import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PERMISSIONS, type PermissionKey, type PermissionScope } from './permissions.js';

const PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key);

const trimmed = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const text = value.trim();
    return text === '' ? null : text;
  });

export class PermissionGrantDto {
  @IsIn(PERMISSION_KEYS)
  key!: PermissionKey;

  @IsIn(['own', 'all'])
  scope!: PermissionScope;
}

/** A role as the editor saves it: the whole permission list each time. */
export class SaveRoleDto {
  @trimmed()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @trimmed()
  @IsString()
  @MaxLength(300)
  description?: string | null;

  @IsArray()
  @ArrayMaxSize(PERMISSIONS.length)
  @ValidateNested({ each: true })
  @Type(() => PermissionGrantDto)
  permissions!: PermissionGrantDto[];
}

export class UpdateRoleDto extends SaveRoleDto {
  @IsInt()
  @IsPositive()
  version!: number;
}
