import { Link, useMatchRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CalendarDays, LayoutGrid, Map as MapIcon, Plus } from "lucide-react";
import { Wordmark, DashboardFooter } from "@/components/brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InitialsAvatar } from "@/components/Avatar";

type NavItem = { to: string; label: string; icon: typeof LayoutGrid; exact?: boolean };

const NAV_MAP: NavItem = { to: "/", label: "Map", icon: MapIcon, exact: true };
const NAV_LEFT: NavItem = { to: "/planner", label: "Overview", icon: LayoutGrid, exact: true };
const NAV_RIGHT: NavItem = { to: "/planner/events", label: "My events", icon: CalendarDays };
const NEW_EVENT_PATH = "/planner/new-event";

function NavLink({ item }: { item: NavItem }) {
  const matchRoute = useMatchRoute();
  const active = !!matchRoute({ to: item.to, fuzzy: !item.exact });
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="flex items-center gap-1.5">
        {item.label}
        {active && <span className="bv-nav-dot" aria-hidden="true" />}
      </span>
    </Link>
  );
}

function NewEventButton() {
  const matchRoute = useMatchRoute();
  const active = !!matchRoute({ to: NEW_EVENT_PATH });
  return (
    <Link
      to={NEW_EVENT_PATH}
      aria-label="New event"
      className="relative -mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform hover:scale-105"
    >
      <Plus className="h-6 w-6" aria-hidden="true" />
      {active && <span className="bv-nav-dot absolute right-1 top-1" aria-hidden="true" />}
    </Link>
  );
}

export function PlannerShell({
  organizerName,
  children,
}: {
  organizerName: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur">
        <Wordmark className="text-base" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/planner/profile"
            aria-label="Your profile"
            className="rounded-full transition-opacity hover:opacity-80"
          >
            <InitialsAvatar name={organizerName} className="h-9 w-9 text-sm" />
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-4">
        {children}
        <DashboardFooter showBackToMap={false} />
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
          <NavLink item={NAV_MAP} />
          <NavLink item={NAV_LEFT} />
          <NewEventButton />
          <NavLink item={NAV_RIGHT} />
        </div>
      </nav>
    </div>
  );
}
