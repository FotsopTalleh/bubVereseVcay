import { recordDirectionClick } from "./store";
import type { EventRecord } from "./types";

/** Hands off to Google Maps for routing (deep link on mobile, web fallback). */
export function openDirections(event: EventRecord) {
  recordDirectionClick(event.id);
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
