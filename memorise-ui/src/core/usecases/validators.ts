import { errorHandlingService } from '../../infrastructure/services/ErrorHandlingService';
import type { AppError } from '../../infrastructure/services/ErrorHandlingService';

interface ValidationOptions {
  operation: string;
  field: string;
  code: string;
  severity?: AppError['severity'];
}

export function requireNonEmptyString(
  value: unknown,
  options: ValidationOptions
): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  throw errorHandlingService.createAppError({
    message: `${options.field} is required.`,
    code: options.code,
    severity: options.severity ?? 'warn',
    context: {
      operation: options.operation,
      field: options.field,
      receivedType: typeof value,
    },
  });
}

export function requireWorkspaceId(
  workspaceId: unknown,
  operation: string
): string {
  return requireNonEmptyString(workspaceId, {
    operation,
    field: 'workspaceId',
    code: 'WORKSPACE_ID_REQUIRED',
  });
}

export function requireOwnerId(ownerId: unknown, operation: string): string {
  return requireNonEmptyString(ownerId, {
    operation,
    field: 'ownerId',
    code: 'WORKSPACE_OWNER_REQUIRED',
  });
}

export function requireWorkspaceName(
  name: unknown,
  operation: string
): string {
  return requireNonEmptyString(name, {
    operation,
    field: 'name',
    code: 'WORKSPACE_NAME_REQUIRED',
  });
}

export function requireTranslationLanguage(
  language: unknown,
  operation: string
): string {
  return requireNonEmptyString(language, {
    operation,
    field: 'language',
    code: 'WORKSPACE_TRANSLATION_LANGUAGE_REQUIRED',
  });
}



