CATEGORIES = ("Culture", "Sports", "Music", "Business", "Nightlife", "Community")
EVENT_STATUSES = ("Published", "Unpublished", "Removed")

REQUIRED_FIELDS = (
    "title",
    "flyerImageUrl",
    "description",
    "category",
    "date",
    "startTime",
    "endTime",
    "venueName",
    "address",
    "lat",
    "lng",
)


def to_dict(doc_id: str, data: dict) -> dict:
    """Full shape for planner/admin internal use, includes counters/history."""
    return {
        "id": doc_id,
        "title": data.get("title"),
        "flyerImageUrl": data.get("flyerImageUrl"),
        "images": data.get("images") or [],
        "description": data.get("description"),
        "category": data.get("category"),
        "date": data.get("date"),
        "startTime": data.get("startTime"),
        "endTime": data.get("endTime"),
        "venueName": data.get("venueName"),
        "address": data.get("address"),
        "lat": data.get("lat"),
        "lng": data.get("lng"),
        "onlineMeetingUrl": data.get("onlineMeetingUrl") or "",
        "attendanceFormUrl": data.get("attendanceFormUrl") or "",
        "isOnline": bool(data.get("isOnline", False)),
        "organizerId": data.get("organizerId"),
        "pinClicks": data.get("pinClicks", 0),
        "directionClicks": data.get("directionClicks", 0),
        "shareCount": data.get("shareCount", 0),
        "linkClicks": data.get("linkClicks", 0),
        "status": data.get("status", "Published"),
        "createdAt": data.get("createdAt"),
        "updatedAt": data.get("updatedAt"),
        "history": data.get("history", []),
    }


def to_summary_dict(doc_id: str, data: dict) -> dict:
    """Lean shape for the public map's pin list. Deliberately excludes
    description/venueName/address (fetched separately on expand) and
    pinClicks/directionClicks/status/history/timestamps, public clients
    never need those, and not sending them is a stronger guarantee than
    just hiding them in the UI."""
    return {
        "id": doc_id,
        "title": data.get("title"),
        "flyerImageUrl": data.get("flyerImageUrl"),
        "category": data.get("category"),
        "date": data.get("date"),
        "startTime": data.get("startTime"),
        "endTime": data.get("endTime"),
        "lat": data.get("lat"),
        "lng": data.get("lng"),
        "organizerId": data.get("organizerId"),
    }


def to_list_dict(doc_id: str, data: dict) -> dict:
    """Shape for the public list view (spec §11 sibling): summary fields plus
    description/venueName/address so each row can render without a per-event
    detail round trip, but still without images/rating/counters, those stay
    behind the single-event detail fetch on "See more"."""
    return {
        **to_summary_dict(doc_id, data),
        "description": data.get("description"),
        "venueName": data.get("venueName"),
        "address": data.get("address"),
        "onlineMeetingUrl": data.get("onlineMeetingUrl") or "",
        "attendanceFormUrl": data.get("attendanceFormUrl") or "",
        "isOnline": bool(data.get("isOnline", False)),
    }


def to_detail_dict(doc_id: str, data: dict) -> dict:
    """Full public detail, summary fields plus description/venue/address."""
    return {
        **to_summary_dict(doc_id, data),
        "description": data.get("description"),
        "venueName": data.get("venueName"),
        "address": data.get("address"),
        "onlineMeetingUrl": data.get("onlineMeetingUrl") or "",
        "attendanceFormUrl": data.get("attendanceFormUrl") or "",
        "isOnline": bool(data.get("isOnline", False)),
        "images": data.get("images") or [],
        "rating": data.get("rating"),
    }
