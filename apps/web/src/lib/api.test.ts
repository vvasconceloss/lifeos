import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";
import { api } from "./api";

describe("api client", () => {
  it("targets the /v1 base URL with credentials and a timeout", () => {
    expect(api.defaults.baseURL).toBe("/v1");
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.timeout).toBe(15000);
  });

  it("attaches the csrf token from the cookie on state-changing requests", async () => {
    document.cookie = "_csrf=s%3Aabc.def";

    let csrfToken: unknown;
    await api.post("/ping", {}, {
      adapter: async (config) => {
        csrfToken = config.headers.get("csrf-token");
        return { data: {}, status: 200, statusText: "OK", headers: {}, config };
      },
    });

    expect(csrfToken).toBe("abc");
    document.cookie = "_csrf=; Max-Age=0";
  });

  it("does not set a csrf token when no cookie is present", async () => {
    document.cookie = "_csrf=; Max-Age=0";

    let csrfToken: unknown;
    await api.post("/ping", {}, {
      adapter: async (config) => {
        csrfToken = config.headers.get("csrf-token");
        return { data: {}, status: 200, statusText: "OK", headers: {}, config };
      },
    });

    expect(csrfToken).toBeUndefined();
  });
});

describe("axios error shapes", () => {
  it("exposes the response payload on errors", () => {
    const error = new AxiosError("Request failed", undefined, undefined, undefined, {
      status: 400,
      statusText: "",
      headers: {},
      config: {} as never,
      data: { error: { code: "BAD", message: "Bad" } },
    } as never);
    expect(error.response?.data).toEqual({ error: { code: "BAD", message: "Bad" } });
  });
});
