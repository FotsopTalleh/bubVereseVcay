function initialsOf(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}

/** No real avatar-image field exists yet on Organizer — initials stand in for one. */
export function InitialsAvatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground ${className}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
