from flask import Blueprint, g, jsonify, request

from app.middleware.auth import role_required
from app.services import event_service, organizer_service

planner_bp = Blueprint("planner", __name__)


@planner_bp.get("/events")
@role_required("planner")
def my_events():
    return jsonify(event_service.list_planner_events(g.user["organizerId"]))


@planner_bp.get("/profile")
@role_required("planner")
def profile():
    return jsonify(organizer_service.get_organizer(g.user["organizerId"]))


@planner_bp.patch("/profile")
@role_required("planner")
def update_profile():
    body = request.get_json(silent=True) or {}
    return jsonify(organizer_service.update_profile(g.user["organizerId"], body))
