import { createFileRoute, notFound } from "@tanstack/react-router";
import { EventCardList } from "@/components/seo/EventCardList";
import { api } from "@/lib/api";
import {
  CITIES,
  absoluteUrl,
  categoryToSlug,
  classifyCity,
  isUpcoming,
  slugToCategory,
  type CitySlug,
} from "@/lib/seo";
import type { EventListSummary } from "@/lib/types";

const LISTING_CAP = 60;

/** City + category intent page, e.g. /events/douala/category/music. */
export const Route = createFileRoute("/events/$city/category/$category")({
  loader: async ({ params }) => {
    if (!(params.city in CITIES)) throw notFound();
    const city = params.city as CitySlug;
    const category = slugToCategory(params.category);
    if (!category) throw notFound();

    const events = await api.get<EventListSummary[]>("/events/?view=list");
    const upcoming = events
      .filter(
        (e) => isUpcoming(e.date) && e.category === category && classifyCity(e.lat, e.lng) === city,
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, LISTING_CAP);

    return { city, category, events: upcoming };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { city, category } = loaderData;
    const cityName = CITIES[city].name;
    const title = `${category} events in ${cityName} | BubVerseVacy`;
    const description = `Upcoming ${category.toLowerCase()} events in ${cityName}, Cameroon. Browse dates, venues and get directions.`;
    const url = absoluteUrl(`/events/${city}/category/${categoryToSlug(category)}`);

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
  component: CategoryEventsPage,
});

function CategoryEventsPage() {
  const { city, category, events } = Route.useLoaderData();
  const cityName = CITIES[city].name;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">
        {category} events in {cityName}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Find upcoming {category.toLowerCase()} events happening in {cityName}, from small local
        gatherings to major shows.
      </p>
      <EventCardList events={events} city={city} />
    </main>
  );
}
