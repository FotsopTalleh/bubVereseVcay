import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Navigation,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatEventDate, formatTimeRange } from "@/lib/directions";
import { cn } from "@/lib/utils";
import type { EventPinSummary, PublicEventDetail } from "@/lib/types";

type Props = {
  event: EventPinSummary;
  detail: PublicEventDetail | undefined;
  detailLoading: boolean;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onClose: () => void;
  onDirections: () => void;
  directionsLoading: boolean;
};

function RatingStars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i < rounded ? "fill-warning text-warning" : "text-muted-foreground/30",
            )}
          />
        ))}
      </div>
      <span className="font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}

export function EventSheet({
  event,
  detail,
  detailLoading,
  expanded,
  onExpand,
  onCollapse,
  onClose,
  onDirections,
  directionsLoading,
}: Props) {
  const organizer = event.organizer;
  const verified = organizer?.status === "Verified";
  const gallery =
    detail?.images && detail.images.length > 0 ? detail.images : [event.flyerImageUrl];

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3">
      <div
        className="pointer-events-auto flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-card shadow-xl duration-200 animate-in slide-in-from-bottom-4"
        role="dialog"
        aria-label={event.title}
      >
        <div className="flex shrink-0 items-start gap-3 p-3">
          <button
            type="button"
            onClick={expanded ? undefined : onExpand}
            className="flex flex-1 items-start gap-3 text-left"
            aria-label={expanded ? undefined : `Open full details for ${event.title}`}
          >
            <img
              src={event.flyerImageUrl}
              alt=""
              loading="lazy"
              className="h-20 w-16 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="tracking-arch text-[10px] text-muted-foreground">{event.category}</p>
              <h2 className="truncate text-base font-semibold">{event.title}</h2>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatEventDate(event.date)} · {formatTimeRange(event.startTime, event.endTime)}
              </p>
              {verified && <VerifiedBadge compact />}
              {!expanded && (
                <p className="flex items-center gap-1 text-xs font-medium text-primary">
                  See more
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </p>
              )}
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
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto border-t px-3 py-4">
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {gallery.map((src, i) => (
                <img
                  key={src + i}
                  src={src}
                  alt={`${event.title} photo ${i + 1} of ${gallery.length}`}
                  loading="lazy"
                  className="h-56 w-[85%] shrink-0 snap-center rounded-xl object-cover"
                />
              ))}
            </div>

            {detail ? (
              <>
                {typeof detail.rating === "number" && <RatingStars rating={detail.rating} />}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {detail.description}
                </p>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <dt className="font-medium">{detail.venueName}</dt>
                      <dd className="text-muted-foreground">{detail.address}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <dt className="font-medium">{formatEventDate(event.date)}</dt>
                      <dd className="text-muted-foreground">
                        {formatTimeRange(event.startTime, event.endTime)}
                      </dd>
                    </div>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {detailLoading ? "Loading details…" : "Details unavailable."}
              </p>
            )}

            {organizer && (
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                <p className="tracking-arch text-[10px] text-muted-foreground">Organizer</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                  {organizer.name}
                  {verified && <VerifiedBadge />}
                </p>
                {organizer.bio && (
                  <p className="mt-1 text-xs text-muted-foreground">{organizer.bio}</p>
                )}
                {organizer.showContactsPublicly && organizer.channels[0] && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {organizer.channels[0].type}: {organizer.channels[0].value}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onCollapse}
              className="flex w-full items-center justify-center gap-1 text-xs font-medium text-primary"
            >
              Show less
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="shrink-0 border-t p-3">
          <Button className="w-full" onClick={onDirections} disabled={directionsLoading}>
            <Navigation className="h-4 w-4" aria-hidden="true" />
            {directionsLoading ? "Calculating route…" : "Get Directions"}
          </Button>
        </div>
      </div>
    </div>
  );
}
