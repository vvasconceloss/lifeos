import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateForm } from "./validation";

const schema = z.object({
  email: z.email().min(5),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

type FieldErrors = Partial<Record<"email" | "password" | "name", string>>;

describe("validateForm", () => {
  it("returns no errors for valid input", () => {
    expect(
      validateForm<FieldErrors>(schema, { email: "a@b.co", password: "12345678", name: "N" }),
    ).toEqual({});
  });

  it("reports a required field (min 1) as required", () => {
    const errors = validateForm<FieldErrors>(schema, {
      email: "a@b.co",
      password: "12345678",
      name: "",
    });
    expect(errors.name).toBe("Name is required");
  });

  it("reports a length error for a short field", () => {
    const errors = validateForm<FieldErrors>(schema, {
      email: "a@b.co",
      password: "short",
      name: "N",
    });
    expect(errors.password).toBe("Password must be at least 8 characters");
  });

  it("reports an invalid email", () => {
    const errors = validateForm<FieldErrors>(schema, {
      email: "not-an-email",
      password: "12345678",
      name: "N",
    });
    expect(errors.email).toBe("Invalid email address");
  });

  it("uses the schema message as the fallback for unknown codes", () => {
    const custom = z.object({ code: z.string().regex(/^[A-Z]+$/, "must be uppercase") });
    expect(validateForm<{ code?: string }>(custom, { code: "abc" }).code).toBe(
      "must be uppercase",
    );
  });
});
