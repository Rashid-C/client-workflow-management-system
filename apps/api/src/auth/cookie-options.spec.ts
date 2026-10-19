import { authCookieOptions } from './cookie-options.js';

describe('authCookieOptions', () => {
  it('marks session and language cookies HttpOnly and SameSite=Lax, secure in production', () => {
    expect(authCookieOptions(true)).toMatchObject({
      session: { httpOnly: true, sameSite: 'lax', secure: true, path: '/' },
      language: { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 31_536_000_000 },
    });
  });

  it('keeps local HTTP development usable', () => {
    expect(authCookieOptions(false).session.secure).toBe(false);
    expect(authCookieOptions(false).language.httpOnly).toBe(true);
  });
});
