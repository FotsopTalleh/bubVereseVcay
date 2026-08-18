import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin } from "lucide-react";
import { formatEventDate, formatTimeRange } from "@/lib/directions";
import { categoryToSlug, cloudinaryResized, eventPathParts, type CitySlug } from "@/lib/seo";
import type { EventListSummary } from "@/lib/types";

/** Real HTML cards (not map pins) shared by the city and category SEO
 * pages, each links to the event's own page and its category page for
 * internal-linking crawl paths. */
export function EventCardList({ events, city }: { events: EventListSummary[]; city: CitySlug }) {
  if (events.length === 0) {
    return (
      <p className="mt-8 rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        No upcoming events here right now, check back soon.
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {events.map((event) => {
        const { city: eventCity, slug } = eventPathParts(event);
        return (
          <article
            key={event.id}
            className="flex flex-col overflow-hidden rounded-2xl border bg-card"
          >
            <Link to="/events/$city/$slug" params={{ city: eventCity, slug }}>
              <img
                src={cloudinaryResized(event.flyerImageUrl, 480)}
                alt={`${event.title} flyer`}
                loading="lazy"
                className="h-40 w-full object-cover object-top"
              />
            </Link>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <Link
                to="/events/$city/category/$category"
                params={{ city, category: categoryToSlug(event.category) }}
                className="text-[10px] font-medium uppercase tracking-wide text-primary hover:underline"
              >
                {event.category}
              </Link>
              <Link
                to="/events/$city/$slug"
                params={{ city: eventCity, slug }}
                className="font-medium hover:underline"
              >
                {event.title}
              </Link>
              <div className="mt-auto space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {formatEventDate(event.date)} · {formatTimeRange(event.startTime, event.endTime)}
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {event.venueName}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
