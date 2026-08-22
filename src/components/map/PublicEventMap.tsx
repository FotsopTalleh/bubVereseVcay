import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { List as ListIcon, Map as MapIcon } from "lucide-react";
import { toast } from "sonner";
import type { Bbox } from "@/components/map/EventMap";
import { MapControls } from "@/components/map/MapControls";
import { EventSheet } from "@/components/map/EventSheet";
import { EventListView } from "@/components/map/EventListView";
import { RoutePanel } from "@/components/map/RoutePanel";
import { LocationPermissionDialog } from "@/components/map/LocationPermissionDialog";
import { PoweredBy, Wordmark } from "@/components/brand";
import { api } from "@/lib/api";
import { openDirections, recordDirectionClick, recordPinClick } from "@/lib/directions";
import { fetchRoute, haversineMeters, type RouteResult } from "@/lib/routing";
import type { Category, EventListSummary, EventPinSummary, PublicEventDetail } from "@/lib/types";

const SEARCH_DEBOUNCE_MS = 300;

// Loaded only in the browser, Leaflet touches `window` at module-evaluation
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
  const search = useSearch({ from: "/" });
  const navigate = useNavigate({ from: "/" });
  const queryClient = useQueryClient();
  const handledShareLinkRef = useRef(false);
  const [deepLinkedEvent, setDeepLinkedEvent] = useState<EventPinSummary | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
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
  const lastRouteOriginRef = useRef<[number, number] | null>(null);
  const lastRouteFetchAtRef = useRef(0);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationRetrying, setLocationRetrying] = useState(false);
  const [locationRetryFailed, setLocationRetryFailed] = useState(false);
  const locationDismissedRef = useRef(false);
  const [showToggleHint, setShowToggleHint] = useState(false);
  const hasToggledViewRef = useRef(false);
  const [checkingElsewhere, setCheckingElsewhere] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Tracks the user's position continuously, feeds the live "you are here"
  // marker and keeps directions routing from a fresh origin. Only the first
  // fix ever recenters the map; later updates just move the dot, so the map
  // doesn't fight the user's own panning/zooming.
  //
  // Some mobile browsers (iOS Safari especially) don't reliably surface the
  // native permission prompt for a watchPosition call fired on page load ,
  // it just goes nowhere, with no error and no fix. So: if we don't have a
  // fix within a few seconds, or the watch reports an error, show our own
  // dialog, its "Allow location" button re-requests from a click handler,
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

  // Recurring pointer at the map/list toggle button, same "show, hold, hide,
  // repeat" shape as MapControls' account hint, but on a 10s phase offset
  // (account hint: 0-5s, 20-25s, ...; this one: 10-15s, 30-35s, ...) so the
  // two never show at once and crowd the screen. Stops for good once the
  // user has actually used the toggle, no point still teaching it then.
  const TOGGLE_HINT_INTERVAL_MS = 20_000;
  const TOGGLE_HINT_VISIBLE_MS = 5_000;
  const TOGGLE_HINT_PHASE_OFFSET_MS = 10_000;
  useEffect(() => {
    let hideTimer: number;
    let interval: number;
    const show = () => {
      if (hasToggledViewRef.current) return;
      setShowToggleHint(true);
      hideTimer = window.setTimeout(() => setShowToggleHint(false), TOGGLE_HINT_VISIBLE_MS);
    };
    const startTimer = window.setTimeout(() => {
      show();
      interval = window.setInterval(show, TOGGLE_HINT_INTERVAL_MS);
    }, TOGGLE_HINT_PHASE_OFFSET_MS);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(hideTimer);
      window.clearInterval(interval);
    };
  }, []);

  // A shared link (see ShareButton/lib/share.ts) lands here as ?event=<id> ,
  // jump straight to that event's expanded card, the same place "See more"
  // takes you, and count it as a link open. The fetched detail already has
  // everything an EventPinSummary needs, so it's also used as a fallback
  // source for `activeEvent` below in case this event isn't in the current
  // bounds-scoped list yet (recentering the map to it fixes that shortly
  // after, but the card shouldn't have to wait on that round trip).
  useEffect(() => {
    const sharedId = search.event;
    if (!sharedId || handledShareLinkRef.current) return;
    handledShareLinkRef.current = true;

    void (async () => {
      try {
        const detail = await api.get<PublicEventDetail>(`/events/${sharedId}`);
        setDeepLinkedEvent(detail);
        setCenter([detail.lat, detail.lng]);
        hasRecenteredRef.current = true;
        setActiveId(detail.id);
        setExpanded(true);
        queryClient.setQueryData(["public-event-detail", detail.id], detail);
        // No recordLinkClick here: fresh shares land on the event's SEO page
        // first (events.$city.$slug.tsx), which is where the "opened" click
        // is now counted, this deep link is either that page's own "View on
        // map" click-through (would double-count the same visit) or a
        // pre-existing bookmarked/shared link from before that page existed.
      } catch {
        /* Bad or removed event id in the link, fall back to the default map silently. */
      } finally {
        void navigate({
          search: (prev) => {
            const { event: _sharedEvent, ...rest } = prev;
            return rest;
          },
          replace: true,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Same bounds/category/query filters as the map's pin query, but with the
  // description/venueName/address list cards need, the map's pin query
  // deliberately omits those (see EventPinSummary), so list view keeps the
  // map mounted (for bounds tracking) and just fetches its own shape,
  // only while it's actually the active view.
  const { data: listEvents = [] } = useQuery({
    queryKey: ["public-events-list", bounds?.join(",") ?? "unset", categoriesKey, debouncedQuery],
    queryFn: () => {
      const params = new URLSearchParams({ bounds: bounds!.join(","), view: "list" });
      if (selectedCategories.length > 0) params.set("categories", categoriesKey);
      if (debouncedQuery) params.set("q", debouncedQuery);
      return api.get<EventListSummary[]>(`/events/?${params.toString()}`);
    },
    enabled: bounds !== null && viewMode === "list",
    placeholderData: (previous) => previous,
  });

  const activeEvent =
    events.find((e) => e.id === activeId) ??
    (deepLinkedEvent?.id === activeId ? deepLinkedEvent : null);

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

  // List view's image/See more open straight to the expanded card, the same
  // place tapping a map pin's own "See more" leads, the list card already
  // shows what the map's collapsed preview shows, so there's no in-between
  // collapsed state to land on here.
  const handleSeeMoreFromList = (event: EventListSummary) => {
    setActiveId(event.id);
    setExpanded(true);
  };

  // "There are no events here" fallback: jump the map to whichever
  // Published event is closest, regardless of the current viewport bounds.
  // Recentering feeds back through EventMap's Recenter -> moveend -> bounds
  // update -> both event queries refetch scoped to the new area, so map and
  // list view both end up showing the nearest event once this resolves.
  const handleCheckElsewhere = async () => {
    // Falls back to the current viewport's center when we have no location
    // fix at all (permission denied), still a reasonable "from here".
    const reference: [number, number] | undefined =
      liveLocation ??
      center ??
      (bounds ? [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2] : undefined);
    if (!reference) return;
    setCheckingElsewhere(true);
    try {
      const nearest = await api.get<EventPinSummary>(
        `/events/nearest?lat=${reference[0]}&lng=${reference[1]}`,
      );
      setCenter([nearest.lat, nearest.lng]);
    } catch {
      toast.error("No events found on the platform yet.");
    } finally {
      setCheckingElsewhere(false);
    }
  };

  const clearRoute = () => {
    setRoute(null);
    setRouteTarget(null);
    setRouteError(null);
    setRouteLoading(false);
    lastRouteOriginRef.current = null;
    lastRouteFetchAtRef.current = 0;
  };

  const handleDirections = async (target: EventPinSummary) => {
    void recordDirectionClick(target.id);
    // Directions only ever make sense over the map, so a list-view card's
    // Get Directions button lands here too, switch back automatically.
    setViewMode("map");
    // Dismiss the preview card immediately, the route panel takes over.
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
      const result = await fetchRoute(origin, [target.lat, target.lng]);
      setRoute(result);
      lastRouteOriginRef.current = origin;
      lastRouteFetchAtRef.current = Date.now();
    } catch {
      setRoute(null);
      setRouteError("Couldn't calculate a route right now.");
    } finally {
      setRouteLoading(false);
    }
  };

  // Keeps the active route's distance/time live as the user moves, instead
  // of freezing at whatever was true the moment "Get Directions" was tapped.
  // Throttled on both distance-moved and elapsed time so a normal walking/
  // driving pace re-routes every ~10-20s rather than hammering the public
  // OSRM instance (routing.ts) on every watchPosition tick.
  const MIN_REROUTE_MOVE_M = 30;
  const MIN_REROUTE_INTERVAL_MS = 12_000;
  useEffect(() => {
    if (!routeTarget || !liveLocation) return;
    const lastOrigin = lastRouteOriginRef.current;
    const movedEnough =
      !lastOrigin || haversineMeters(lastOrigin, liveLocation) > MIN_REROUTE_MOVE_M;
    const dueForRefresh = Date.now() - lastRouteFetchAtRef.current > MIN_REROUTE_INTERVAL_MS;
    if (!movedEnough || !dueForRefresh) return;

    lastRouteOriginRef.current = liveLocation;
    lastRouteFetchAtRef.current = Date.now();
    void (async () => {
      try {
        const updated = await fetchRoute(liveLocation, [routeTarget.lat, routeTarget.lng]);
        setRoute(updated);
      } catch {
        // Transient refresh failure, keep showing the last good route
        // rather than surfacing an error over a route that still works.
      }
    })();
  }, [liveLocation, routeTarget]);

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

      {/* List view sits as an opaque overlay above the (still-mounted) map,
          rather than unmounting it, Leaflet keeps tracking bounds so the
          pin query stays warm and toggling back to map view is instant. */}
      {viewMode === "list" && (
        <div className="absolute inset-0 z-[1] overflow-y-auto bg-background pb-20 pt-28">
          <div className="px-3">
            <EventListView
              events={listEvents}
              onDirections={(event) => void handleDirections(event)}
              onSeeMore={handleSeeMoreFromList}
            />
          </div>
        </div>
      )}

      <MapControls
        query={query}
        onQuery={setQuery}
        selected={selectedCategories}
        onToggle={toggleCategory}
        onClear={() => setSelectedCategories([])}
      />

      <div className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            hasToggledViewRef.current = true;
            setShowToggleHint(false);
            setViewMode((mode) => (mode === "map" ? "list" : "map"));
          }}
          aria-label={viewMode === "map" ? "Switch to list view" : "Switch to map view"}
          className="surface-frost pointer-events-auto flex items-center justify-center rounded-full p-3 shadow-sm"
        >
          {viewMode === "map" ? (
            <ListIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <MapIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {showToggleHint && (
          <div
            role="status"
            className="pointer-events-none rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/40 duration-150 animate-in fade-in slide-in-from-left-2"
          >
            {viewMode === "map" ? "Switch to list" : "Switch to map"}
          </div>
        )}
      </div>

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

      {bounds && (viewMode === "list" ? listEvents.length === 0 : events.length === 0) && (
        <button
          type="button"
          onClick={
            selectedCategories.length > 0
              ? () => setSelectedCategories([])
              : () => void handleCheckElsewhere()
          }
          disabled={selectedCategories.length === 0 && checkingElsewhere}
          className="surface-frost pointer-events-auto absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl px-4 py-3 text-center text-sm shadow-sm disabled:opacity-60"
        >
          {selectedCategories.length > 0 ? (
            <>
              <span className="text-muted-foreground">
                No {selectedCategories.join("/")} events here right now, but there are other events
                in this area you can try.
              </span>
              <span className="mt-1 block font-medium text-primary">Clear filter</span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">There are no events here.</span>
              <span className="mt-1 block font-medium text-primary">
                {checkingElsewhere ? "Looking…" : "Would you like to check elsewhere?"}
              </span>
            </>
          )}
        </button>
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
