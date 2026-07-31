import type { ReactNode } from "react";
import { useTheme } from "@/hooks/use-theme";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { theme } = useTheme();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <main className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <img
          src={theme === "dark" ? "/lifeos-black-icon.png" : "/lifeos-white-icon.png"}
          alt="LifeOS logo"
          className="mb-6 max-h-12 w-auto"
        />
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <aside className="relative hidden overflow-hidden bg-zinc-950 lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.28),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(56,189,248,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 `bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] bg-size-[28px_28px]" />
        <div className="relative z-10 max-w-lg px-12">
          <p className="text-center text-4xl leading-tight font-semibold tracking-tight text-white">
            Start tracking your habits and building a better you.
          </p>
        </div>
      </aside>
    </div>
  );
}
