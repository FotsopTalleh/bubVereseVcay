from flask import Blueprint, g, jsonify, request

from app import limiter
from app.middleware.auth import role_required
from app.models.event import CATEGORIES
from app.services import event_service, interaction_service

events_bp = Blueprint("events", __name__)


def _parse_bounds():
    raw = request.args.get("bounds")
    if not raw:
        return None
    try:
        parts = [float(p) for p in raw.split(",")]
    except ValueError:
        return None
    if len(parts) != 4:
        return None
    return tuple(parts)  # (south, west, north, east)


def _parse_categories():
    raw = request.args.get("categories")
    if not raw:
        return None
    return [c for c in raw.split(",") if c in CATEGORIES]


def _visitor_id() -> str:
    return request.headers.get("X-Visitor-Id") or request.remote_addr or "unknown"


@events_bp.get("/")
def list_public():
    """Public, published-only event pins — scoped to the current map viewport
    via ?bounds=south,west,north,east, optionally filtered by
    ?categories=A,B and ?q=keyword (spec §11: server-side, lean payload)."""
    events = event_service.list_public_summaries(
        _parse_bounds(),
        _parse_categories(),
        request.args.get("q"),
        detailed=request.args.get("view") == "list",
    )
    return jsonify(events)


@events_bp.get("/<event_id>")
def get_public_detail(event_id: str):
    """Full public detail for one event, fetched when a preview card expands."""
    return jsonify(event_service.get_public_detail(event_id))


@events_bp.post("/")
@role_required("planner")
def create():
    body = request.get_json(silent=True) or {}
    event = event_service.create_event(g.user["organizerId"], body)
    return jsonify(event), 201


@events_bp.patch("/<event_id>")
@role_required("planner", "admin")
def update(event_id: str):
    body = request.get_json(silent=True) or {}
    requester = None if g.user["role"] == "admin" else g.user["organizerId"]
    return jsonify(event_service.update_event(event_id, requester, body))


@events_bp.delete("/<event_id>")
@role_required("planner", "admin")
def delete(event_id: str):
    requester = None if g.user["role"] == "admin" else g.user["organizerId"]
    event_service.delete_event(event_id, requester)
    return "", 204


@events_bp.post("/<event_id>/pin-click")
@limiter.limit("20 per minute")
def pin_click(event_id: str):
    return jsonify(interaction_service.record_interaction(event_id, "pinClicks", _visitor_id()))


@events_bp.post("/<event_id>/direction-click")
@limiter.limit("20 per minute")
def direction_click(event_id: str):
    return jsonify(interaction_service.record_interaction(event_id, "directionClicks", _visitor_id()))


@events_bp.post("/<event_id>/share")
@limiter.limit("20 per minute")
def share(event_id: str):
    """Counted once per tap of the share button — i.e. how many times a
    shareable link was generated, not how many people it reached."""
    return jsonify(interaction_service.record_interaction(event_id, "shareCount", _visitor_id()))


@events_bp.post("/<event_id>/link-click")
@limiter.limit("20 per minute")
def link_click(event_id: str):
    """Counted once per person who opens a shared link — separate from
    shareCount so planners can see reach (shares) vs conversion (opens)."""
    return jsonify(interaction_service.record_interaction(event_id, "linkClicks", _visitor_id()))
