function initialsOf(name: string | undefined | null): string {
  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}

/** No real avatar-image field exists yet on Organizer, initials stand in for one.
 * `name` accepts undefined/null too: sessions persisted before this field
 * existed won't have it until the user logs in again, and this must never
 * crash the page in the meantime. */
export function InitialsAvatar({
  name,
  className = "",
}: {
  name: string | undefined | null;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground ${className}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
