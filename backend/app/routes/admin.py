from flask import Blueprint, jsonify, request

from app.middleware.auth import role_required
from app.services import admin_service, event_service, organizer_service

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/organizers")
@role_required("admin")
def list_organizers():
    return jsonify(organizer_service.list_all())


@admin_bp.patch("/organizers/<organizer_id>/status")
@role_required("admin")
def set_organizer_status(organizer_id: str):
    body = request.get_json(silent=True) or {}
    return jsonify(organizer_service.set_status(organizer_id, body.get("status", "")))


@admin_bp.delete("/organizers/<organizer_id>")
@role_required("admin")
def delete_organizer(organizer_id: str):
    organizer_service.delete_cascade(organizer_id)
    return "", 204


@admin_bp.get("/events")
@role_required("admin")
def list_events():
    return jsonify(event_service.list_all_events())


@admin_bp.patch("/events/<event_id>/moderate")
@role_required("admin")
def moderate_event(event_id: str):
    body = request.get_json(silent=True) or {}
    event = admin_service.moderate_event(event_id, body.get("status", ""), body.get("reason", ""))
    return jsonify(event)


@admin_bp.get("/moderation-logs")
@role_required("admin")
def moderation_logs():
    return jsonify(admin_service.list_moderation_logs())


@admin_bp.get("/analytics")
@role_required("admin")
def analytics():
    return jsonify(admin_service.analytics())
