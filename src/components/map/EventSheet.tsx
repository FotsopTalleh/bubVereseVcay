import { CalendarDays, Clock, MapPin, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatEventDate, formatTimeRange, openDirections } from "@/lib/directions";
import type { EventRecord, Organizer } from "@/lib/types";

type Props = {
  event: EventRecord;
  organizer?: Organizer | undefined;
  expanded: boolean;
  onExpand: () => void;
  onClose: () => void;
};

export function EventSheet({ event, organizer, expanded, onExpand, onClose }: Props) {
  const verified = organizer?.status === "Verified";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3">
      <div
        className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-xl duration-200 animate-in slide-in-from-bottom-4"
        role="dialog"
        aria-label={event.title}
      >
        <div className="flex items-start gap-3 p-3">
          <button
            type="button"
            onClick={expanded ? undefined : onExpand}
            className="flex flex-1 items-start gap-3 text-left"
            aria-label={expanded ? undefined : `Open full details for ${event.title}`}
          >
            <img
              src={event.image}
              alt=""
              loading="lazy"
              className="h-20 w-16 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="tracking-arch text-[10px] text-muted-foreground">
                {event.category}
              </p>
              <h2 className="truncate text-base font-semibold">{event.title}</h2>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatEventDate(event.date)} · {formatTimeRange(event.startTime, event.endTime)}
              </p>
              {verified && <VerifiedBadge compact />}
            </div>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close event card"
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {expanded && (
          <div className="space-y-4 border-t px-3 py-4">
            <img
              src={event.image}
              alt={`${event.title} flyer`}
              loading="lazy"
              className="h-56 w-full rounded-xl object-cover"
            />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {event.description}
            </p>
            <dl className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <dt className="font-medium">{event.venueName}</dt>
                  <dd className="text-muted-foreground">{event.address}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <dt className="font-medium">
                    {formatEventDate(event.date)}
                  </dt>
                  <dd className="text-muted-foreground">
                    {formatTimeRange(event.startTime, event.endTime)}
                  </dd>
                </div>
              </div>
            </dl>
            {organizer && (
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                <p className="tracking-arch text-[10px] text-muted-foreground">Organizer</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                  {organizer.name}
                  {verified && <VerifiedBadge />}
                </p>
                {organizer.showContactsPublicly && organizer.channels[0] && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {organizer.channels[0].type}: {organizer.channels[0].value}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="border-t p-3">
          <Button className="w-full" onClick={() => openDirections(event)}>
            <Navigation className="h-4 w-4" aria-hidden="true" />
            Get Directions
          </Button>
        </div>
      </div>
    </div>
  );
}
