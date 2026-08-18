import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { CATEGORIES } from "@/lib/types";
import type { EventListSummary } from "@/lib/types";
import { CITY_SLUGS, absoluteUrl, categoryToSlug, eventPathParts, isUpcoming } from "@/lib/seo";

function urlEntry(loc: string, changefreq: string): string {
  return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n  </url>`;
}

/** Regenerated on every request from live event data (not a static file),
 * so an unpublished/expired event drops out immediately rather than
 * lingering as a dead sitemap entry. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const events = await api.get<EventListSummary[]>("/events/?view=list");
        const upcoming = events.filter((e) => isUpcoming(e.date));

        const urls: string[] = [];
        for (const city of CITY_SLUGS) {
          urls.push(urlEntry(absoluteUrl(`/${city}/events`), "hourly"));
          for (const category of CATEGORIES) {
            urls.push(
              urlEntry(
                absoluteUrl(`/events/${city}/category/${categoryToSlug(category)}`),
                "hourly",
              ),
            );
          }
        }
        for (const event of upcoming) {
          const { city, slug } = eventPathParts(event);
          urls.push(urlEntry(absoluteUrl(`/events/${city}/${slug}`), "daily"));
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

        return new Response(xml, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
