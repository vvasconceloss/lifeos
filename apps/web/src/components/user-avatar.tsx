import { cn } from "@/lib/utils";

export function UserAvatar({ email, className }: { email: string; className?: string }) {
  const initial = (email?.trim()[0] ?? "?").toUpperCase();

  return (
    <span
      className={cn(
        "flex size-8 shrink-0 select-none items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
