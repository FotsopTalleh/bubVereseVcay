import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, type MapMouseEvent } from "maplibre-gl";
import { DEFAULT_CENTER, MAP_STYLE } from "./map/EventMap";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
};

/** Planner-side pin drop: click or drag the marker to set the exact venue point. */
export function LocationPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: lat != null && lng != null ? [lng, lat] : DEFAULT_CENTER,
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    map.on("load", () => setReady(true));
    map.on("click", (e: MapMouseEvent) => onChangeRef.current(e.lngLat.lat, e.lngLat.lng));
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || lat == null || lng == null) return;
    if (!markerRef.current) {
      markerRef.current = new Marker({ draggable: true, color: "#1D5CF5" })
        .setLngLat([lng, lat])
        .addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLngLat();
        onChangeRef.current(pos.lat, pos.lng);
      });
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [lat, lng, ready]);

  return (
    <div className="overflow-hidden rounded-xl border">
      <div ref={containerRef} className="h-72 w-full" />
      <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span>Tap the map or drag the pin to set the exact venue point.</span>
        <span className="font-mono">
          {lat != null && lng != null
            ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            : "No point set"}
        </span>
      </div>
    </div>
  );
}
