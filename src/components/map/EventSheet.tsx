import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  MapPin,
  Navigation,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareButton";
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

function Lightbox({
  images,
  index,
  title,
  onIndexChange,
  onClose,
}: {
  images: string[];
  index: number;
  title: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 duration-150 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photo ${index + 1} of ${images.length}`}
      onClick={onClose}
    >
      {/* Deliberately top-LEFT, not top-right — a top-right close button
          sits at the same screen position as the account icon underneath
          once this overlay unmounts, and a mobile "ghost click" (the tap
          that closes this also registers on whatever's now there) would
          send the user straight to the sign-in page. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute left-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index - 1 + images.length) % images.length);
            }}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-4"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index + 1) % images.length);
            }}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-4"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      )}

      <img
        src={images[index]}
        alt={`${title} photo ${index + 1} of ${images.length}`}
        className="max-h-full max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`View photo ${i + 1} of ${gallery.length} full size`}
                  className="shrink-0 snap-center"
                >
                  <img
                    src={src}
                    alt={`${event.title} photo ${i + 1} of ${gallery.length}`}
                    loading="lazy"
                    className="h-72 w-full rounded-xl object-cover sm:w-[26rem]"
                  />
                </button>
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

        <div className="flex shrink-0 gap-2 border-t p-3">
          <Button className="flex-1" onClick={onDirections} disabled={directionsLoading}>
            <Navigation className="h-4 w-4" aria-hidden="true" />
            {directionsLoading ? "Calculating route…" : "Get Directions"}
          </Button>
          <ShareButton event={event} variant="full" className="flex-1" />
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={gallery}
          index={lightboxIndex}
          title={event.title}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
