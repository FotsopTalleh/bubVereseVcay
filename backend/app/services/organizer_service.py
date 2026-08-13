import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.middleware.errors import ApiError
from app.models.organizer import ORGANIZER_STATUSES, to_admin_view, to_public_view
from app.utils.email_utils import send_email
from app.utils.firestore_client import get_db
from app.utils.jwt_utils import (
    TokenError,
    issue_password_reset_ticket,
    issue_token,
    verify_password_reset_ticket,
)
from app.utils.passwords import hash_password, password_strength_errors, verify_password

COLLECTION = "organizers"
RESET_CODE_TTL_MINUTES = 15


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
    weak = password_strength_errors(password)
    if weak:
        raise ApiError("Password must contain " + ", ".join(weak) + ".")
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
    allowed = {"name", "bio", "profileImageUrl", "channels", "showContactsPublicly"}
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


def request_password_reset(email: str) -> None:
    """Always succeeds from the caller's perspective, whether or not the
    email is registered, avoids leaking account existence to an attacker."""
    doc = _find_by_email(email or "")
    if doc is None:
        return
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = (
        datetime.now(timezone.utc) + timedelta(minutes=RESET_CODE_TTL_MINUTES)
    ).isoformat()
    doc.reference.update({"resetCodeHash": hash_password(code), "resetCodeExpiresAt": expires_at})
    send_email(
        to=doc.to_dict()["email"],
        subject="Your BubVerseVacy password reset code",
        body=(
            f"Your password reset code is {code}.\n\n"
            f"It expires in {RESET_CODE_TTL_MINUTES} minutes. "
            "If you didn't request this, you can safely ignore this email."
        ),
    )


def verify_reset_code(email: str, code: str) -> str:
    """Returns a short-lived password-reset ticket once the code checks out."""
    doc = _find_by_email(email or "")
    if doc is None:
        raise ApiError("Invalid or expired code.", 400)
    data = doc.to_dict()
    code_hash = data.get("resetCodeHash")
    expires_at = data.get("resetCodeExpiresAt")
    if not code_hash or not expires_at:
        raise ApiError("Invalid or expired code.", 400)
    if datetime.now(timezone.utc) > datetime.fromisoformat(expires_at):
        raise ApiError("Invalid or expired code.", 400)
    if not verify_password(code or "", code_hash):
        raise ApiError("Invalid or expired code.", 400)
    return issue_password_reset_ticket(doc.id)


def reset_password(reset_ticket: str, new_password: str) -> dict:
    try:
        claims = verify_password_reset_ticket(reset_ticket or "")
    except TokenError as exc:
        raise ApiError("Invalid or expired reset ticket.", 401) from exc

    weak = password_strength_errors(new_password)
    if weak:
        raise ApiError("Password must contain " + ", ".join(weak) + ".")

    organizer_id = claims["sub"]
    doc_ref = get_db().collection(COLLECTION).document(organizer_id)
    if not doc_ref.get().exists:
        raise ApiError("Organizer not found.", 404)
    doc_ref.update(
        {
            "passwordHash": hash_password(new_password),
            "resetCodeHash": None,
            "resetCodeExpiresAt": None,
        }
    )
    token = issue_token({"sub": organizer_id, "role": "planner", "organizerId": organizer_id})
    return {"organizer": get_organizer(organizer_id), "token": token}


def login_with_google(id_token_str: str) -> dict:
    """Verifies a Google Identity Services ID token (no client secret needed)
    and logs in or auto-registers the matching organizer."""
    client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
    if not client_id:
        raise ApiError("Google sign-in is not configured.", 500)
    try:
        claims = google_id_token.verify_oauth2_token(
            id_token_str, google_requests.Request(), client_id
        )
    except ValueError as exc:
        raise ApiError("Invalid Google credential.", 401) from exc

    email = (claims.get("email") or "").strip().lower()
    if not email or not claims.get("email_verified"):
        raise ApiError("Google account email is not verified.", 401)
    name = claims.get("name") or email.split("@")[0]

    doc = _find_by_email(email)
    if doc is None:
        data = {
            "name": name,
            "email": email,
            "passwordHash": hash_password(secrets.token_urlsafe(24)),
            "bio": "",
            "channels": [{"type": "Email", "value": email}],
            "showContactsPublicly": False,
            "status": "Pending Verification",
            "createdAt": _today(),
        }
        doc_ref = get_db().collection(COLLECTION).document()
        doc_ref.set(data)
        organizer_id = doc_ref.id
    else:
        data = doc.to_dict()
        organizer_id = doc.id

    token = issue_token({"sub": organizer_id, "role": "planner", "organizerId": organizer_id})
    return {"organizer": to_admin_view(organizer_id, data), "token": token}
