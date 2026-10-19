export function authCookieOptions(isProduction: boolean) {
  const common = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  };
  return {
    session: common,
    language: { ...common, maxAge: 365 * 24 * 60 * 60 * 1000 },
  };
}
