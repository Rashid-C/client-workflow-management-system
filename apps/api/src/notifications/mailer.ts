import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type { CustomAuthenticationContext } from 'nodemailer/lib/smtp-connection/index.js';

export type DigestMessage = { title: string; body: string; link: string }[];

export interface Mailer {
  readonly enabled: boolean;
  sendDigest(to: string, language: 'en' | 'ar', messages: DigestMessage): Promise<void>;
}

@Injectable()
export class SmtpMailer implements Mailer, OnModuleInit {
  private readonly logger = new Logger(SmtpMailer.name);
  private transport: Transporter | null = null;
  private token: { value: string; expiresAt: number } | null = null;
  private tokenRequest: Promise<string> | null = null;
  get enabled() { return this.transport !== null; }

  onModuleInit() {
    const host = process.env['MAIL_HOST'];
    const missing = ['MAIL_TENANT_ID', 'MAIL_CLIENT_ID', 'MAIL_CLIENT_SECRET', 'MAIL_USER']
      .filter((key) => !process.env[key]);
    if (!host) {
      this.logger.warn('Email is disabled because MAIL_HOST is not configured.');
      return;
    }
    if (missing.length) {
      this.logger.warn(`Email is disabled because required Microsoft 365 OAuth settings are missing: ${missing.join(', ')}.`);
      return;
    }
    const port = Number(process.env['MAIL_PORT'] || 587);
    this.transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      authMethod: 'XOAUTH2',
      auth: { type: 'OAuth2', user: process.env['MAIL_USER']! },
      customAuth: {
        XOAUTH2: async (context: CustomAuthenticationContext) => {
          const accessToken = await this.getAccessToken();
          const user = context.auth.user;
          const response = Buffer.from(`user=${user}\x01auth=Bearer ${accessToken}\x01\x01`).toString('base64');
          await context.sendCommand(`AUTH XOAUTH2 ${response}`);
          context.resolve();
          return true;
        },
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    if (this.tokenRequest) return this.tokenRequest;
    const tenant = process.env['MAIL_TENANT_ID']!;
    const body = new URLSearchParams({
      client_id: process.env['MAIL_CLIENT_ID']!,
      client_secret: process.env['MAIL_CLIENT_SECRET']!,
      scope: 'https://outlook.office365.com/.default',
      grant_type: 'client_credentials',
    });
    this.tokenRequest = fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Microsoft 365 OAuth token request failed (${response.status}).`);
      const data = await response.json() as { access_token?: string; expires_in?: number };
      if (!data.access_token) throw new Error('Microsoft 365 OAuth token response did not include an access token.');
      this.token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
      return data.access_token;
    }).finally(() => { this.tokenRequest = null; });
    return this.tokenRequest;
  }

  async sendDigest(to: string, language: 'en' | 'ar', messages: DigestMessage) {
    if (!this.transport) return;
    const from = process.env['MAIL_FROM'] || process.env['MAIL_USER'];
    if (!from) throw new Error('MAIL_FROM or MAIL_USER must be configured when email is enabled.');
    const subject = language === 'ar' ? '\u0625\u0634\u0639\u0627\u0631\u0627\u062a\u0643 \u0627\u0644\u064a\u0648\u0645\u064a\u0629' : 'Your daily notifications';
    const rows = messages.map(({ title, body, link }) =>
      `<li><a href="${escapeHtml(new URL(link, process.env['WEB_ORIGIN'] || 'http://localhost:3000').toString())}">${escapeHtml(title)}</a><br>${escapeHtml(body)}</li>`,
    ).join('');
    await this.transport.sendMail({
      from,
      to,
      subject,
      text: messages.map(({ title, body, link }) => `${title}\n${body}\n${link}`).join('\n\n'),
      html: `<div dir="${language === 'ar' ? 'rtl' : 'ltr'}"><h1>${escapeHtml(subject)}</h1><ul>${rows}</ul></div>`,
    });
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
