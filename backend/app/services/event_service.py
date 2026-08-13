from datetime import datetime, timezone
from typing import Optional

from app.middleware.errors import ApiError
from app.models.event import (
    CATEGORIES,
    EVENT_STATUSES,
    REQUIRED_FIELDS,
    to_detail_dict,
    to_dict,
    to_list_dict,
    to_summary_dict,
)
from app.services.organizer_service import get_public_summary
from app.utils.firestore_client import get_db

COLLECTION = "events"


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _validate_draft(payload: dict) -> None:
    missing = [f for f in REQUIRED_FIELDS if payload.get(f) is None or payload.get(f) == ""]
    if missing:
        raise ApiError(f"Missing required fields: {', '.join(missing)}")
    if payload["category"] not in CATEGORIES:
        raise ApiError("Invalid category.")
    try:
        float(payload["lat"])
        float(payload["lng"])
    except (TypeError, ValueError):
        raise ApiError("A valid venue location (lat/lng) is required.")


def _get_doc(event_id: str):
    doc = get_db().collection(COLLECTION).document(event_id).get()
    if not doc.exists:
        raise ApiError("Event not found.", 404)
    return doc


def create_event(organizer_id: str, payload: dict) -> dict:
    _validate_draft(payload)
    status = payload.get("status")
    if status not in EVENT_STATUSES:
        status = "Published"

    now = _today()
    data = {
        "title": payload["title"].strip(),
        "flyerImageUrl": payload["flyerImageUrl"],
        "images": [u for u in (payload.get("images") or []) if u][:5],
        "description": payload["description"].strip(),
        "category": payload["category"],
        "date": payload["date"],
        "startTime": payload["startTime"],
        "endTime": payload["endTime"],
        "venueName": payload["venueName"].strip(),
        "address": payload["address"].strip(),
        "lat": float(payload["lat"]),
        "lng": float(payload["lng"]),
        "organizerId": organizer_id,
        "pinClicks": 0,
        "directionClicks": 0,
        "shareCount": 0,
        "linkClicks": 0,
        "status": status,
        "createdAt": now,
        "updatedAt": now,
        "history": [],
    }
    doc_ref = get_db().collection(COLLECTION).document()
    doc_ref.set(data)
    return to_dict(doc_ref.id, data)


def get_event(event_id: str) -> dict:
    doc = _get_doc(event_id)
    return to_dict(doc.id, doc.to_dict())


def update_event(event_id: str, requester_organizer_id: Optional[str], patch: dict) -> dict:
    doc = _get_doc(event_id)
    data = doc.to_dict()
    if requester_organizer_id is not None and data.get("organizerId") != requester_organizer_id:
        raise ApiError("You do not own this event.", 403)

    editable = {
        "title", "flyerImageUrl", "images", "description", "category", "date", "startTime",
        "endTime", "venueName", "address", "lat", "lng", "status",
    }
    update = {k: v for k, v in patch.items() if k in editable}
    if "category" in update and update["category"] not in CATEGORIES:
        raise ApiError("Invalid category.")
    if "status" in update and update["status"] not in EVENT_STATUSES:
        raise ApiError("Invalid status.")
    if "images" in update:
        update["images"] = [u for u in (update["images"] or []) if u][:5]
    if "lat" in update:
        update["lat"] = float(update["lat"])
    if "lng" in update:
        update["lng"] = float(update["lng"])
    update["updatedAt"] = _today()

    doc.reference.update(update)
    return get_event(event_id)


def delete_event(event_id: str, requester_organizer_id: Optional[str]) -> None:
    doc = _get_doc(event_id)
    data = doc.to_dict()
    if requester_organizer_id is not None and data.get("organizerId") != requester_organizer_id:
        raise ApiError("You do not own this event.", 403)
    doc.reference.delete()


def list_planner_events(organizer_id: str) -> list:
    db = get_db()
    docs = db.collection(COLLECTION).where("organizerId", "==", organizer_id).stream()
    return [to_dict(d.id, d.to_dict()) for d in docs]


def list_all_events() -> list:
    db = get_db()
    return [to_dict(d.id, d.to_dict()) for d in db.collection(COLLECTION).stream()]


def list_public_summaries(
    bounds: Optional[tuple],
    categories: Optional[list],
    q: Optional[str],
    detailed: bool = False,
) -> list:
    """Published-only events, server-side filtered by viewport bounds,
    category list and title keyword, lean shape for the public map's pin
    list (§11), each with a limited public organizer summary attached.
    Pass detailed=True (the list view) to also include description/
    venueName/address so each row renders without a per-event fetch."""
    db = get_db()
    docs = db.collection(COLLECTION).where("status", "==", "Published").stream()
    rows = [(d.id, d.to_dict()) for d in docs]

    if bounds:
        south, west, north, east = bounds
        rows = [
            (doc_id, data)
            for doc_id, data in rows
            if south <= data.get("lat", 0) <= north and west <= data.get("lng", 0) <= east
        ]

    if categories:
        wanted = set(categories)
        rows = [(doc_id, data) for doc_id, data in rows if data.get("category") in wanted]

    if q:
        needle = q.strip().lower()
        rows = [(doc_id, data) for doc_id, data in rows if needle in (data.get("title") or "").lower()]

    shape = to_list_dict if detailed else to_summary_dict
    summaries = [shape(doc_id, data) for doc_id, data in rows]
    for summary in summaries:
        summary["organizer"] = get_public_summary(summary["organizerId"])
    return summaries


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    from math import asin, cos, radians, sin, sqrt

    earth_radius_m = 6_371_000
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    h = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    return 2 * earth_radius_m * asin(sqrt(h))


def find_nearest_public(lat: float, lng: float) -> Optional[dict]:
    """Closest Published event to (lat, lng), ignoring viewport bounds ,
    used when a bounds-scoped query comes back empty and the map wants to
    offer "check elsewhere" by jumping straight to the nearest listing."""
    db = get_db()
    docs = db.collection(COLLECTION).where("status", "==", "Published").stream()
    rows = [(d.id, d.to_dict()) for d in docs]
    if not rows:
        return None

    doc_id, data = min(
        rows, key=lambda row: _haversine_meters(lat, lng, row[1].get("lat", 0), row[1].get("lng", 0))
    )
    summary = to_summary_dict(doc_id, data)
    summary["organizer"] = get_public_summary(summary["organizerId"])
    return summary


def get_public_detail(event_id: str) -> dict:
    """Full public detail for one event, 404s unless Published, so a direct
    ID lookup can't leak an Unpublished/Removed event's data."""
    doc = _get_doc(event_id)
    data = doc.to_dict()
    if data.get("status") != "Published":
        raise ApiError("Event not found.", 404)
    detail = to_detail_dict(doc.id, data)
    detail["organizer"] = get_public_summary(detail["organizerId"])
    return detail


def set_status(event_id: str, status: str) -> dict:
    if status not in EVENT_STATUSES:
        raise ApiError("Invalid status.")
    doc = _get_doc(event_id)
    doc.reference.update({"status": status, "updatedAt": _today()})
    return get_event(event_id)
