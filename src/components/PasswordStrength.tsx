import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const RULES = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "A number", test: (p: string) => /\d/.test(p) },
  { label: "A symbol", test: (p: string) => /[^\w\s]/.test(p) },
];

export function passwordMeetsStrength(password: string): boolean {
  return RULES.every((rule) => rule.test(password));
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
      {RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5",
              met ? "text-success" : "text-muted-foreground",
            )}
          >
            {met ? (
              <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
            ) : (
              <X className="h-3 w-3 shrink-0" aria-hidden="true" />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
