import { AxiosError } from "axios";

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
    const data = error.response.data as { error?: unknown };
    if (
      typeof data.error === "string" &&
      data.error.length > 0 &&
      !GENERIC_API_MESSAGES.has(data.error)
    ) {
      return data.error;
    }
  }
  return fallback;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 401;
}
