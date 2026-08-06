import time
from datetime import datetime, timezone

from app.middleware.errors import ApiError
from app.models.event import to_dict
from app.utils.firestore_client import get_db

DEBOUNCE_SECONDS = 4
COLLECTION = "events"

# In-process debounce store. Fine for a single-instance V1 deployment; move to
# Firestore/Redis if the API ever runs as more than one worker process.
_last_tap: dict[str, float] = {}


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _is_debounced(key: str) -> bool:
    now = time.monotonic()
    last = _last_tap.get(key)
    if last is not None and now - last < DEBOUNCE_SECONDS:
        return True
    _last_tap[key] = now
    return False


def _bump_history(history: list, field: str) -> list:
    today = _today()
    updated = []
    found = False
    for entry in history:
        if entry.get("date") == today:
            entry = {**entry, field: entry.get(field, 0) + 1}
            found = True
        updated.append(entry)
    if not found:
        base = {"date": today, "pinClicks": 0, "directionClicks": 0}
        base[field] = 1
        updated.append(base)
    return updated


def record_interaction(event_id: str, field: str, visitor_id: str) -> dict:
    if field not in ("pinClicks", "directionClicks"):
        raise ApiError("Invalid interaction field.")

    doc_ref = get_db().collection(COLLECTION).document(event_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise ApiError("Event not found.", 404)

    key = f"{field}:{event_id}:{visitor_id}"
    if _is_debounced(key):
        return to_dict(doc.id, doc.to_dict())

    data = doc.to_dict()
    history = _bump_history(data.get("history", []), field)
    doc_ref.update({field: data.get(field, 0) + 1, "history": history})
    updated = doc_ref.get()
    return to_dict(updated.id, updated.to_dict())
