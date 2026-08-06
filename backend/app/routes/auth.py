from flask import Blueprint, jsonify, request

from app.services import admin_service, organizer_service

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    body = request.get_json(silent=True) or {}
    result = organizer_service.register(
        name=body.get("name", ""),
        email=body.get("email", ""),
        password=body.get("password", ""),
        bio=body.get("bio", ""),
        channels=body.get("channels", []),
        show_contacts_publicly=body.get("showContactsPublicly", False),
    )
    return jsonify(result), 201


@auth_bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    result = organizer_service.login(body.get("email", ""), body.get("password", ""))
    return jsonify(result)


@auth_bp.post("/admin/login")
def admin_login():
    body = request.get_json(silent=True) or {}
    result = admin_service.login_admin(body.get("email", ""), body.get("password", ""))
    return jsonify(result)
