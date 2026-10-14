import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateClientDto } from './create-client.dto.js';

const check = (input: Record<string, unknown>) => {
  const dto = plainToInstance(CreateClientDto, input);
  const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, failed: errors.map((e) => e.property) };
};

describe('CreateClientDto', () => {
  it('accepts a TRN typed with spaces and stores digits only', () => {
    const { dto, failed } = check({ name: 'Gulf Trading', vatTrn: '100 1234 5678 9003' });
    expect(failed).toEqual([]);
    expect(dto.vatTrn).toBe('100123456789003');
  });

  it.each(['12345', '1001234567890031', '10012345678900A'])('rejects the TRN %s', (vatTrn) => {
    expect(check({ name: 'Gulf Trading', vatTrn }).failed).toEqual(['vatTrn']);
  });

  it('turns blank optional fields into null', () => {
    const { dto, failed } = check({ name: '  Gulf Trading ', email: '  ', vatTrn: '' });
    expect(failed).toEqual([]);
    expect(dto).toMatchObject({ name: 'Gulf Trading', email: null, vatTrn: null });
  });

  it('requires a name', () => {
    expect(check({ name: '   ' }).failed).toEqual(['name']);
  });

  it.each([
    ['phone', '+971 50 123 4567', true],
    ['phone', '(02) 555-1234', true],
    ['phone', 'call me', false],
    ['emirate', 'Dubai', true],
    ['emirate', 'Muscat', false],
    ['financialYearEndMonth', 3, true],
    ['financialYearEndMonth', 13, false],
  ])('%s = %s is valid: %s', (field, value, valid) => {
    expect(check({ name: 'Gulf Trading', [field]: value }).failed).toEqual(valid ? [] : [field]);
  });
});
