import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ERROR_CODES, problem, validationMessages } from './errors.js';

// The web app translates errors by code, so a code with no message would
// reach an Arabic reader as a generic error.
const dictionary = (language: 'en' | 'ar') =>
  readFileSync(new URL(`../../../web/lib/i18n/${language}.ts`, import.meta.url), 'utf8');

describe('error codes', () => {
  it('are unique', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });

  it.each(['en', 'ar'] as const)('all have a message in the %s dictionary', (language) => {
    const text = dictionary(language);
    const missing = ERROR_CODES.filter(
      (code) => !new RegExp(`["']?${code.replace('.', '\\.')}["']?\\s*:`).test(text),
    );
    expect(missing).toEqual([]);
  });
});

describe('problem', () => {
  it('leaves out params when there are none', () => {
    expect(problem('tasks.not_found', 'Task not found')).toEqual({
      code: 'tasks.not_found',
      message: 'Task not found',
    });
  });
});

describe('validationMessages', () => {
  it('flattens nested fields with their path', () => {
    expect(
      validationMessages([
        { property: 'name', constraints: { isNotEmpty: 'name should not be empty' } },
        {
          property: 'stages',
          children: [
            {
              property: '0',
              children: [{ property: 'name', constraints: { maxLength: 'name must be shorter' } }],
            },
          ],
        },
      ]),
    ).toEqual(['name should not be empty', 'stages.0.name must be shorter']);
  });
});
