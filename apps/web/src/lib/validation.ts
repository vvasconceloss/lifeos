import type { ZodType } from "zod";

const MESSAGES: Record<string, Record<string, string>> = {
  email: {
    required: "Email is required",
    invalid: "Invalid email address",
    too_small: "Email must be at least 5 characters",
    too_big: "Email must be at most 254 characters",
  },
  password: {
    required: "Password is required",
    too_small: "Password must be at least 8 characters",
    too_big: "Password must be at most 72 characters",
  },
  name: {
    too_small: "Name must be at least 1 character",
    too_big: "Name must be at most 100 characters",
  },
};

export function validateForm<T>(schema: ZodType, data: unknown): T {
  const result = schema.safeParse(data);

  if (result.success) return {} as T;

  const errors: Record<string, string | undefined> = {};

  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    if (errors[field]) continue;

    const code = issue.code;
    const format =
      "format" in issue ? (issue as { format: string }).format : "";

    const key =
      code === "invalid_type" ||
      code === "invalid_format" ||
      format === "email"
        ? "invalid"
        : code;

    if (code === "too_small" && "minimum" in issue) {
      const min = (issue as { minimum: number }).minimum;
      if (min <= 1) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      } else {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${min} characters`;
      }
    } else {
      errors[field] = MESSAGES[field]?.[key] ?? issue.message;
    }
  }

  return errors as T;
}
