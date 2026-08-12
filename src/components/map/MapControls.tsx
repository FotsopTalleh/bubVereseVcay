import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { CircleUserRound, Search, X } from "lucide-react";
import { InitialsAvatar } from "@/components/Avatar";
import { useSession } from "@/hooks/useSession";
import { CATEGORIES, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  selected: Category[];
  onToggle: (category: Category) => void;
  onClear: () => void;
};

// Recurring pointer for signed-out visitors: pops up, holds long enough to
// read, then hides — and repeats for as long as no one's signed in. Not a
// one-time dismiss, so nothing is persisted to localStorage.
const HINT_INTERVAL_MS = 20_000;
const HINT_VISIBLE_MS = 5_000;

export function MapControls({ query, onQuery, selected, onToggle, onClear }: Props) {
  const { session } = useSession();
  const isPlanner = session?.role === "planner";
  const isLoggedIn = session !== null;
  const [showAccountHint, setShowAccountHint] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const [hintPos, setHintPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      setShowAccountHint(false);
      return;
    }

    let hideTimer: number;
    const show = () => {
      setShowAccountHint(true);
      hideTimer = window.setTimeout(() => setShowAccountHint(false), HINT_VISIBLE_MS);
    };

    show();
    const interval = window.setInterval(show, HINT_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(hideTimer);
    };
  }, [isLoggedIn]);

  // The hint is portaled to <body> (see below) so it can't get trapped
  // behind the category chips — their `surface-frost` backdrop-filter blur
  // forces its own compositing pass that mobile browsers routinely paint
  // above absolutely-positioned siblings, z-index be damned. Portaling means
  // its position has to be tracked in viewport coordinates by hand.
  useEffect(() => {
    if (!showAccountHint || !avatarRef.current) {
      setHintPos(null);
      return;
    }
    const update = () => {
      if (!avatarRef.current) return;
      const rect = avatarRef.current.getBoundingClientRect();
      setHintPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [showAccountHint]);

  const dismissAccountHint = () => setShowAccountHint(false);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 space-y-2 p-3">
      <div className="pointer-events-auto surface-frost flex items-center gap-2 rounded-full px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search events by name"
          aria-label="Search events by name"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery("")}
            aria-label="Clear search"
            className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <div ref={avatarRef} className="-mr-1 shrink-0">
          {isPlanner ? (
            <Link
              to="/planner"
              aria-label="Go to your planner dashboard"
              className="block rounded-full transition-opacity hover:opacity-80"
            >
              <InitialsAvatar name={session.organizerName} className="h-7 w-7 text-[11px]" />
            </Link>
          ) : (
            <Link
              to="/auth"
              aria-label="Planner sign in"
              className="block rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <CircleUserRound className="h-7 w-7" aria-hidden="true" strokeWidth={1.5} />
            </Link>
          )}
        </div>
      </div>

      <div className="pointer-events-auto -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={selected.length === 0} onClick={onClear} label="All" />
        {CATEGORIES.map((category) => (
          <Chip
            key={category}
            active={selected.includes(category)}
            onClick={() => onToggle(category)}
            label={category}
          />
        ))}
      </div>

      {showAccountHint &&
        hintPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="status"
            className="fixed z-50 w-52 rounded-xl bg-primary p-3 text-xs text-primary-foreground shadow-xl shadow-primary/40 ring-1 ring-primary-foreground/15 duration-150 animate-in fade-in slide-in-from-top-2"
            style={{ top: hintPos.top, right: hintPos.right }}
          >
            <span
              aria-hidden="true"
              className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 rounded-[2px] bg-primary"
            />
            <button
              type="button"
              onClick={dismissAccountHint}
              aria-label="Dismiss"
              className="absolute right-1.5 top-1.5 rounded-full p-0.5 text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
            <p className="pr-4 leading-snug">
              Don't have an account?{" "}
              <Link to="/auth" className="font-semibold underline underline-offset-2">
                Click here
              </Link>{" "}
              to create one.
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "surface-frost shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "text-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}
