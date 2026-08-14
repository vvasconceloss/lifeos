import { Check, X } from "lucide-react";
import { PASSWORD_RULES, passwordStrength, type PasswordStrength } from "@lifeos/shared";
import { cn } from "@/lib/utils";

const STRENGTH_META: Record<PasswordStrength, { label: string; className: string }> = {
  weak: { label: "Weak", className: "bg-destructive" },
  medium: { label: "Medium", className: "bg-amber-500" },
  strong: { label: "Strong", className: "bg-green-500" },
};

function buildRules(email?: string) {
  return [
    ...PASSWORD_RULES,
    {
      id: "email",
      label: "Different from your email",
      test: (p: string) => (email ? p.toLowerCase() !== email.toLowerCase() : true),
    },
  ];
}

export function PasswordRequirementsList({
  password,
  email,
}: {
  password: string;
  email?: string;
}) {
  const hasValue = password.length > 0;

  return (
    <ul className="grid gap-1" aria-live="polite">
      {buildRules(email).map((rule) => {
        const met = hasValue && rule.test(password);
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors duration-200",
              !hasValue
                ? "text-background/70"
                : met
                  ? "text-background"
                  : "text-background/60",
            )}
          >
            {hasValue && (met ? <Check className="size-3.5" /> : <X className="size-3.5" />)}
            <span>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function PasswordStrengthMeter({
  password,
  email,
}: {
  password: string;
  email?: string;
}) {
  const hasValue = password.length > 0;
  if (!hasValue) return null;

  const rules = buildRules(email);
  const metCount = rules.filter((rule) => rule.test(password)).length;
  const strength = passwordStrength(password);
  const { label, className } = STRENGTH_META[strength];

  return (
    <div className="mt-2">
      <div className="flex gap-1.5" aria-hidden>
        {rules.map((rule) => {
          const met = rule.test(password);
          return (
            <span
              key={rule.id}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-200",
                met ? className : "bg-border",
              )}
            />
          );
        })}
      </div>
      <p className="mt-1 text-xs font-medium text-foreground/70">
        {label} · {metCount}/{rules.length}
      </p>
    </div>
  );
}
