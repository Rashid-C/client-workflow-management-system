import { hashPassword, needsRehash, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('produces an argon2id PHC string with a random salt', async () => {
    const first = await hashPassword('correct horse battery');
    const second = await hashPassword('correct horse battery');

    expect(first).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(first).not.toBe(second);
  });

  it('verifies the right password and rejects others', async () => {
    const hash = await hashPassword('correct horse battery');

    await expect(verifyPassword('correct horse battery', hash)).resolves.toBe(true);
    await expect(verifyPassword('correct horse batterY', hash)).resolves.toBe(false);
    await expect(verifyPassword('', hash)).resolves.toBe(false);
  });

  it('rejects malformed stored hashes instead of throwing', async () => {
    await expect(verifyPassword('x', 'plain-text')).resolves.toBe(false);
    await expect(verifyPassword('x', '$2b$10$bcrypt-style')).resolves.toBe(false);
  });

  it('flags hashes made with weaker settings for rehashing', async () => {
    expect(needsRehash(await hashPassword('correct horse battery'))).toBe(false);
    expect(needsRehash('$argon2id$v=19$m=4096,t=1,p=1$c2FsdA$aGFzaA')).toBe(true);
    expect(needsRehash('garbage')).toBe(true);
  });
});
