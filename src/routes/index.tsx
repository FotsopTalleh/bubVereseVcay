import { createFileRoute } from "@tanstack/react-router";
import { PublicEventMap } from "@/components/map/PublicEventMap";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { event?: string } =>
    typeof search["event"] === "string" ? { event: search["event"] } : {},
  head: () => ({
    meta: [
      { title: "BubVerseVacy — Discover Events Near You on the Map" },
      {
        name: "description",
        content:
          "Browse live events around Buea and Douala as flyer pins on a map. Filter by category, search by name and get directions instantly. No account needed.",
      },
      { property: "og:title", content: "BubVerseVacy — Event Discovery on the Map" },
      {
        property: "og:description",
        content:
          "A live map of nearby events. Tap a flyer pin for details and directions, no sign-up required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicEventMap,
});
