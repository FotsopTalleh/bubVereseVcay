import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { CATEGORIES } from "@/lib/types";
import type { EventListSummary } from "@/lib/types";
import { CITY_SLUGS, absoluteUrl, categoryToSlug, eventPathParts, isUpcoming } from "@/lib/seo";

function urlEntry(loc: string, changefreq: string): string {
  return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n  </url>`;
}

/** Regenerated from live event data (not a static file), so an unpublished/
 * expired event drops out on its own rather than lingering as a dead
 * sitemap entry. Building it requires a cross-service round trip to the
 * Railway backend plus a full Firestore scan there, slow enough (1-2s+)
 * that crawlers hitting it repeatedly is worth avoiding, so responses are
 * cached at Cloudflare's edge for a few minutes via the Workers Cache API. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // `caches` isn't a global at all in the plain Vite/Node dev server,
        // only in the actual Cloudflare runtime, hence the typeof guard.
        // `.default` itself isn't part of the standard CacheStorage type the
        // DOM lib declares `caches` as (Cloudflare-specific), hence the cast.
        const cache =
          typeof caches !== "undefined"
            ? (caches as unknown as { default?: Cache }).default
            : undefined;
        if (cache) {
          const cached = await cache.match(request);
          if (cached) return cached;
        }

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

        const response = new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
        if (cache) await cache.put(request, response.clone());
        return response;
      },
    },
  },
});
