import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { DEFAULT_CENTER, TILE_URL, TILE_ATTRIBUTION } from "@/components/map/mapConfig";

type Props = {
  lat: number | null;
  lng: number | null;
  /** Pans the already-mounted map (e.g. after picking a town) without moving the pin. */
  focusCenter?: [number, number] | undefined;
  onChange: (lat: number, lng: number) => void;
};

// Custom divIcon instead of Leaflet's default marker image, consistent with
// every other pin in the app, draggable-looking, and sidesteps any bundler
// asset-path fragility around Leaflet's default PNG icons.
const DROP_PIN_ICON = L.divIcon({
  html: `<svg width="32" height="42" viewBox="0 0 32 42" class="bv-drop-pin" fill="none">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z" fill="var(--color-primary)"/>
    <circle cx="16" cy="16" r="6" fill="white"/>
  </svg>`,
  className: "bv-drop-pin-wrap",
  iconSize: [32, 42],
  iconAnchor: [16, 40],
});

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
            icon={DROP_PIN_ICON}
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

// Default export so it can be `React.lazy`-loaded, must never be pulled into
// the SSR bundle (Leaflet touches `window` at module-evaluation time).
export default LocationPicker;
