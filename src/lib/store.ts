import { useSyncExternalStore } from "react";
import { ADMIN_CREDENTIALS, seedEvents, seedOrganizers } from "./seed";
import type {
  EventRecord,
  ModerationLog,
  Organizer,
  OrganizerStatus,
  Session,
} from "./types";

/**
 * Frontend-only prototype store. All data lives in memory and is mirrored to
 * localStorage so a refresh keeps the current state. No backend is wired up yet.
 */
type State = {
  organizers: Organizer[];
  events: EventRecord[];
  logs: ModerationLog[];
  session: Session;
};

const STORAGE_KEY = "bubversevacy.prototype.v1";

const initialState = (): State => ({
  organizers: seedOrganizers,
  events: seedEvents,
  logs: [],
  session: null,
});

let state: State = initialState();
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — prototype keeps working in memory */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function setState(update: (prev: State) => State) {
  state = update(state);
  persist();
  emit();
}

export function hydrateStore() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed?.events?.length) {
        state = { ...initialState(), ...parsed };
        emit();
      }
    }
  } catch {
    /* ignore malformed state */
  }
}

export function resetStore() {
  state = initialState();
  persist();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const serverState = initialState();
const getServerSnapshot = () => serverState;

export function useStore<T>(selector: (s: State) => T): T {
  // Selector runs on the snapshot during render so derived arrays/objects are
  // allowed without breaking useSyncExternalStore's caching requirement.
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return selector(snapshot);
}

const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

/* ---------------------------------- auth --------------------------------- */

export function loginPlanner(email: string, password: string) {
  const organizer = state.organizers.find(
    (o) => o.email.toLowerCase() === email.trim().toLowerCase() && o.password === password,
  );
  if (!organizer) return { ok: false as const, error: "Invalid email or password." };
  setState((s) => ({ ...s, session: { role: "planner", organizerId: organizer.id } }));
  return { ok: true as const, organizer };
}

export function loginAdmin(email: string, password: string) {
  if (
    email.trim().toLowerCase() !== ADMIN_CREDENTIALS.email ||
    password !== ADMIN_CREDENTIALS.password
  ) {
    return { ok: false as const, error: "Invalid administrator credentials." };
  }
  setState((s) => ({ ...s, session: { role: "admin" } }));
  return { ok: true as const };
}

export function registerPlanner(input: Omit<Organizer, "id" | "status" | "createdAt">) {
  if (state.organizers.some((o) => o.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false as const, error: "An account with that email already exists." };
  }
  const organizer: Organizer = {
    ...input,
    id: uid("org"),
    status: "Pending Verification",
    createdAt: today(),
  };
  setState((s) => ({
    ...s,
    organizers: [...s.organizers, organizer],
    session: { role: "planner", organizerId: organizer.id },
  }));
  return { ok: true as const, organizer };
}

export function logout() {
  setState((s) => ({ ...s, session: null }));
}

/* -------------------------------- organizers ------------------------------ */

export function updateOrganizer(id: string, patch: Partial<Organizer>) {
  setState((s) => ({
    ...s,
    organizers: s.organizers.map((o) => (o.id === id ? { ...o, ...patch } : o)),
  }));
}

export function setOrganizerStatus(id: string, status: OrganizerStatus) {
  updateOrganizer(id, { status });
}

export function deleteOrganizer(id: string) {
  setState((s) => ({
    ...s,
    organizers: s.organizers.filter((o) => o.id !== id),
    events: s.events.filter((e) => e.organizerId !== id),
    session:
      s.session?.role === "planner" && s.session.organizerId === id ? null : s.session,
  }));
}

/* ---------------------------------- events -------------------------------- */

export type EventDraft = Omit<
  EventRecord,
  "id" | "pinClicks" | "directionClicks" | "createdAt" | "updatedAt" | "history"
>;

export function createEvent(draft: EventDraft) {
  const event: EventRecord = {
    ...draft,
    id: uid("evt"),
    pinClicks: 0,
    directionClicks: 0,
    createdAt: today(),
    updatedAt: today(),
    history: [],
  };
  setState((s) => ({ ...s, events: [event, ...s.events] }));
  return event;
}

export function updateEvent(id: string, patch: Partial<EventRecord>) {
  setState((s) => ({
    ...s,
    events: s.events.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: today() } : e)),
  }));
}

export function deleteEvent(id: string) {
  setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
}

export function moderateEvent(
  id: string,
  status: EventRecord["status"],
  reason: string,
) {
  const event = state.events.find((e) => e.id === id);
  setState((s) => ({
    ...s,
    events: s.events.map((e) => (e.id === id ? { ...e, status, updatedAt: today() } : e)),
    logs: [
      {
        id: uid("log"),
        eventId: id,
        eventTitle: event?.title ?? id,
        action: `Status set to ${status}`,
        reason,
        at: nowIso(),
      },
      ...s.logs,
    ],
  }));
}

/* --------------------------- interest metrics ----------------------------- */

const DEBOUNCE_MS = 4000;
const lastTap: Record<string, number> = {};

function bumpHistory(event: EventRecord, field: "pinClicks" | "directionClicks") {
  const d = today();
  const existing = event.history.find((h) => h.date === d);
  const history = existing
    ? event.history.map((h) => (h.date === d ? { ...h, [field]: h[field] + 1 } : h))
    : [...event.history, { date: d, pinClicks: 0, directionClicks: 0, [field]: 1 }];
  return history;
}

function increment(id: string, field: "pinClicks" | "directionClicks") {
  const key = `${field}:${id}`;
  const now = Date.now();
  if (lastTap[key] && now - lastTap[key] < DEBOUNCE_MS) return;
  lastTap[key] = now;
  setState((s) => ({
    ...s,
    events: s.events.map((e) =>
      e.id === id ? { ...e, [field]: e[field] + 1, history: bumpHistory(e, field) } : e,
    ),
  }));
}

export const recordPinClick = (id: string) => increment(id, "pinClicks");
export const recordDirectionClick = (id: string) => increment(id, "directionClicks");

/* --------------------------------- helpers -------------------------------- */

export function getState() {
  return state;
}
