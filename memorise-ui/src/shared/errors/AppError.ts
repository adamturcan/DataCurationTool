/**
 * Core AppError type and constructors. Layer-neutral — safe to import from
 * any layer (core, application, infrastructure, presentation).
 *
 * @category Shared
 */

export interface AppError {
  message: string;
  code?: string;
  cause?: unknown;
  context?: Record<string, unknown>;
  severity?: "info" | "warn" | "error" | "critical";
  __isAppError?: true;
}

export interface ErrorContext extends Record<string, unknown> {
  userMessage?: string;
  operation?: string;
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "__isAppError" in value &&
    (value as Record<string, unknown>).__isAppError === true
  );
}

export function createAppError(options: {
  message: string;
  code: string;
  severity?: AppError["severity"];
  context?: ErrorContext;
  cause?: unknown;
}): AppError {
  return {
    message: options.message,
    code: options.code,
    severity: options.severity,
    context: options.context,
    cause: options.cause,
    __isAppError: true,
  };
}
