// @Type() reads decorator metadata; Nest loads this for the app itself.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BlockStageDto, CompleteStageDto, ReassignStageDto } from './dto.js';

async function errorsFor<T extends object>(cls: new () => T, input: object) {
  const errors = await validate(plainToInstance(cls, input));
  return errors.map((error) => error.property);
}

describe('stage action DTOs', () => {
  it('requires time to complete a stage', async () => {
    await expect(errorsFor(CompleteStageDto, {})).resolves.toContain('minutes');
    await expect(errorsFor(CompleteStageDto, { comment: 'x' })).resolves.toContain('minutes');
    await expect(errorsFor(CompleteStageDto, { minutes: 0 })).resolves.toContain('minutes');
    await expect(errorsFor(CompleteStageDto, { minutes: 1.5 })).resolves.toContain('minutes');
    await expect(errorsFor(CompleteStageDto, { minutes: 721 })).resolves.toContain('minutes');
    await expect(errorsFor(CompleteStageDto, { minutes: 75 })).resolves.toEqual([]);
  });

  it('keeps time optional when blocking or reassigning', async () => {
    await expect(errorsFor(BlockStageDto, { reason: 'Waiting' })).resolves.toEqual([]);
    await expect(errorsFor(ReassignStageDto, { assigneeId: null })).resolves.toEqual([]);
    await expect(errorsFor(BlockStageDto, { reason: 'Waiting', minutes: 721 })).resolves.toContain('minutes');
  });

  it('checks the work date format', async () => {
    await expect(
      errorsFor(CompleteStageDto, { minutes: 30, workDate: '13/10/2026' }),
    ).resolves.toContain('workDate');
  });
});
