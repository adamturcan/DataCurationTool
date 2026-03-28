import type { AppError } from '../../infrastructure/services/ErrorHandlingService';
import type { Notice, NoticeTone } from '../../types';

const DEFAULT_FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

const ERROR_CATALOG: Record<string, Notice> = {
  NETWORK_ERROR: {
    message: 'Network issue detected. Check your connection and try again.',
    tone: 'error',
    persistent: true,
  },
  REQUEST_ABORTED: {
    message: 'The request was cancelled before it finished.',
    tone: 'warning',
  },
  REPOSITORY_ERROR: {
    message: 'We could not access your saved data. Please retry.',
    tone: 'error',
    persistent: true,
  },
  WORKSPACE_NOT_FOUND: {
    message: 'This workspace could not be found or was removed.',
    tone: 'warning',
    persistent: true,
  },
  WORKSPACE_CREATE_FAILED: {
    message: 'We could not create the workspace. Please try again.',
    tone: 'error',
    persistent: true,
  },
  WORKSPACE_UPDATE_FAILED: {
    message: 'We could not save your changes. Please retry.',
    tone: 'error',
    persistent: true,
  },
  TAG_ALREADY_EXISTS: {
    message: 'This tag already exists in the workspace.',
    tone: 'info',
  },
  TAG_VALIDATION_FAILED: {
    message: 'We could not validate that tag. Please review and try again.',
    tone: 'warning',
  },
  ANNOTATION_VALIDATION_FAILED: {
    message: 'The annotation looks invalid. Please adjust and try again.',
    tone: 'warning',
  },
};

const SEVERITY_TO_TONE: Record<NonNullable<AppError['severity']>, NoticeTone> = {
  info: 'info',
  warn: 'warning',
  error: 'error',
  critical: 'error',
};

function deriveFromCode(code: string): Notice | undefined {
  if (code.startsWith('HTTP_')) {
    return {
      message: 'The service is unavailable at the moment. Please try again shortly.',
      tone: 'error',
      persistent: true,
    };
  }

  if (code.endsWith('_REQUIRED')) {
    return {
      message: 'Missing required information. Please review the form and try again.',
      tone: 'warning',
    };
  }

  if (code.endsWith('_VALIDATION_FAILED')) {
    return {
      message: 'Some details look incorrect. Please review and try again.',
      tone: 'warning',
    };
  }

  if (code.endsWith('_FAILED')) {
    return {
      message: 'We could not complete that action. Please try again.',
      tone: 'error',
      persistent: true,
    };
  }

  return undefined;
}

export function presentError(error: AppError, defaults?: Partial<Notice>): Notice {
  const code = error.code ?? 'UNKNOWN';
  const catalogEntry = ERROR_CATALOG[code] ?? deriveFromCode(code);

  const message =
    (typeof error.context?.userMessage === 'string' && error.context.userMessage) ||
    catalogEntry?.message ||
    error.message ||
    defaults?.message ||
    DEFAULT_FALLBACK_MESSAGE;

  const tone =
    catalogEntry?.tone ||
    defaults?.tone ||
    (error.severity ? SEVERITY_TO_TONE[error.severity] : undefined) ||
    'error';

  const persistent = catalogEntry?.persistent ?? defaults?.persistent ?? tone === 'error';

  return {
    message,
    tone,
    persistent,
  };
}


