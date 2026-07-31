import { useCallback, useSyncExternalStore } from "react";

function systemTheme(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getSnapshot(): string {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (!localStorage.getItem("theme")) {
      setTheme(systemTheme());
      callback();
    }
  };
  media.addEventListener("change", onSystemChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onSystemChange);
  };
}

function setTheme(t: "dark" | "light") {
  const root = document.documentElement;
  if (t === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  const saveTheme = useCallback((t: "dark" | "light") => {
    localStorage.setItem("theme", t);
    setTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    saveTheme(theme === "dark" ? "light" : "dark");
  }, [theme, saveTheme]);

  return { theme, setTheme: saveTheme, toggleTheme };
}
