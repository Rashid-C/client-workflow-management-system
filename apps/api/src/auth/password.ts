import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

// OWASP Password Storage Cheat Sheet minimum for argon2id:
// 19 MiB memory, 2 iterations, 1 degree of parallelism.
const PARAMS = { memory: 19_456, passes: 2, parallelism: 1, tagLength: 32 };

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

function derive(
  password: string,
  salt: Buffer,
  params: typeof PARAMS,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    argon2(
      'argon2id',
      { message: password, nonce: salt, ...params },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

/** Hash a password into a self-describing PHC string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, PARAMS);
  const { memory: m, passes: t, parallelism: p } = PARAMS;
  return `$argon2id$v=19$m=${m},t=${t},p=${p}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([\w-]+)\$([\w-]+)$/;

/**
 * Check a password against a stored PHC string. The parameters are read
 * from the string, so hashes made with older settings keep verifying after
 * PARAMS is raised.
 */
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const match = PHC.exec(encoded);
  if (!match) return false;

  const [, m, t, p, salt, hash] = match;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await derive(password, Buffer.from(salt, 'base64url'), {
    memory: Number(m),
    passes: Number(t),
    parallelism: Number(p),
    tagLength: expected.length,
  });

  return timingSafeEqual(actual, expected);
}

/** True when a stored hash was made with weaker settings than today's. */
export function needsRehash(encoded: string): boolean {
  const match = PHC.exec(encoded);
  if (!match) return true;
  const [, m, t, p] = match.map(Number);
  return m < PARAMS.memory || t < PARAMS.passes || p !== PARAMS.parallelism;
}

// Verified against when the email is unknown, so a miss costs as much time
// as a wrong password and response times don't reveal which emails exist.
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(32).toString('base64url'));
  return dummyHash;
}
