import { haversineMeters } from "./routing";
import { CATEGORIES, type Category, type EventListSummary } from "./types";

/** Same-origin default: no custom domain is configured yet, so this is the
 * live Cloudflare Worker URL. Override via VITE_SITE_URL once a custom
 * domain exists, canonical/OG/JSON-LD URLs all key off this. */
export const SITE_URL =
  (import.meta.env["VITE_SITE_URL"] as string | undefined) ??
  "https://bubversevacy.preciousfotsop.workers.dev";

export const CITIES = {
  buea: { name: "Buea", lat: 4.156, lng: 9.283 },
  douala: { name: "Douala", lat: 4.05, lng: 9.7 },
} as const;

export type CitySlug = keyof typeof CITIES;
export const CITY_SLUGS = Object.keys(CITIES) as CitySlug[];

/** V1 is scoped to exactly these two cities (no stored city field on events),
 * so city is derived from whichever centroid a pin is geographically closest
 * to, cheap and accurate enough at this app's scale. Revisit with a real
 * `city` field if the product expands beyond Buea/Douala. */
export function classifyCity(lat: number, lng: number): CitySlug {
  let closest: CitySlug = "buea";
  let closestDist = Infinity;
  for (const slug of CITY_SLUGS) {
    const city = CITIES[slug];
    const dist = haversineMeters([lat, lng], [city.lat, city.lng]);
    if (dist < closestDist) {
      closestDist = dist;
      closest = slug;
    }
  }
  return closest;
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const SHORT_ID_LENGTH = 8;

/** `/events/{city}/{title-slug}-{short-id}`, the short id is a prefix of
 * the Firestore doc id, not a full one, for a readable URL. At this app's
 * event volume a prefix collision is not a realistic concern for V1. */
export function eventPathParts(event: { id: string; title: string; lat: number; lng: number }): {
  city: CitySlug;
  slug: string;
} {
  const city = classifyCity(event.lat, event.lng);
  const shortId = event.id.slice(0, SHORT_ID_LENGTH).toLowerCase();
  return { city, slug: `${slugify(event.title)}-${shortId}` };
}

export function eventPath(event: { id: string; title: string; lat: number; lng: number }): string {
  const { city, slug } = eventPathParts(event);
  return `/events/${city}/${slug}`;
}

/** Resolves a `{title-slug}-{short-id}` URL segment back to one of `events`
 * by matching the trailing short id, the slug text itself is cosmetic. */
export function resolveEventBySlug<T extends { id: string }>(
  events: T[],
  slugParam: string,
): T | undefined {
  const dashIndex = slugParam.lastIndexOf("-");
  if (dashIndex === -1) return undefined;
  const shortId = slugParam.slice(dashIndex + 1).toLowerCase();
  if (shortId.length !== SHORT_ID_LENGTH) return undefined;
  return events.find((e) => e.id.toLowerCase().startsWith(shortId));
}

export function categoryToSlug(category: Category): string {
  return category.toLowerCase();
}

export function slugToCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => categoryToSlug(c) === slug.toLowerCase());
}

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

/** Event `date` fields are plain "YYYY-MM-DD" strings, sort/compare
 * correctly as-is, today's own events still count as upcoming. */
export function isUpcoming(dateIso: string): boolean {
  return dateIso >= TODAY_ISO();
}

/** Inserts a Cloudinary transformation (capped width, auto format/quality)
 * right after `/upload/` so SEO pages never ship the full-resolution
 * original. Falls back to the original URL for anything that isn't a
 * recognizable Cloudinary delivery URL. */
export function cloudinaryResized(url: string, width: number): string {
  const marker = "/upload/";
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const insertAt = i + marker.length;
  return `${url.slice(0, insertAt)}w_${width},c_limit,q_auto,f_auto/${url.slice(insertAt)}`;
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

export function formatEventDateLong(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toIsoDateTime(dateIso: string, time: string): string {
  return `${dateIso}T${time}:00`;
}

export type EventJsonLd = Record<string, unknown>;

export function buildEventJsonLd(
  event: EventListSummary,
  cityName: string,
  pageUrl: string,
): EventJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: toIsoDateTime(event.date, event.startTime),
    endDate: toIsoDateTime(event.date, event.endTime),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    description: event.description,
    image: [cloudinaryResized(event.flyerImageUrl, 1200)],
    url: pageUrl,
    location: {
      "@type": "Place",
      name: event.venueName,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.address,
        addressLocality: cityName,
        addressCountry: "CM",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: event.lat,
        longitude: event.lng,
      },
    },
    ...(event.organizer
      ? { organizer: { "@type": "Organization", name: event.organizer.name } }
      : {}),
  };
}
