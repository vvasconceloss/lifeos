import { AxiosError } from "axios";
import type { ApiErrorResponse } from "@lifeos/shared";

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

const GENERIC_API_MESSAGES = new Set([
  "Internal Server Error",
  "Validation failed",
]);

export function getApiErrorMessage(
  error: unknown,
  fallback = GENERIC_MESSAGE,
): string {
  if (error instanceof AxiosError && error.response) {
    const data = error.response.data as Partial<ApiErrorResponse> | { error?: string };
    const err = data.error;

    if (err && typeof err === "object") {
      if (err.message.length > 0 && !GENERIC_API_MESSAGES.has(err.message)) {
        return err.message;
      }
    } else if (
      typeof err === "string" &&
      err.length > 0 &&
      !GENERIC_API_MESSAGES.has(err)
    ) {
      return err;
    }
  }
  return fallback;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 401;
}
