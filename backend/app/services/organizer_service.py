from datetime import datetime, timezone
from typing import Optional

from app.middleware.errors import ApiError
from app.models.organizer import ORGANIZER_STATUSES, to_admin_view, to_public_view
from app.utils.firestore_client import get_db
from app.utils.jwt_utils import issue_token
from app.utils.passwords import hash_password, verify_password

COLLECTION = "organizers"


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _find_by_email(email: str):
    db = get_db()
    query = db.collection(COLLECTION).where("email", "==", email.strip().lower()).limit(1).stream()
    for doc in query:
        return doc
    return None


def register(
    name: str,
    email: str,
    password: str,
    bio: Optional[str],
    channels: list,
    show_contacts_publicly: bool,
) -> dict:
    email = (email or "").strip().lower()
    name = (name or "").strip()
    if not name or not email or not password:
        raise ApiError("Name, email and password are required.")
    if len(password) < 6:
        raise ApiError("Password must be at least 6 characters.")
    if not channels:
        raise ApiError("At least one verification contact channel is required.")
    if _find_by_email(email) is not None:
        raise ApiError("An account with that email already exists.", 409)

    db = get_db()
    doc_ref = db.collection(COLLECTION).document()
    data = {
        "name": name,
        "email": email,
        "passwordHash": hash_password(password),
        "bio": (bio or "").strip(),
        "channels": channels,
        "showContactsPublicly": bool(show_contacts_publicly),
        "status": "Pending Verification",
        "createdAt": _today(),
    }
    doc_ref.set(data)

    token = issue_token({"sub": doc_ref.id, "role": "planner", "organizerId": doc_ref.id})
    return {"organizer": to_admin_view(doc_ref.id, data), "token": token}


def login(email: str, password: str) -> dict:
    doc = _find_by_email(email or "")
    if doc is None:
        raise ApiError("Invalid email or password.", 401)
    data = doc.to_dict()
    if not verify_password(password or "", data.get("passwordHash", "")):
        raise ApiError("Invalid email or password.", 401)

    token = issue_token({"sub": doc.id, "role": "planner", "organizerId": doc.id})
    return {"organizer": to_admin_view(doc.id, data), "token": token}


def get_organizer(organizer_id: str) -> dict:
    doc = get_db().collection(COLLECTION).document(organizer_id).get()
    if not doc.exists:
        raise ApiError("Organizer not found.", 404)
    return to_admin_view(doc.id, doc.to_dict())


def get_public_summary(organizer_id: str) -> Optional[dict]:
    doc = get_db().collection(COLLECTION).document(organizer_id).get()
    if not doc.exists:
        return None
    return to_public_view(doc.id, doc.to_dict())


def update_profile(organizer_id: str, patch: dict) -> dict:
    allowed = {"name", "bio", "channels", "showContactsPublicly"}
    update = {k: v for k, v in patch.items() if k in allowed}
    if "channels" in update and not update["channels"]:
        raise ApiError("Keep at least one contact channel for verification.")

    doc_ref = get_db().collection(COLLECTION).document(organizer_id)
    if not doc_ref.get().exists:
        raise ApiError("Organizer not found.", 404)
    if update:
        doc_ref.update(update)
    return get_organizer(organizer_id)


def list_all() -> list:
    db = get_db()
    return [to_admin_view(doc.id, doc.to_dict()) for doc in db.collection(COLLECTION).stream()]


def set_status(organizer_id: str, status: str) -> dict:
    if status not in ORGANIZER_STATUSES:
        raise ApiError("Invalid status.")
    doc_ref = get_db().collection(COLLECTION).document(organizer_id)
    if not doc_ref.get().exists:
        raise ApiError("Organizer not found.", 404)
    doc_ref.update({"status": status})
    return get_organizer(organizer_id)


def delete_cascade(organizer_id: str) -> None:
    """Deletes the organizer and every event they own, per spec §2.3."""
    db = get_db()
    org_ref = db.collection(COLLECTION).document(organizer_id)
    if not org_ref.get().exists:
        raise ApiError("Organizer not found.", 404)

    batch = db.batch()
    pending = 0
    for event_doc in db.collection("events").where("organizerId", "==", organizer_id).stream():
        batch.delete(event_doc.reference)
        pending += 1
        if pending >= 400:  # stay under Firestore's 500-writes-per-batch limit
            batch.commit()
            batch = db.batch()
            pending = 0
    batch.delete(org_ref)
    batch.commit()
