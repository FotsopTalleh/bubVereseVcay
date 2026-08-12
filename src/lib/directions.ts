import { api, ApiError } from "./api";

const CLIENT_DEBOUNCE_MS = 4000;
const lastTap = new Map<string, number>();

/** Client-side debounce against rapid double-taps, layered on top of the
 * server's own debounce + rate limit — this just avoids firing redundant
 * requests, it isn't the source of truth for "counted once". */
function isDebounced(key: string): boolean {
  const now = Date.now();
  const last = lastTap.get(key);
  if (last !== undefined && now - last < CLIENT_DEBOUNCE_MS) return true;
  lastTap.set(key, now);
  return false;
}

async function recordInteraction(
  eventId: string,
  path: "pin-click" | "direction-click" | "share" | "link-click",
) {
  if (isDebounced(`${path}:${eventId}`)) return;
  try {
    await api.post(`/events/${eventId}/${path}`);
  } catch (err) {
    // Best-effort signal — never block the user's flow on this failing.
    if (!(err instanceof ApiError)) console.error(err);
  }
}

export const recordPinClick = (eventId: string) => recordInteraction(eventId, "pin-click");
export const recordDirectionClick = (eventId: string) =>
  recordInteraction(eventId, "direction-click");
/** Fired once per tap of the share button — reach, not opens. */
export const recordShare = (eventId: string) => recordInteraction(eventId, "share");
/** Fired once when a shared link is opened — conversion, not reach. */
export const recordLinkClick = (eventId: string) => recordInteraction(eventId, "link-click");

type DirectionsTarget = { id: string; lat: number; lng: number };

/** Hands off to Google Maps for routing (deep link on mobile, web fallback). */
export function openDirections(event: DirectionsTarget) {
  void recordDirectionClick(event.id);
  const { lat, lng } = event;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (typeof window === "undefined") return;

  const ua = window.navigator.userAgent;
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  if (isAndroid) {
    window.location.href = `google.navigation:q=${lat},${lng}`;
    window.setTimeout(() => window.open(webUrl, "_blank", "noopener"), 900);
    return;
  }
  if (isIOS) {
    window.location.href = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    window.setTimeout(() => window.open(webUrl, "_blank", "noopener"), 900);
    return;
  }
  window.open(webUrl, "_blank", "noopener");
}

export function formatEventDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTimeRange(start: string, end: string) {
  return `${start} – ${end}`;
}
