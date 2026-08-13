from flask import Blueprint, jsonify

from app.middleware.auth import role_required
from app.utils.cloudinary_utils import sign_upload

uploads_bp = Blueprint("uploads", __name__)


@uploads_bp.post("/sign")
@role_required("planner")
def sign():
    """Signed Cloudinary upload params, the API secret stays server-side."""
    return jsonify(sign_upload())
