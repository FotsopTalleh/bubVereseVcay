import { CalendarDays, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareButton";
import { formatEventDate, formatTimeRange } from "@/lib/directions";
import type { EventListSummary } from "@/lib/types";

type Props = {
  events: EventListSummary[];
  onDirections: (event: EventListSummary) => void;
  onSeeMore: (event: EventListSummary) => void;
};

/** Public-facing sibling of planner.events.tsx's card grid, same visual
 * shape, but no click-count stats (those are planner-only) and the actions
 * are Get Directions / Share rather than Edit / Delete. */
export function EventListView({ events, onDirections, onSeeMore }: Props) {
  return (
    <div className="mx-auto grid max-w-3xl gap-4 pb-4 sm:grid-cols-2">
      {events.map((event) => (
        <article
          key={event.id}
          className="flex flex-col overflow-hidden rounded-2xl border bg-card"
        >
          <button
            type="button"
            onClick={() => onSeeMore(event)}
            aria-label={`View details for ${event.title}`}
          >
            <img
              src={event.flyerImageUrl}
              alt=""
              loading="lazy"
              className="h-40 w-full object-cover object-top"
            />
          </button>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <div>
              <p className="tracking-arch text-[10px] text-muted-foreground">{event.category}</p>
              <h2 className="truncate font-medium">{event.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
            </div>

            <dl className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{event.venueName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                {formatEventDate(event.date)} · {formatTimeRange(event.startTime, event.endTime)}
              </div>
            </dl>

            <button
              type="button"
              onClick={() => onSeeMore(event)}
              className="text-left text-xs font-medium text-primary hover:underline"
            >
              See more
            </button>

            <div className="mt-auto flex gap-2 pt-1">
              <Button className="flex-1" onClick={() => onDirections(event)}>
                <Navigation className="h-4 w-4" aria-hidden="true" />
                Get Directions
              </Button>
              <ShareButton event={event} variant="full" className="flex-1" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
