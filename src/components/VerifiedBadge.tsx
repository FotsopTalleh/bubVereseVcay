import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {compact ? "Verified" : "Verified Organizer"}
    </span>
  );
}
