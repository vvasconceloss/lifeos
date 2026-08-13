import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "./use-auth";

describe("useAuth", () => {
  it("throws when used outside the AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow();
  });
});
