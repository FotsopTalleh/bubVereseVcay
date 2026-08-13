import { Loader2, Navigation, X } from "lucide-react";
import { formatDistance, formatDuration, type RouteResult } from "@/lib/routing";
import type { EventPinSummary } from "@/lib/types";

type Props = {
  target: EventPinSummary;
  route: RouteResult | null;
  loading: boolean;
  error: string | null;
  onExit: () => void;
  onOpenExternally?: (() => void) | undefined;
};

export function RoutePanel({ target, route, loading, error, onExit, onOpenExternally }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center p-3">
      <div className="pointer-events-auto surface-frost flex w-full max-w-sm items-center gap-3 rounded-2xl border py-2 pl-2 pr-3 shadow-lg duration-200 animate-in slide-in-from-top-4">
        <img
          src={target.flyerImageUrl}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover object-top"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{target.title}</p>
          {loading && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />
              Calculating route…
            </p>
          )}
          {!loading && route && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Navigation className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
              {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)}
            </p>
          )}
          {!loading && error && (
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-destructive">
              {error}
              {onOpenExternally && (
                <button
                  type="button"
                  onClick={onOpenExternally}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Open in Maps
                </button>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit route"
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
