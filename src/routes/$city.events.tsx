import { createFileRoute, notFound } from "@tanstack/react-router";
import { EventCardList } from "@/components/seo/EventCardList";
import { api } from "@/lib/api";
import { CITIES, absoluteUrl, classifyCity, isUpcoming, type CitySlug } from "@/lib/seo";
import type { EventListSummary } from "@/lib/types";

const LISTING_CAP = 60;

/** Evergreen "what's happening" page per city, e.g. /buea/events. Static
 * routes like /admin/events and /planner/events always win over this
 * dynamic $city match (exact segments beat params), so this only ever
 * resolves for city values with no existing route of their own. */
export const Route = createFileRoute("/$city/events")({
  loader: async ({ params }) => {
    if (!(params.city in CITIES)) throw notFound();
    const city = params.city as CitySlug;

    const events = await api.get<EventListSummary[]>("/events/?view=list");
    const upcoming = events
      .filter((e) => isUpcoming(e.date) && classifyCity(e.lat, e.lng) === city)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, LISTING_CAP);

    return { city, events: upcoming };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const cityName = CITIES[loaderData.city].name;
    const title = `Events in ${cityName}, What's On | BubVerseVacy`;
    const description = `Discover upcoming events happening in ${cityName}, Cameroon: music, nightlife, sports, culture and more. Updated as new events are published.`;
    const url = absoluteUrl(`/${loaderData.city}/events`);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CityEventsPage,
});

function CityEventsPage() {
  const { city, events } = Route.useLoaderData();
  const cityName = CITIES[city].name;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Events in {cityName}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        What's happening in {cityName} right now, upcoming music, nightlife, sports, business,
        culture and community events near you.
      </p>
      <EventCardList events={events} city={city} />
    </main>
  );
}
