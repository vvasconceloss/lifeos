import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTheme } from "./use-theme";

describe("useTheme", () => {
  it("defaults to light with a system preference", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    expect(result.current.preference).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("sets and applies a theme preference", async () => {
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.setTheme("dark");
    });
    expect(result.current.theme).toBe("dark");
    expect(result.current.preference).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    await act(async () => {
      result.current.setTheme("light");
    });
    expect(result.current.theme).toBe("light");
  });

  it("reads a saved preference on mount", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe("dark");
    localStorage.removeItem("theme");
  });

  it("toggles between light and dark", async () => {
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("dark");
    await act(async () => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("light");
  });

  it("applies the system preference from prefers-color-scheme", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.setTheme("system");
    });
    expect(result.current.theme).toBe("dark");

    window.matchMedia = original;
  });
});
