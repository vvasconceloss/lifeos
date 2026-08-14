import type { ApiErrorBody } from "@lifeos/shared";

const MESSAGE_TO_CODE: Record<string, string> = {
  Unauthorized: "UNAUTHORIZED",
  "Validation failed": "VALIDATION_ERROR",
  "Internal Server Error": "INTERNAL_ERROR",
  "Not Found": "NOT_FOUND",
  "Email already in use": "EMAIL_ALREADY_EXISTS",
  "Invalid email or password": "INVALID_CREDENTIALS",
  "User not found": "USER_NOT_FOUND",
  "User already completed onboarding": "ALREADY_ONBOARDED",
  "A habit references a pillar that was not selected": "INVALID_PILLAR_INDEX",
  "Cannot delete pillar with associated habits. Archive or delete the habits first.": "PILLAR_HAS_HABITS",
  "Pillar not found": "PILLAR_NOT_FOUND",
  "Habit not found": "HABIT_NOT_FOUND",
  "Habit must belong to the goal's pillar": "HABIT_PILLAR_MISMATCH",
  "Cannot mark future dates": "FUTURE_DATE",
  "Cannot log future dates": "FUTURE_DATE",
  "Completion not found": "COMPLETION_NOT_FOUND",
  "Goal not found": "GOAL_NOT_FOUND",
  "Project not found": "PROJECT_NOT_FOUND",
  "Task not found": "TASK_NOT_FOUND",
  "Daily log not found": "DAILY_LOG_NOT_FOUND",
  "Please verify your email to continue": "EMAIL_NOT_VERIFIED",
  "Verification link has expired": "VERIFICATION_EXPIRED",
  "Invalid or expired verification link": "INVALID_VERIFICATION_TOKEN",
  "Invalid or expired reset link": "INVALID_RESET_TOKEN",
  "Reset link has expired": "RESET_EXPIRED",
};

/**
 * Builds the standardized error body `{ code, message, details? }` used by every
 * endpoint. Codes are derived from the message by default; pass `code` to override.
 */
export function toErrorBody(
  message: string,
  details?: unknown,
  code?: string,
): ApiErrorBody {
  const body: ApiErrorBody = {
    code: code ?? MESSAGE_TO_CODE[message] ?? "APP_ERROR",
    message,
  };
  if (details !== undefined) body.details = details;
  return body;
}

/** Error thrown by plugins/handlers that carries the HTTP status and error code. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}
