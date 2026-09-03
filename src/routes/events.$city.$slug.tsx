import { useEffect } from "react";
import { createFileRoute, notFound, redirect, Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Tag } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatTimeRange, recordLinkClick } from "@/lib/directions";
import { api } from "@/lib/api";
import {
  CITIES,
  type CitySlug,
  absoluteUrl,
  buildEventJsonLd,
  categoryToSlug,
  cloudinaryResized,
  eventPath,
  formatEventDateLong,
  isUpcoming,
  resolveEventBySlug,
} from "@/lib/seo";
import type { EventListSummary } from "@/lib/types";

/** Server-rendered, crawlable event detail page, entirely separate from the
 * live map/list app at "/". Reuses the same public GET /events/?view=list
 * endpoint the list view uses; no new backend surface needed. An expired or
 * unpublished event 404s here rather than lingering as a dead page, and a
 * URL with a stale city segment 301s to the event's canonical URL. */
export const Route = createFileRoute("/events/$city/$slug")({
  loader: async ({ params }) => {
    if (!(params.city in CITIES)) throw notFound();

    const events = await api.get<EventListSummary[]>("/events/?view=list");
    const event = resolveEventBySlug(events, params.slug);
    if (!event || !isUpcoming(event.date)) throw notFound();

    const canonicalPath = eventPath(event);
    if (canonicalPath !== `/events/${params.city}/${params.slug}`) {
      throw redirect({ href: canonicalPath, statusCode: 301 });
    }

    return { event, city: params.city as CitySlug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { event, city } = loaderData;
    const cityName = CITIES[city].name;
    const path = eventPath(event);
    const url = absoluteUrl(path);
    const title = `${event.title} in ${cityName}, ${formatEventDateLong(event.date)} | BubVerseVacy`;
    const description =
      `${event.title} takes place at ${event.venueName} in ${cityName} on ${formatEventDateLong(event.date)}. ${event.description}`.slice(
        0,
        300,
      );
    const image = cloudinaryResized(event.flyerImageUrl, 1200);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: image },
        { property: "og:url", content: url },
        { property: "og:type", content: "event" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(buildEventJsonLd(event, cityName, url)),
        },
      ],
    };
  },
  component: EventSeoPage,
});

function EventSeoPage() {
  const { event, city } = Route.useLoaderData();
  const cityName = CITIES[city].name;
  const verified = event.organizer?.status === "Verified";
  const mapDeepLink = `/?event=${encodeURIComponent(event.id)}`;

  // Client-side only, so it fires for a real visitor's browser and not for
  // WhatsApp/Facebook/Google fetching this page server-side to build a link
  // preview or crawl it. This is the one place shared-link opens get
  // counted now, see PublicEventMap.tsx's ?event= handler for why it
  // doesn't also count here (would double-count the "View on map" hop).
  useEffect(() => {
    void recordLinkClick(event.id);
  }, [event.id]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <nav className="mb-6 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link
          to="/$city/events"
          params={{ city }}
          className="hover:text-foreground hover:underline"
        >
          {cityName} events
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to="/events/$city/category/$category"
          params={{ city, category: categoryToSlug(event.category) }}
          className="hover:text-foreground hover:underline"
        >
          {event.category}
        </Link>
      </nav>

      <img
        src={cloudinaryResized(event.flyerImageUrl, 1200)}
        alt={`${event.title} flyer, ${event.venueName}, ${cityName}, ${formatEventDateLong(event.date)}`}
        loading="eager"
        className="h-auto w-full rounded-2xl border object-cover object-top"
      />

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-primary">
        {event.category}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{event.title}</h1>

      <p className="mt-3 text-muted-foreground">
        {event.title} takes place at {event.venueName} in {cityName} on{" "}
        {formatEventDateLong(event.date)}.
      </p>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <dt className="font-medium">{formatEventDateLong(event.date)}</dt>
            <dd className="text-muted-foreground">
              {formatTimeRange(event.startTime, event.endTime)}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <dt className="font-medium">{event.venueName}</dt>
            <dd className="text-muted-foreground">
              {event.address}, {cityName}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <dt className="font-medium">{event.category}</dt>
        </div>
      </dl>

      <p className="mt-6 leading-relaxed">{event.description}</p>

      {(event.onlineMeetingUrl || event.attendanceFormUrl) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {event.onlineMeetingUrl && (
            <a
              href={event.onlineMeetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Join online
            </a>
          )}
          {event.attendanceFormUrl && (
            <a
              href={event.attendanceFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Attendance form
            </a>
          )}
        </div>
      )}

      {event.organizer && (
        <div className="mt-6 rounded-xl border bg-card p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Organizer</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 font-medium">
            {event.organizer.name}
            {verified && <VerifiedBadge />}
          </p>
        </div>
      )}

      <a
        href={mapDeepLink}
        className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
      >
        View on map &amp; get directions
      </a>
    </main>
  );
}
