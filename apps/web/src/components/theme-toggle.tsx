import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { t } = useTranslation("settings");
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="cursor-pointer"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("switchToLightMode") : t("switchToDarkMode")}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
