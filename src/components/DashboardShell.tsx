import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardFooter, Wordmark } from "@/components/brand";
import { clearSession } from "@/lib/session";

type NavItem = { to: string; label: string };

export function DashboardShell({
  title,
  subtitle,
  nav,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/">
            <Wordmark className="text-base" />
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to.split("/").length <= 2 }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearSession();
              void router.navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
        <DashboardFooter />
      </div>
    </div>
  );
}

export function SignedOutNotice({ role }: { role: "planner" | "administrator" }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <Wordmark className="text-lg" />
        <p className="mt-3 text-sm text-muted-foreground">
          You need to be signed in as {role === "planner" ? "an event planner" : "an administrator"}{" "}
          to open this area.
        </p>
        <Button asChild className="mt-5">
          <Link to="/auth">Go to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
