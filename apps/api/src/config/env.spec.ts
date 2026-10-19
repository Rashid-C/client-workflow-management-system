import { validateEnvironment } from './env.js';

describe('validateEnvironment', () => {
  it('requires the database URL and production origins with clear errors', () => {
    expect(() => validateEnvironment({})).toThrow('DATABASE_URL');
    expect(() => validateEnvironment({ DATABASE_URL: 'postgres://db', NODE_ENV: 'production' })).toThrow('WEB_ORIGINS');
  });

  it('accepts the existing local origin default and validates configured origins', () => {
    expect(() => validateEnvironment({ DATABASE_URL: 'postgres://db' })).not.toThrow();
    expect(() => validateEnvironment({ DATABASE_URL: 'postgres://db', WEB_ORIGINS: 'https://app.example' })).not.toThrow();
    expect(() => validateEnvironment({ DATABASE_URL: 'postgres://db', WEB_ORIGINS: 'https://app.example/path' })).toThrow('WEB_ORIGINS');
    expect(() => validateEnvironment({ DATABASE_URL: 'postgres://db', NODE_ENV: 'production', WEB_ORIGINS: 'http://app.example' })).toThrow('WEB_ORIGINS');
    expect(() => validateEnvironment({ DATABASE_URL: 'postgres://db', NODE_ENV: 'production', WEB_ORIGINS: 'http://localhost:3003' })).not.toThrow();
  });

  it('requires complete OAuth configuration only when email is enabled', () => {
    expect(() => validateEnvironment({ DATABASE_URL: 'postgres://db' })).not.toThrow();
    expect(() => validateEnvironment({ DATABASE_URL: 'postgres://db', MAIL_HOST: 'smtp.example' })).toThrow('MAIL_TENANT_ID');
  });
});
