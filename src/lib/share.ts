import { recordShare } from "./directions";

export type ShareableEvent = { id: string; title: string };

/** A shared link opens the app already pointed at this event's expanded
 * card — see the `?event=` search param handled in PublicEventMap. */
export function buildShareUrl(eventId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/?event=${encodeURIComponent(eventId)}`;
}

export function shareText(event: ShareableEvent): string {
  return `Check out "${event.title}" on BubVerseVacy`;
}

/** True when the Web Share API is available — mobile browsers mostly, plus
 * a growing number of desktop ones. It hands the OS its own native share
 * sheet (every installed social app, messaging app, "copy link", etc.) for
 * free, so it's always preferred over the hand-rolled fallback menu. */
export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** Attempts the native share sheet. Returns false (without throwing) for
 * anything that isn't a genuine failure worth falling back for — the user
 * cancelling the sheet is not an error. */
export async function tryNativeShare(event: ShareableEvent): Promise<boolean> {
  if (!canUseNativeShare()) return false;
  try {
    await navigator.share({
      title: event.title,
      text: shareText(event),
      url: buildShareUrl(event.id),
    });
    void recordShare(event.id);
    return true;
  } catch (err) {
    // AbortError = user dismissed the sheet — not a failure, don't fall back.
    if (err instanceof Error && err.name === "AbortError") return true;
    return false;
  }
}

export async function copyShareLink(eventId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildShareUrl(eventId));
    void recordShare(eventId);
    return true;
  } catch {
    return false;
  }
}

const SOCIAL_LINKS = [
  {
    name: "WhatsApp",
    urlFor: (event: ShareableEvent) =>
      `https://wa.me/?text=${encodeURIComponent(`${shareText(event)} ${buildShareUrl(event.id)}`)}`,
  },
  {
    name: "Facebook",
    urlFor: (event: ShareableEvent) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(buildShareUrl(event.id))}`,
  },
  {
    name: "X (Twitter)",
    urlFor: (event: ShareableEvent) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText(event))}&url=${encodeURIComponent(buildShareUrl(event.id))}`,
  },
] as const;

export function socialShareLinks(event: ShareableEvent) {
  return SOCIAL_LINKS.map((s) => ({ name: s.name, url: s.urlFor(event) }));
}
