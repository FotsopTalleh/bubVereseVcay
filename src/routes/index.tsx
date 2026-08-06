import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LogIn } from "lucide-react";
import { EventMap } from "@/components/map/EventMap";
import { MapControls } from "@/components/map/MapControls";
import { EventSheet } from "@/components/map/EventSheet";
import { PoweredBy, Wordmark } from "@/components/brand";
import { hydrateStore, recordPinClick, useStore } from "@/lib/store";
import type { Category, EventRecord } from "@/lib/types";

export const Route = createFileRoute("/")({
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
  component: PublicMap,
});

function PublicMap() {
  const events = useStore((s) => s.events);
  const organizers = useStore((s) => s.organizers);
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [center, setCenter] = useState<[number, number] | undefined>(undefined);

  useEffect(() => {
    hydrateStore();
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.longitude, pos.coords.latitude]),
      () => {
        /* keep the default city center */
      },
      { timeout: 6000 },
    );
  }, []);

  const visibleEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter(
      (e) =>
        e.status === "Published" &&
        (selectedCategories.length === 0 || selectedCategories.includes(e.category)) &&
        (q === "" || e.title.toLowerCase().includes(q)),
    );
  }, [events, query, selectedCategories]);

  const activeEvent = visibleEvents.find((e) => e.id === activeId) ?? null;

  const handleSelect = (event: EventRecord) => {
    recordPinClick(event.id);
    setActiveId(event.id);
    setExpanded(false);
  };

  const toggleCategory = (category: Category) =>
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <h1 className="sr-only">BubVerseVacy event map</h1>
      <EventMap
        events={visibleEvents}
        activeId={activeId}
        onSelect={handleSelect}
        center={center}
      />

      <MapControls
        query={query}
        onQuery={setQuery}
        selected={selectedCategories}
        onToggle={toggleCategory}
        onClear={() => setSelectedCategories([])}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 flex justify-between p-3" />

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col items-start gap-2">
        <div className="pointer-events-auto surface-frost flex items-center gap-2 rounded-full px-3 py-1.5 shadow-sm">
          <Wordmark className="text-sm" />
        </div>
        <div className="pointer-events-auto surface-frost rounded-full px-3 py-1.5 shadow-sm">
          <PoweredBy />
        </div>
      </div>

      <Link
        to="/auth"
        className="surface-frost absolute right-3 top-3 z-20 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent sm:inline-flex"
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
        Planner sign in
      </Link>

      {activeEvent && (
        <EventSheet
          event={activeEvent}
          organizer={organizers.find((o) => o.id === activeEvent.organizerId)}
          expanded={expanded}
          onExpand={() => setExpanded(true)}
          onClose={() => {
            setActiveId(null);
            setExpanded(false);
          }}
        />
      )}

      {visibleEvents.length === 0 && (
        <div className="surface-frost pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl px-4 py-3 text-sm text-muted-foreground shadow-sm">
          No events match the current filters.
        </div>
      )}
    </main>
  );
}
