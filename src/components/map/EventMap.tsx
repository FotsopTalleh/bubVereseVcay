import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  GeolocateControl,
  type StyleSpecification,
} from "maplibre-gl";
import Supercluster from "supercluster";
import { CATEGORY_ACCENT } from "@/lib/types";
import type { EventRecord } from "@/lib/types";

export const DEFAULT_CENTER: [number, number] = [9.2871, 4.1568]; // Buea

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

type Props = {
  events: EventRecord[];
  activeId: string | null;
  onSelect: (event: EventRecord) => void;
  center?: [number, number] | undefined;
};

type PointProps = { eventId: string };

export function EventMap({ events, activeId, onSelect, center }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const eventsRef = useRef(events);
  const activeRef = useRef(activeId);
  const selectRef = useRef(onSelect);
  const renderRef = useRef<() => void>(() => {});

  eventsRef.current = events;
  activeRef.current = activeId;
  selectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: center ?? DEFAULT_CENTER,
      zoom: 11.5,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "bottom-right",
    );
    mapRef.current = map;

    const rerender = () => renderRef.current();
    map.on("load", rerender);
    map.on("move", rerender);
    map.on("zoom", rerender);

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progressive rendering: only events inside the current viewport are drawn,
  // clustered client-side so dense areas stay readable.
  renderRef.current = () => {
    const map = mapRef.current;
    if (!map) return;

    const index = new Supercluster<PointProps>({ radius: 64, maxZoom: 17 });
    index.load(
      eventsRef.current.map((e) => ({
        type: "Feature" as const,
        properties: { eventId: e.id },
        geometry: { type: "Point" as const, coordinates: [e.lng, e.lat] },
      })),
    );

    const b = map.getBounds();
    const clusters = index.getClusters(
      [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      Math.round(map.getZoom()),
    );

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = clusters.map((feature) => {
      const [lng, lat] = feature.geometry.coordinates as [number, number];
      const el = document.createElement("div");

      if ("cluster" in feature.properties && feature.properties.cluster) {
        const clusterId = feature.properties.cluster_id as number;
        el.className = "bv-cluster";
        el.textContent = String(feature.properties.point_count);
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `${feature.properties.point_count} events, zoom in`);
        el.addEventListener("click", () => {
          const zoom = index.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: [lng, lat], zoom, duration: 400 });
        });
      } else {
        const event = eventsRef.current.find(
          (e) => e.id === (feature.properties as PointProps).eventId,
        );
        if (!event) return new Marker({ element: el });
        el.className = "bv-pin";
        el.dataset["active"] = String(activeRef.current === event.id);
        el.style.setProperty("--pin-accent", CATEGORY_ACCENT[event.category]);
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `${event.title}, ${event.category}`);
        const img = document.createElement("img");
        img.src = event.image;
        img.alt = "";
        img.loading = "lazy";
        el.appendChild(img);
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          selectRef.current(event);
        });
      }

      return new Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    });
  };

  useEffect(() => {
    renderRef.current();
  }, [events, activeId]);

  useEffect(() => {
    if (center && mapRef.current) {
      mapRef.current.easeTo({ center, zoom: 13, duration: 600 });
    }
  }, [center]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
