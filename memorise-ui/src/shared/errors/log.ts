/**
 * Structured error logging. Writes to console with a consistent label and
 * normalizes the input into AppError shape before emitting.
 *
 * @category Shared
 */
import { createAppError, isAppError, type ErrorContext } from "./AppError";

export function logAppError(error: unknown, context?: ErrorContext): void {
  const appError = isAppError(error)
    ? { ...error, context: { ...error.context, ...context } }
    : createAppError({
        message:
          (typeof context?.userMessage === "string" && context.userMessage) ||
          (error instanceof Error ? error.message : "An unexpected error occurred."),
        code: "UNHANDLED_ERROR",
        severity: "error",
        context,
        cause: error,
      });

  console.error("[App]", {
    message: appError.message,
    code: appError.code,
    severity: appError.severity,
    context: appError.context,
    cause: appError.cause,
  });
  // TODO: Forward to remote telemetry service when available.
}
