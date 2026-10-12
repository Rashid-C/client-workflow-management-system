import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  Version,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import {
  AllowPendingPassword,
  CurrentUser,
  Public,
} from './decorators.js';
import { ChangePasswordDto, LoginDto } from './dto.js';
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
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, expiresAt, user } = await this.authService.login(
      data.email,
      data.password,
      { ipAddress: request.ip, userAgent: request.headers['user-agent'] },
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
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.sessionId);
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
  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() data: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user,
      data.currentPassword,
      data.newPassword,
    );
  }
}

// The session id stays server-side.
function toMe({ sessionId: _sessionId, ...user }: AuthUser) {
  return user;
}
