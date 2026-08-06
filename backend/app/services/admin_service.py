from datetime import datetime, timezone

from app.middleware.errors import ApiError
from app.models.admin import to_public_view
from app.models.organizer import ORGANIZER_STATUSES
from app.utils.firestore_client import get_db
from app.utils.jwt_utils import issue_token
from app.utils.passwords import verify_password

COLLECTION = "admins"


def login_admin(email: str, password: str) -> dict:
    db = get_db()
    email = (email or "").strip().lower()
    doc = next(iter(db.collection(COLLECTION).where("email", "==", email).limit(1).stream()), None)
    if doc is None:
        raise ApiError("Invalid administrator credentials.", 401)
    data = doc.to_dict()
    if not verify_password(password or "", data.get("passwordHash", "")):
        raise ApiError("Invalid administrator credentials.", 401)

    token = issue_token({"sub": doc.id, "role": "admin"})
    return {"admin": to_public_view(doc.id, data), "token": token}


def log_moderation(event_id: str, event_title: str, action: str, reason: str) -> None:
    get_db().collection("moderation_logs").document().set(
        {
            "eventId": event_id,
            "eventTitle": event_title,
            "action": action,
            "reason": reason,
            "at": datetime.now(timezone.utc).isoformat(),
        }
    )


def moderate_event(event_id: str, status: str, reason: str) -> dict:
    from app.services.event_service import get_event, set_status

    if not reason or not reason.strip():
        raise ApiError("A moderation reason is required.")
    current = get_event(event_id)
    updated = set_status(event_id, status)
    log_moderation(event_id, current["title"], f"Status set to {status}", reason.strip())
    return updated


def list_moderation_logs() -> list:
    docs = get_db().collection("moderation_logs").order_by("at", direction="DESCENDING").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


def analytics() -> dict:
    from app.services.event_service import list_all_events
    from app.services.organizer_service import list_all as list_organizers

    organizers = list_organizers()
    events = list_all_events()

    totals = {"pin": 0, "dir": 0}
    by_date: dict = {}
    for event in events:
        totals["pin"] += event.get("pinClicks", 0)
        totals["dir"] += event.get("directionClicks", 0)
        for h in event.get("history", []):
            row = by_date.setdefault(h["date"], {"date": h["date"], "pinClicks": 0, "directionClicks": 0})
            row["pinClicks"] += h.get("pinClicks", 0)
            row["directionClicks"] += h.get("directionClicks", 0)
    trend = sorted(by_date.values(), key=lambda r: r["date"])

    per_organizer = []
    for org in organizers:
        owned = [e for e in events if e["organizerId"] == org["id"]]
        per_organizer.append(
            {
                "id": org["id"],
                "name": org["name"],
                "status": org["status"],
                "events": len(owned),
                "published": len([e for e in owned if e["status"] == "Published"]),
                "pin": sum(e.get("pinClicks", 0) for e in owned),
                "dir": sum(e.get("directionClicks", 0) for e in owned),
            }
        )
    per_organizer.sort(key=lambda r: r["pin"], reverse=True)

    return {
        "organizerCount": len(organizers),
        "organizersByStatus": {
            status: len([o for o in organizers if o["status"] == status]) for status in ORGANIZER_STATUSES
        },
        "publishedEvents": len([e for e in events if e["status"] == "Published"]),
        "totalEvents": len(events),
        "totals": {"pinClicks": totals["pin"], "directionClicks": totals["dir"]},
        "trend": trend,
        "perOrganizer": per_organizer,
    }
