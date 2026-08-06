import { useCallback, useSyncExternalStore } from "react";

type ThemePreference = "light" | "dark" | "system";

function systemTheme(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getSnapshot(): string {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getPreference(): ThemePreference {
  const saved = localStorage.getItem("theme");
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function setTheme(t: "dark" | "light") {
  const root = document.documentElement;
  if (t === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function applyPreference(p: ThemePreference) {
  if (p === "system") setTheme(systemTheme());
  else setTheme(p);
}

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (getPreference() === "system") {
      applyPreference("system");
      callback();
    }
  };
  media.addEventListener("change", onSystemChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onSystemChange);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  const setPreference = useCallback((p: ThemePreference) => {
    localStorage.setItem("theme", p);
    applyPreference(p);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark");
  }, [theme, setPreference]);

  return { theme, preference: getPreference(), setTheme: setPreference, toggleTheme };
}
