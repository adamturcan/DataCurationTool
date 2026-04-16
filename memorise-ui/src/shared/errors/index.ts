/**
 * Public barrel for the shared error module. Exposes the layer-neutral
 * AppError primitives, normalizers, and logger. Presentation-layer concerns
 * (Notice conversion, workflow catch helpers) live in `application/errors`.
 *
 * @category Shared
 */
export {
  type AppError,
  type ErrorContext,
  createAppError,
  isAppError,
} from "./AppError";

export {
  toAppError,
  toValidationError,
  toRepositoryError,
  withRepositoryError,
} from "./normalize";

export { logAppError } from "./log";
