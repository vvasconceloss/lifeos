import { z } from "zod";
import { COMMON_PASSWORDS } from "./common-passwords";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

const commonPasswords = new Set(COMMON_PASSWORDS);

const SPECIAL_CHARS = `!@#$%^&*()-_=+[]{};:,.<>?/`;

export const PASSWORD_ERRORS = {
  MIN_LENGTH: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  MAX_BYTES: `Password must be at most ${PASSWORD_MAX_BYTES} bytes`,
  LOWERCASE: "Password must include at least one lowercase letter",
  UPPERCASE: "Password must include at least one uppercase letter",
  NUMBER: "Password must include at least one number",
  SPECIAL: "Password must include at least one special character",
  COMMON: "Password is too common. Choose a more unique password.",
  EMAIL_EQUAL: "Password must not be the same as your email",
} as const;

/** UTF-8 byte length of a string (bcrypt silently truncates past 72 bytes). */
export function passwordByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function isCommonPassword(value: string): boolean {
  return commonPasswords.has(value.toLowerCase());
}

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

const specialRegex = new RegExp(
  `[${SPECIAL_CHARS.replace(/[\\\]^$-]/g, "\\$&")}]`,
);

/** The rules shown in the UI checklist, mirroring the schema validation. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (value) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "lowercase",
    label: "At least one lowercase letter",
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "At least one number",
    test: (value) => /\d/.test(value),
  },
  {
    id: "special",
    label: "At least one special character",
    test: (value) => specialRegex.test(value),
  },
  {
    id: "common",
    label: "Not a commonly used password",
    test: (value) => !isCommonPassword(value),
  },
];

export type PasswordStrength = "weak" | "medium" | "strong";

/** Simple local strength score: how many of the character rules are met. */
export function passwordStrength(value: string): PasswordStrength {
  const met = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  if (met >= 6) return "strong";
  if (met >= 4) return "medium";
  return "weak";
}

/**
 * The single password policy, applied wherever a password is set or changed
 * (registration, reset, change). Reused by the API and the web client.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_ERRORS.MIN_LENGTH)
  .regex(/[a-z]/, PASSWORD_ERRORS.LOWERCASE)
  .regex(/[A-Z]/, PASSWORD_ERRORS.UPPERCASE)
  .regex(/\d/, PASSWORD_ERRORS.NUMBER)
  .regex(
    new RegExp(`[${SPECIAL_CHARS.replace(/[\\\]^$-]/g, "\\$&")}]`),
    PASSWORD_ERRORS.SPECIAL,
  )
  .refine((value) => passwordByteLength(value) <= PASSWORD_MAX_BYTES, {
    message: PASSWORD_ERRORS.MAX_BYTES,
  })
  .refine((value) => !isCommonPassword(value), {
    message: PASSWORD_ERRORS.COMMON,
  });

/** Adds the "password must not equal the email" rule to an object schema. */
export function passwordNotEqualToEmail<Schema extends z.ZodTypeAny>(schema: Schema): Schema {
  return schema.superRefine((data, ctx) => {
    const record = data as { email?: string; password?: string };
    if (
      record.email &&
      record.password &&
      record.password.toLowerCase() === record.email.toLowerCase()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: PASSWORD_ERRORS.EMAIL_EQUAL,
      });
    }
  }) as Schema;
}
