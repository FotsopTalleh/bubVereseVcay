from flask import Blueprint, jsonify, request

from app import limiter
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


@auth_bp.post("/forgot-password")
@limiter.limit("5 per hour")
def forgot_password():
    body = request.get_json(silent=True) or {}
    organizer_service.request_password_reset(body.get("email", ""))
    return jsonify({"message": "If that email is registered, a reset code has been sent."})


@auth_bp.post("/verify-reset-code")
@limiter.limit("10 per hour")
def verify_reset_code():
    body = request.get_json(silent=True) or {}
    ticket = organizer_service.verify_reset_code(body.get("email", ""), body.get("code", ""))
    return jsonify({"resetTicket": ticket})


@auth_bp.post("/reset-password")
@limiter.limit("10 per hour")
def reset_password():
    body = request.get_json(silent=True) or {}
    result = organizer_service.reset_password(
        body.get("resetTicket", ""), body.get("newPassword", "")
    )
    return jsonify(result)


@auth_bp.post("/google")
@limiter.limit("20 per hour")
def google_login():
    body = request.get_json(silent=True) or {}
    result = organizer_service.login_with_google(body.get("idToken", ""))
    return jsonify(result)
