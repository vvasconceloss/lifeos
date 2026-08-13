import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { getApiErrorMessage, isUnauthorizedError } from "./errors";

function apiError(status: number, data: unknown): AxiosError {
  return new AxiosError("Request failed", undefined, undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: {} as never,
    data,
  } as never);
}

describe("getApiErrorMessage", () => {
  it.each([
    ["object error body", { error: { code: "HABIT_NOT_FOUND", message: "Habit not found" } }, "Habit not found"],
    ["legacy string error", { error: "Email already in use" }, "Email already in use"],
    ["generic internal error", { error: { code: "INTERNAL_ERROR", message: "Internal Server Error" } }, "Something went wrong. Please try again."],
    ["generic validation error", { error: { code: "VALIDATION_ERROR", message: "Validation failed" } }, "Something went wrong. Please try again."],
    ["empty error", {}, "Something went wrong. Please try again."],
  ])("%s", (_label, data, expected) => {
    expect(getApiErrorMessage(apiError(400, data))).toBe(expected);
  });

  it("returns the fallback for non-axios errors", () => {
    expect(getApiErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
  });
});

describe("isUnauthorizedError", () => {
  it("is true for a 401 response", () => {
    expect(isUnauthorizedError(apiError(401, {}))).toBe(true);
  });

  it("is false for other statuses and non-axios errors", () => {
    expect(isUnauthorizedError(apiError(500, {}))).toBe(false);
    expect(isUnauthorizedError(new Error("boom"))).toBe(false);
  });
});
