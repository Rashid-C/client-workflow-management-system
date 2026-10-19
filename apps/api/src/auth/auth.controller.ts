import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Res,
  Version,
} from '@nestjs/common';
import type { Response } from 'express';
import { Audit } from '../audit/audit-context.decorator.js';
import type { AuditContext } from '../audit/audit.service.js';
import { AuthService } from './auth.service.js';
import {
  AllowPendingPassword,
  CurrentUser,
  Public,
} from './decorators.js';
import { ChangePasswordDto, LoginDto, SetLanguageDto, SetNotificationPreferencesDto } from './dto.js';
import { SESSION_COOKIE, type AuthUser } from './session.js';

const cookieOptions = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Version('1')
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() data: LoginDto,
    @Audit() audit: AuditContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, expiresAt, user } = await this.authService.login(
      data.email,
      data.password,
      audit,
    );

    response.cookie(SESSION_COOKIE, token, { ...cookieOptions, expires: expiresAt });
    return toMe(user);
  }

  @Version('1')
  @AllowPendingPassword()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @CurrentUser() user: AuthUser,
    @Audit() audit: AuditContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user, audit);
    response.clearCookie(SESSION_COOKIE, cookieOptions);
  }

  @Version('1')
  @AllowPendingPassword()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return toMe(user);
  }

  @Version('1')
  @AllowPendingPassword()
  @Put('me/language')
  @HttpCode(204)
  async setLanguage(@CurrentUser() user: AuthUser, @Body() data: SetLanguageDto) {
    await this.authService.setLanguage(user, data.language);
  }

  @Version('1')
  @AllowPendingPassword()
  @Put('me/notifications')
  @HttpCode(204)
  async setNotificationPreferences(
    @CurrentUser() user: AuthUser,
    @Body() data: SetNotificationPreferencesDto,
    @Audit() audit: AuditContext,
  ) {
    await this.authService.setEmailNotifications(user, data.emailNotificationsEnabled, audit);
  }

  @Version('1')
  @AllowPendingPassword()
  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() data: ChangePasswordDto,
    @Audit() audit: AuditContext,
  ) {
    await this.authService.changePassword(
      user,
      data.currentPassword,
      data.newPassword,
      audit,
    );
  }
}

// The session id stays server-side.
function toMe({ sessionId: _sessionId, ...user }: AuthUser) {
  return user;
}
