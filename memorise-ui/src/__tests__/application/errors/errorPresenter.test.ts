import { describe, it, expect } from 'vitest';
import type { AppError } from '@/infrastructure/services/ErrorHandlingService';
import { presentError } from '@/application/errors/errorPresenter';

const baseError: AppError = {
  message: 'Base message',
  code: 'UNKNOWN',
  severity: 'error',
};

describe('errorPresenter', () => {
  it('returns context userMessage when present', () => {
    const error: AppError = {
      ...baseError,
      context: {
        userMessage: 'Custom user message',
      },
    };

    expect(presentError(error)).toMatchObject({
      message: 'Custom user message',
      tone: 'error',
      persistent: true,
    });
  });

  it('maps known codes from catalog', () => {
    const error: AppError = {
      ...baseError,
      code: 'NETWORK_ERROR',
    };

    expect(presentError(error)).toMatchObject({
      message: 'Network issue detected. Check your connection and try again.',
      tone: 'error',
      persistent: true,
    });
  });

  it('uses catalog entry for known required codes', () => {
    const error: AppError = {
      ...baseError,
      code: 'WORKSPACE_NAME_REQUIRED',
      severity: 'warn',
    };

    expect(presentError(error)).toMatchObject({
      message: 'Please provide a name for the workspace.',
      tone: 'warning',
      persistent: false,
    });
  });

  it('derives messages from code suffixes for unknown codes', () => {
    const error: AppError = {
      ...baseError,
      code: 'SOME_FIELD_REQUIRED',
      severity: 'warn',
    };

    expect(presentError(error)).toMatchObject({
      message: 'Missing required information. Please review the form and try again.',
      tone: 'warning',
      persistent: false,
    });
  });

  it('falls back to provided defaults', () => {
    const error: AppError = {
      ...baseError,
      message: '',
    };

    expect(
      presentError(error, {
        message: 'Default fallback',
        tone: 'info',
        persistent: false,
      })
    ).toMatchObject({
      message: 'Default fallback',
      tone: 'info',
      persistent: false,
    });
  });
});


