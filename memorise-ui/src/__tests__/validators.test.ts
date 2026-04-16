import { describe, it, expect } from 'vitest';
import { requireNonEmptyString } from '../core/usecases/validators';
import { isAppError } from '../shared/errors';

describe('use case validators', () => {
  it('returns trimmed strings', () => {
    const result = requireNonEmptyString('  value  ', {
      operation: 'TestOperation',
      field: 'field',
      code: 'TEST_CODE',
    });
    expect(result).toBe('value');
  });

  it('throws AppError when value is empty', () => {
    try {
      requireNonEmptyString('   ', {
        operation: 'TestOperation',
        field: 'field',
        code: 'TEST_CODE',
      });
      throw new Error('expected requireNonEmptyString to throw');
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      expect(error).toMatchObject({
        code: 'TEST_CODE',
        message: 'field is required.',
      });
    }
  });
});
