import { useSyncExternalStore } from "react";

export type Session =
  | { role: "planner"; organizerId: string; organizerName: string; token: string }
  | { role: "admin"; token: string }
  | null;

const STORAGE_KEY = "bubversevacy.session";

let session: Session = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function hydrateSession() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) session = JSON.parse(raw) as Session;
  } catch {
    session = null;
  }
  emit();
}

export function setSession(next: Session) {
  session = next;
  persist();
  emit();
}

export function clearSession() {
  setSession(null);
}

/** Read synchronously, hydrating from localStorage first if this is the very
 * first call in the page lifecycle (e.g. api.ts building request headers
 * before any component's mount effect has run). */
export function getAuthToken(): string | null {
  hydrateSession();
  return session?.token ?? null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => session;
const getServerSnapshot = (): Session => null;

export function useSessionStore(): Session {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
