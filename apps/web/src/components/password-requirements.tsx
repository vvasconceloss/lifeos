import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { PASSWORD_RULES, passwordStrength, type PasswordStrength } from "@lifeos/shared";
import { cn } from "@/lib/utils";

const STRENGTH_META: Record<PasswordStrength, { className: string }> = {
  weak: { className: "bg-destructive" },
  medium: { className: "bg-amber-500" },
  strong: { className: "bg-green-500" },
};

type Rule = { id: string; test: (p: string) => boolean };

function buildRules(email?: string): Rule[] {
  return [
    ...PASSWORD_RULES.map(({ id, test }) => ({ id, test })),
    {
      id: "email",
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
  const { t } = useTranslation("auth");
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
            <span>{t(`passwordRules.${rule.id}`)}</span>
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
  const { t } = useTranslation("auth");
  const hasValue = password.length > 0;
  if (!hasValue) return null;

  const rules = buildRules(email);
  const metCount = rules.filter((rule) => rule.test(password)).length;
  const strength = passwordStrength(password);
  const { className } = STRENGTH_META[strength];

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
        {t(`passwordStrength.${strength}`)} · {metCount}/{rules.length}
      </p>
    </div>
  );
}
