import { describe, it, expect } from "vitest";

import { toAppError, toValidationError } from '../shared/errors';

describe("error normalization", () => {
  it("turns a 503 response into an HTTP_503 AppError that preserves the original response as cause", () => {
    const response = new Response(null, { status: 503, statusText: "Service Unavailable" });

    const appError = toAppError(response, { operation: "fetch data" });

    expect(appError.code).toBe("HTTP_503");
    expect(appError.cause).toBe(response);
    expect(appError.message).toBe("Unable to fetch data. Please try again.");
  });

  it("detects network failures (Failed to fetch) and tags them as NETWORK_ERROR", () => {
    const appError = toAppError(new TypeError("Failed to fetch"), { operation: "load configuration" });

    expect(appError.code).toBe("NETWORK_ERROR");
    expect(appError.severity).toBe("error");
  });

  it("tags validation errors with warn severity so the snackbar does not look like a crash", () => {
    const appError = toValidationError("Invalid payload", { operation: "submit form", field: "name" });

    expect(appError.code).toBe("VALIDATION_ERROR");
    expect(appError.severity).toBe("warn");
    expect(appError.context).toMatchObject({ field: "name" });
  });

  it("merges context when an AppError flows through toAppError a second time", () => {
    const initial = toAppError(new Error("Boom"), { operation: "initial operation" });
    const merged = toAppError(initial, { retry: true });

    expect(merged.context).toMatchObject({ operation: "initial operation", retry: true });
  });
});
