/**
 * Input validation helpers for use cases. Each validator trims the input,
 * throws a structured AppError if empty, and returns the clean string.
 *
 * Use cases form the stable API between application services and the
 * persistence layer. They depend on WorkspaceRepository (interface),
 * not on any concrete implementation — so switching from localStorage
 * to a server-backed database only requires swapping the repository
 * in the provider, without changing use cases or anything above them.
 *
 * @category Use Cases
 */
import { createAppError, type AppError } from '../../shared/errors';
import type { Workspace } from '../entities/Workspace';
import type { WorkspaceRepository } from '../interfaces/WorkspaceRepository';

/** Config for requireNonEmptyString — identifies the field for error reporting */
interface ValidationOptions {
  operation: string;
  field: string;
  code: string;
  severity?: AppError['severity'];
}

/** Base validator: trims string, throws structured AppError if empty or non-string */
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

  throw createAppError({
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

/** Loads a workspace by ID from the repository, throws WORKSPACE_NOT_FOUND if missing */
export async function requireExistingWorkspace(
  repository: WorkspaceRepository,
  workspaceId: string,
  operation: string
): Promise<Workspace> {
  const workspace = await repository.findById(workspaceId);
  if (!workspace) {
    throw createAppError({
      message: `Workspace ${workspaceId} was not found.`,
      code: 'WORKSPACE_NOT_FOUND',
      severity: 'warn',
      context: { operation, workspaceId },
    });
  }
  return workspace;
}



