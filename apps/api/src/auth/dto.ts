import { IsBoolean, IsEmail, IsIn, IsString, Length, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './password.js';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // No minimum here: a login attempt is checked, not judged.
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  password!: string;
}

export class SetLanguageDto {
  @IsIn(['en', 'ar'])
  language!: 'en' | 'ar';
}

export class SetNotificationPreferencesDto {
  @IsBoolean()
  emailNotificationsEnabled!: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: `newPassword must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`,
  })
  newPassword!: string;
}
