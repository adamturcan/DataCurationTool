/**
 * One-liner for workflow `catch` blocks: normalize the raw error, log it,
 * and return a failed WorkflowResult whose notice is produced by the
 * presenter (so users see catalog messages, not raw API strings).
 *
 * @category Application
 */
import { logAppError, toAppError } from "../../shared/errors";
import type { WorkflowResult } from "../../types";
import { presentAppError } from "./present";

export function catchApiError(
  error: unknown,
  operation: string,
  message?: string
): WorkflowResult {
  const appError = toAppError(error, { operation });
  logAppError(appError);
  const notice = presentAppError(appError);
  return {
    ok: false,
    notice: message ? { ...notice, message } : notice,
  };
}
