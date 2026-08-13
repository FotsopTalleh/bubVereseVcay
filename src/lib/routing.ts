export type RouteResult = {
  /** [lat, lng] points along the route, ready for a Leaflet Polyline. */
  points: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
};

// Free, no-API-key public OSRM instance, fine for local/demo routing, not
// meant for production traffic (no SLA, rate-limited).
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export async function fetchRoute(
  origin: [number, number],
  destination: [number, number],
): Promise<RouteResult> {
  const url = `${OSRM_BASE}/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing service responded ${res.status}`);
  const body = await res.json();
  const route = body.routes?.[0];
  if (!route) throw new Error("No route found.");
  return {
    points: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

/** Great-circle distance in meters, used to decide when the live tracker has
 * moved far enough to be worth re-routing, not for anything precision-critical. */
export function haversineMeters(a: [number, number], b: [number, number]): number {
  const EARTH_RADIUS_M = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h ${rest} min`;
}
