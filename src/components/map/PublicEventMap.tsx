import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { Bbox } from "@/components/map/EventMap";
import { MapControls } from "@/components/map/MapControls";
import { EventSheet } from "@/components/map/EventSheet";
import { RoutePanel } from "@/components/map/RoutePanel";
import { LocationPermissionDialog } from "@/components/map/LocationPermissionDialog";
import { PoweredBy, Wordmark } from "@/components/brand";
import { api } from "@/lib/api";
import { openDirections, recordDirectionClick, recordPinClick } from "@/lib/directions";
import { fetchRoute, type RouteResult } from "@/lib/routing";
import type { Category, EventPinSummary, PublicEventDetail } from "@/lib/types";

const SEARCH_DEBOUNCE_MS = 300;

// Loaded only in the browser — Leaflet touches `window` at module-evaluation
// time and must never enter the SSR bundle. See EventMap.tsx's default export.
const EventMap = lazy(() => import("@/components/map/EventMap"));
const MAP_FALLBACK = <div className="absolute inset-0 bg-muted" />;

function requestLocation(): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => resolve(null),
      { timeout: 6000 },
    );
  });
}

export function PublicEventMap() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [center, setCenter] = useState<[number, number] | undefined>(undefined);
  const [liveLocation, setLiveLocation] = useState<[number, number] | undefined>(undefined);
  const [bounds, setBounds] = useState<Bbox | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeTarget, setRouteTarget] = useState<EventPinSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const hasRecenteredRef = useRef(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationRetrying, setLocationRetrying] = useState(false);
  const [locationRetryFailed, setLocationRetryFailed] = useState(false);
  const locationDismissedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Tracks the user's position continuously — feeds the live "you are here"
  // marker and keeps directions routing from a fresh origin. Only the first
  // fix ever recenters the map; later updates just move the dot, so the map
  // doesn't fight the user's own panning/zooming.
  //
  // Some mobile browsers (iOS Safari especially) don't reliably surface the
  // native permission prompt for a watchPosition call fired on page load —
  // it just goes nowhere, with no error and no fix. So: if we don't have a
  // fix within a few seconds, or the watch reports an error, show our own
  // dialog — its "Allow location" button re-requests from a click handler,
  // which reliably triggers the native prompt since it's a user gesture.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let gotFix = false;
    const graceTimer = window.setTimeout(() => {
      if (!gotFix && !locationDismissedRef.current) setShowLocationPrompt(true);
    }, 4000);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        gotFix = true;
        window.clearTimeout(graceTimer);
        setShowLocationPrompt(false);
        const point: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setLiveLocation(point);
        if (!hasRecenteredRef.current) {
          hasRecenteredRef.current = true;
          setCenter(point);
        }
      },
      () => {
        window.clearTimeout(graceTimer);
        if (!locationDismissedRef.current) setShowLocationPrompt(true);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 },
    );
    return () => {
      window.clearTimeout(graceTimer);
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const retryLocationPermission = () => {
    setLocationRetrying(true);
    setLocationRetryFailed(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationRetrying(false);
        setShowLocationPrompt(false);
        const point: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setLiveLocation(point);
        hasRecenteredRef.current = true;
        setCenter(point);
      },
      () => {
        setLocationRetrying(false);
        setLocationRetryFailed(true);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const dismissLocationPrompt = () => {
    locationDismissedRef.current = true;
    setShowLocationPrompt(false);
  };

  const categoriesKey = selectedCategories.join(",");

  const { data: events = [] } = useQuery({
    queryKey: ["public-events", bounds?.join(",") ?? "unset", categoriesKey, debouncedQuery],
    queryFn: () => {
      const params = new URLSearchParams({ bounds: bounds!.join(",") });
      if (selectedCategories.length > 0) params.set("categories", categoriesKey);
      if (debouncedQuery) params.set("q", debouncedQuery);
      return api.get<EventPinSummary[]>(`/events/?${params.toString()}`);
    },
    enabled: bounds !== null,
    placeholderData: (previous) => previous,
  });

  const activeEvent = events.find((e) => e.id === activeId) ?? null;

  const detailQuery = useQuery({
    queryKey: ["public-event-detail", activeId],
    queryFn: () => api.get<PublicEventDetail>(`/events/${activeId}`),
    enabled: expanded && activeId !== null,
  });

  const handleSelect = (event: EventPinSummary) => {
    void recordPinClick(event.id);
    setActiveId(event.id);
    setExpanded(false);
  };

  const clearRoute = () => {
    setRoute(null);
    setRouteTarget(null);
    setRouteError(null);
    setRouteLoading(false);
  };

  const handleDirections = async (target: EventPinSummary) => {
    void recordDirectionClick(target.id);
    // Dismiss the preview card immediately — the route panel takes over.
    setActiveId(null);
    setExpanded(false);
    setRoute(null);
    setRouteError(null);
    setRouteTarget(target);

    let origin = liveLocation ?? center;
    if (!origin) {
      origin = (await requestLocation()) ?? undefined;
      if (origin) {
        setCenter(origin);
        setLiveLocation(origin);
      }
    }
    if (!origin) {
      setRouteError("Share your location to route in-app.");
      return;
    }
    setRouteLoading(true);
    try {
      setRoute(await fetchRoute(origin, [target.lat, target.lng]));
    } catch {
      setRoute(null);
      setRouteError("Couldn't calculate a route right now.");
    } finally {
      setRouteLoading(false);
    }
  };

  const toggleCategory = (category: Category) =>
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <h1 className="sr-only">BubVerseVacy event map</h1>
      <ClientOnly fallback={MAP_FALLBACK}>
        <Suspense fallback={MAP_FALLBACK}>
          <EventMap
            events={events}
            activeId={activeId}
            onSelect={handleSelect}
            center={center}
            onBoundsChange={setBounds}
            route={route?.points ?? null}
            userLocation={liveLocation ?? center}
            routeTargetId={routeTarget?.id ?? null}
          />
        </Suspense>
      </ClientOnly>

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

      {activeEvent && (
        <EventSheet
          event={activeEvent}
          detail={detailQuery.data}
          detailLoading={detailQuery.isLoading}
          expanded={expanded}
          onExpand={() => setExpanded(true)}
          onCollapse={() => setExpanded(false)}
          onClose={() => {
            setActiveId(null);
            setExpanded(false);
            clearRoute();
          }}
          onDirections={() => void handleDirections(activeEvent)}
          directionsLoading={routeLoading}
        />
      )}

      {routeTarget && (
        <RoutePanel
          target={routeTarget}
          route={route}
          loading={routeLoading}
          error={routeError}
          onExit={clearRoute}
          onOpenExternally={() => openDirections(routeTarget)}
        />
      )}

      {bounds && events.length === 0 && (
        <div className="surface-frost pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl px-4 py-3 text-sm text-muted-foreground shadow-sm">
          No events match the current filters.
        </div>
      )}

      <LocationPermissionDialog
        open={showLocationPrompt}
        retrying={locationRetrying}
        retryFailed={locationRetryFailed}
        onRetry={retryLocationPermission}
        onDismiss={dismissLocationPrompt}
      />
    </main>
  );
}
