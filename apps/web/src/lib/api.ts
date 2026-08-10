import axios from "axios";

function getCsrfToken(): string | null {
  const match = document.cookie.match(
    /(?:^|;\s*)_csrf=([^;]+)/,
  );
  if (!match) return null;

  let value = decodeURIComponent(match[1]);

  if (value.startsWith("s:")) {
    value = value.replace(/^s:/, "").replace(/\.[^.]+$/, "");
  }

  return value;
}

export const api = axios.create({
  baseURL: "/v1",
  withCredentials: true,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken && /^(post|put|patch|delete)$/i.test(config.method ?? "")) {
    config.headers.set("csrf-token", csrfToken);
  }
  return config;
});
