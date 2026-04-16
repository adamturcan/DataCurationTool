import { describe, it, expect } from 'vitest';
import { presentAppError } from '../application/errors';
import type { AppError } from '../shared/errors';

const appError = (overrides: Partial<AppError> = {}): AppError => ({
  message: 'raw',
  code: 'UNKNOWN',
  severity: 'error',
  ...overrides,
});

describe('presentAppError', () => {
  it('prefers the catalog message over the raw AppError message', () => {
    // If users see "Failed to fetch" we've failed — the presenter must translate.
    const notice = presentAppError(appError({ code: 'NETWORK_ERROR', message: 'Failed to fetch' }));

    expect(notice.message).toBe('Network issue detected. Check your connection and try again.');
    expect(notice.persistent).toBe(true);
  });

  it('falls back to suffix heuristics for unknown codes like *_REQUIRED', () => {
    const notice = presentAppError(appError({ code: 'SOME_FIELD_REQUIRED', severity: 'warn' }));

    expect(notice.tone).toBe('warning');
    expect(notice.message).toMatch(/missing required/i);
  });

  it('honors an explicit userMessage in the error context', () => {
    const notice = presentAppError(appError({ context: { userMessage: 'Please log in again.' } }));

    expect(notice.message).toBe('Please log in again.');
  });
});
