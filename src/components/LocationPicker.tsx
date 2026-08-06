import { useEffect } from "react";
import type L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "@/lib/leaflet-icon-fix";
import { DEFAULT_CENTER, TILE_URL, TILE_ATTRIBUTION } from "@/components/map/mapConfig";

type Props = {
  lat: number | null;
  lng: number | null;
  /** Pans the already-mounted map (e.g. after picking a town) without moving the pin. */
  focusCenter?: [number, number] | undefined;
  onChange: (lat: number, lng: number) => void;
};

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onChange(e.latlng.lat, e.latlng.lng),
  });
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

/** Planner-side pin drop: pick a town to jump the map there, then click or drag the marker to set the exact venue point. */
export function LocationPicker({ lat, lng, focusCenter, onChange }: Props) {
  const center: [number, number] =
    lat != null && lng != null ? [lat, lng] : (focusCenter ?? DEFAULT_CENTER);

  return (
    <div className="overflow-hidden rounded-xl border">
      <MapContainer center={center} zoom={13} className="z-0 h-72 w-full">
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <ClickHandler onChange={onChange} />
        {focusCenter && <Recenter center={focusCenter} />}
        {lat != null && lng != null && (
          <Marker
            position={[lat, lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const pos = (e.target as L.Marker).getLatLng();
                onChange(pos.lat, pos.lng);
              },
            }}
          />
        )}
      </MapContainer>
      <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span>Tap the map to set the exact venue point, or drag the pin.</span>
        <span className="font-mono">
          {lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "No point set"}
        </span>
      </div>
    </div>
  );
}

// Default export so it can be `React.lazy`-loaded — must never be pulled into
// the SSR bundle (Leaflet touches `window` at module-evaluation time).
export default LocationPicker;
