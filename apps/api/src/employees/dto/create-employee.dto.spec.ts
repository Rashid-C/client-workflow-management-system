import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto.js';

const valid = {
  employeeCode: 'EMP-001',
  name: 'Aisha Rahman',
  email: 'aisha@firm.ae',
  designation: 'Senior Auditor',
  roleIds: [3],
  joinedDate: '2026-10-12',
  temporaryPassword: 'temporary-pass-123',
};

async function errorsFor(input: object) {
  const errors = await validate(plainToInstance(CreateEmployeeDto, input));
  return errors.map((error) => error.property);
}

describe('CreateEmployeeDto', () => {
  it('accepts a valid employee', async () => {
    await expect(errorsFor(valid)).resolves.toEqual([]);
  });

  it.each([
    ['no roles', { roleIds: [] }],
    ['duplicate roles', { roleIds: [3, 3] }],
    ['non-integer role id', { roleIds: [1.5] }],
    ['negative role id', { roleIds: [-1] }],
    ['roles missing', { roleIds: undefined }],
  ])('rejects %s', async (_label, override) => {
    await expect(errorsFor({ ...valid, ...override })).resolves.toContain(
      'roleIds',
    );
  });

  it.each(['12-10-2026', '2026/10/12', '2026-10-12T00:00:00Z', ''])(
    'rejects joinedDate %j',
    async (joinedDate) => {
      await expect(errorsFor({ ...valid, joinedDate })).resolves.toContain(
        'joinedDate',
      );
    },
  );

  it('rejects an unknown status', async () => {
    await expect(
      errorsFor({ ...valid, status: 'Deleted' }),
    ).resolves.toContain('status');
  });

  it.each(['short', 'x'.repeat(129)])(
    'rejects a temporary password of length %#',
    async (temporaryPassword) => {
      await expect(
        errorsFor({ ...valid, temporaryPassword }),
      ).resolves.toContain('temporaryPassword');
    },
  );

  it('rejects an invalid email', async () => {
    await expect(
      errorsFor({ ...valid, email: 'not-an-email' }),
    ).resolves.toContain('email');
  });
});
