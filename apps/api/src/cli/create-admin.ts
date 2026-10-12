/**
 * Create the first Super Admin from a terminal on the server:
 *
 *   pnpm --filter api build
 *   pnpm --filter api create-admin
 *
 * There is deliberately no web setup page: whoever reached it first after a
 * deploy would own the system. This refuses to run once an active Super
 * Admin exists; further admins are added from the app.
 */
import 'dotenv/config';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline';
import pg from 'pg';
import {
  hashPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../auth/password.js';

const TIME_ZONE = process.env['APP_TIME_ZONE'] ?? 'Asia/Dubai';

/** Ask questions on a terminal (hiding passwords) or read piped lines. */
async function prompter() {
  if (!stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of stdin) chunks.push(chunk as Buffer);
    const lines = Buffer.concat(chunks).toString('utf8').split(/\r?\n/);
    return {
      ask: async (question: string) => {
        stdout.write(question + '\n');
        return lines.shift() ?? '';
      },
      close: () => {},
    };
  }

  let muted = false;
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  const internal = rl as unknown as { _writeToOutput: (s: string) => void };
  internal._writeToOutput = (text) => {
    if (!muted) stdout.write(text);
  };

  return {
    ask: (question: string, hidden = false) =>
      new Promise<string>((resolve) => {
        stdout.write(question);
        muted = hidden;
        rl.question('', (answer) => {
          if (hidden) stdout.write('\n');
          muted = false;
          resolve(answer);
        });
      }),
    close: () => rl.close(),
  };
}

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

async function main() {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) fail('DATABASE_URL is not set.');

  const db = new pg.Client({ connectionString });
  await db.connect();

  try {
    const existing = await db.query(
      `SELECT 1 FROM "Employee" e
       JOIN "EmployeeRole" er ON er."employeeId" = e."id"
       JOIN "Role" r ON r."id" = er."roleId"
       WHERE r."isSystem" AND e."status" = 'Active'
       LIMIT 1`,
    );
    if (existing.rowCount) {
      fail('An active Super Admin already exists. Add more admins from the app.');
    }

    const role = await db.query<{ id: number }>(
      `SELECT "id" FROM "Role" WHERE "isSystem" ORDER BY "id" LIMIT 1`,
    );
    if (!role.rowCount) fail('No system role found. Run the database migrations first.');

    const io = await prompter();
    console.log('Create the first Tickwise Super Admin\n');

    const name = (await io.ask('Full name: ')).trim();
    const email = (await io.ask('Email: ')).trim().toLowerCase();
    const employeeCode =
      (await io.ask('Employee code [ADMIN-001]: ')).trim() || 'ADMIN-001';
    const designation =
      (await io.ask('Designation [Administrator]: ')).trim() || 'Administrator';
    const password = await io.ask(
      `Password (${PASSWORD_MIN_LENGTH}+ characters, hidden): `,
      true,
    );
    const confirm = await io.ask('Repeat password: ', true);
    io.close();

    if (!name || name.length > 150) fail('Enter a name of up to 150 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      fail('Enter a valid email address.');
    }
    if (
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      fail(`Password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters.`);
    }
    if (password !== confirm) fail('Passwords do not match.');
    if (password.toLowerCase() === email) fail('Password must not be the email.');

    const passwordHash = await hashPassword(password);
    // The joining day as the office sees it, not the UTC day.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(
      new Date(),
    );

    await db.query('BEGIN');
    try {
      const inserted = await db.query<{ id: number }>(
        `INSERT INTO "Employee"
          ("employeeCode", "name", "email", "designation", "status", "joinedDate", "updatedAt")
         VALUES ($1, $2, $3, $4, 'Active', $5, NOW())
         RETURNING "id"`,
        [employeeCode, name, email, designation, today],
      );
      const employeeId = inserted.rows[0].id;

      await db.query(
        `INSERT INTO "EmployeeRole" ("employeeId", "roleId") VALUES ($1, $2)`,
        [employeeId, role.rows[0].id],
      );
      // They chose this password themselves, so no forced change.
      await db.query(
        `INSERT INTO "EmployeeCredential"
          ("employeeId", "passwordHash", "mustChangePassword", "updatedAt")
         VALUES ($1, $2, false, NOW())`,
        [employeeId, passwordHash],
      );
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      if ((error as { code?: string }).code === '23505') {
        fail('That email or employee code is already in use.');
      }
      throw error;
    }

    console.log(`\n✓ ${name} <${email}> is now a Super Admin. Sign in at /login.`);
  } finally {
    await db.end();
  }
}

await main();
