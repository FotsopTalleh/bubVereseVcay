import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "@/lib/leaflet-icon-fix";
import { CATEGORY_ACCENT } from "@/lib/types";
import type { EventPinSummary } from "@/lib/types";
import { DEFAULT_CENTER, DEFAULT_ZOOM, TILE_URL, TILE_ATTRIBUTION } from "./mapConfig";

/** [south, west, north, east] — matches the backend's `bounds` query param order. */
export type Bbox = [south: number, west: number, north: number, east: number];

type Props<T extends EventPinSummary> = {
  events: T[];
  activeId: string | null;
  onSelect: (event: T) => void;
  center?: [number, number] | undefined;
  onBoundsChange?: (bbox: Bbox) => void;
  route?: [number, number][] | null;
  userLocation?: [number, number] | undefined;
};

function buildPinIcon(event: EventPinSummary, active: boolean) {
  const accent = CATEGORY_ACCENT[event.category];
  return L.divIcon({
    html: `<div class="bv-pin" data-active="${active}" style="--pin-accent:${accent}"><img src="${event.flyerImageUrl}" alt="" loading="lazy" /></div>`,
    className: "bv-pin-wrap",
    iconSize: [46, 60],
    iconAnchor: [23, 30],
  });
}

function buildUserLocationIcon() {
  return L.divIcon({
    html: `<div class="bv-user-dot"><span class="bv-user-dot-pulse"></span></div>`,
    className: "bv-user-dot-wrap",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function buildClusterIcon(cluster: { getChildCount: () => number }) {
  return L.divIcon({
    html: `<div class="bv-cluster">${cluster.getChildCount()}</div>`,
    className: "bv-cluster-wrap",
    iconSize: L.point(38, 38, true),
  });
}

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: ((bbox: Bbox) => void) | undefined }) {
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  const map = useMapEvents({
    moveend: () => emit(),
    zoomend: () => emit(),
  });

  function emit() {
    const b = map.getBounds();
    onBoundsChangeRef.current?.([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
  }

  useEffect(() => {
    emit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);
  return null;
}

function FitRoute({ route }: { route: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (route.length < 2) return;
    map.fitBounds(L.latLngBounds(route.map(([lat, lng]) => L.latLng(lat, lng))), {
      padding: [48, 48],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);
  return null;
}

/** Full-screen public map: flyer-image pins, clustered, viewport-bounds reporting. */
export function EventMap<T extends EventPinSummary>({
  events,
  activeId,
  onSelect,
  center,
  onBoundsChange,
  route,
  userLocation,
}: Props<T>) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      className="absolute inset-0 z-0"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ZoomControl position="bottomright" />
      <BoundsWatcher onBoundsChange={onBoundsChange} />
      {center && <Recenter center={center} />}
      {userLocation && (
        <Marker
          position={userLocation}
          icon={buildUserLocationIcon()}
          interactive={false}
          zIndexOffset={1000}
        />
      )}
      {route && route.length > 1 && (
        <>
          <Polyline
            positions={route}
            pathOptions={{ color: "var(--color-primary)", weight: 5, opacity: 0.85 }}
          />
          <FitRoute route={route} />
        </>
      )}
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={60}
        iconCreateFunction={buildClusterIcon}
      >
        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.lat, event.lng]}
            icon={buildPinIcon(event, event.id === activeId)}
            eventHandlers={{ click: () => onSelect(event) }}
          />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}

// Default export so it can be `React.lazy`-loaded — this module (and its
// leaflet/react-leaflet imports) must never be pulled into the SSR bundle,
// since Leaflet touches `window` at module-evaluation time. See PublicEventMap.tsx.
export default EventMap;
