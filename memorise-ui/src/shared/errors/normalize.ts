/**
 * Normalize raw errors (HTTP responses, network failures, validation issues,
 * repository failures) into the unified AppError shape.
 *
 * @category Shared
 */
import { createAppError, isAppError, type AppError, type ErrorContext } from "./AppError";

function resolveMessage(context: ErrorContext | undefined, fallback: string): string {
  if (context?.userMessage && typeof context.userMessage === "string") return context.userMessage;
  const operation = typeof context?.operation === "string" ? context.operation : null;
  if (operation) return `Unable to ${operation}. Please try again.`;
  return fallback;
}

export function toAppError(error: unknown, context?: ErrorContext): AppError {
  if (isAppError(error)) return { ...error, context: { ...error.context, ...context } };

  if (error instanceof Response) {
    return createAppError({
      message: resolveMessage(
        context,
        `Server responded with ${error.status}${error.statusText ? ` (${error.statusText})` : ""}`
      ),
      code: `HTTP_${error.status}`,
      severity: "error",
      context,
      cause: error,
    });
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return createAppError({
      message: resolveMessage(context, "Request was cancelled."),
      code: "REQUEST_ABORTED",
      severity: "warn",
      context,
    });
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const isNetworkError =
    errorMessage.includes("Failed to fetch") ||
    errorMessage.includes("NetworkError") ||
    (error instanceof TypeError && errorMessage.includes("fetch"));

  if (isNetworkError) {
    return createAppError({
      message: resolveMessage(context, "Network error. Check your connection and try again."),
      code: "NETWORK_ERROR",
      severity: "error",
      context,
      cause: error,
    });
  }

  const fallback =
    error instanceof Error && error.message
      ? error.message
      : "Something went wrong while communicating with the server.";

  return createAppError({
    message: resolveMessage(context, fallback),
    code: "API_ERROR",
    severity: "error",
    context,
    cause: error,
  });
}

export function toValidationError(error: unknown, context?: ErrorContext): AppError {
  if (isAppError(error)) {
    return {
      ...error,
      severity: error.severity ?? "warn",
      code: error.code ?? "VALIDATION_ERROR",
      context: { ...error.context, ...context },
    };
  }

  const message =
    error instanceof Error ? error.message :
    typeof error === "string" ? error :
    "Please review the entered information.";

  return createAppError({
    message: resolveMessage(context, message),
    code: "VALIDATION_ERROR",
    severity: "warn",
    context,
    cause: error,
  });
}

export function toRepositoryError(error: unknown, context?: ErrorContext): AppError {
  const repositoryContext = { ...context, layer: "repository" };

  if (isAppError(error)) {
    return {
      ...error,
      code: error.code ?? "REPOSITORY_ERROR",
      severity: error.severity ?? "error",
      context: { ...error.context, ...repositoryContext },
    };
  }

  const message = error instanceof Error ? error.message : String(error);

  return createAppError({
    message: resolveMessage(repositoryContext, message || "Unable to complete repository operation."),
    code: "REPOSITORY_ERROR",
    severity: "error",
    context: repositoryContext,
    cause: error,
  });
}

export async function withRepositoryError<T>(
  context: ErrorContext | undefined,
  fn: () => Promise<T> | T
): Promise<T> {
  try {
    return await Promise.resolve(fn());
  } catch (error) {
    throw toRepositoryError(error, context);
  }
}
