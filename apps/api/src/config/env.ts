type Environment = NodeJS.ProcessEnv;

/** Validate configuration before Nest opens its HTTP listener. */
export function validateEnvironment(env: Environment = process.env): void {
  const missing = ['DATABASE_URL'].filter((key) => !env[key]?.trim());
  if (env['NODE_ENV'] === 'production' && !env['WEB_ORIGINS']?.trim()) {
    missing.push('WEB_ORIGINS');
  }
  if (missing.length) {
    throw new Error(`API startup failed: required environment variable(s) missing: ${missing.join(', ')}.`);
  }

  try {
    const database = new URL(env['DATABASE_URL']!);
    if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error();
  } catch {
    throw new Error('API startup failed: DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (env['WEB_ORIGINS']) {
    for (const value of env['WEB_ORIGINS'].split(',').map((origin) => origin.trim()).filter(Boolean)) {
      try {
        const origin = new URL(value);
        if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== value) throw new Error();
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
        if (env['NODE_ENV'] === 'production' && origin.protocol !== 'https:' && !local) throw new Error();
      } catch {
        throw new Error('API startup failed: WEB_ORIGINS must be a comma-separated list of origins without paths.');
      }
    }
  }

  if (env['MAIL_HOST']) {
    const requiredMail = ['MAIL_TENANT_ID', 'MAIL_CLIENT_ID', 'MAIL_CLIENT_SECRET', 'MAIL_USER'];
    const missingMail = requiredMail.filter((key) => !env[key]?.trim());
    if (missingMail.length) {
      throw new Error(`API startup failed: MAIL_HOST is set but required Microsoft 365 OAuth variable(s) are missing: ${missingMail.join(', ')}.`);
    }
    const port = Number(env['MAIL_PORT'] || 587);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('API startup failed: MAIL_PORT must be an integer from 1 to 65535.');
    }
  }

  if (env['APP_TIME_ZONE']) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: env['APP_TIME_ZONE'] });
    } catch {
      throw new Error('API startup failed: APP_TIME_ZONE must be a valid IANA time zone.');
    }
  }
}
