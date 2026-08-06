from functools import wraps

from flask import g, request

from app.middleware.errors import ApiError
from app.utils.jwt_utils import TokenError, verify_token


def _extract_token() -> str:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise ApiError("Missing or invalid Authorization header", 401)
    return header[len("Bearer "):].strip()


def login_required(fn):
    """Verifies the JWT and attaches claims to g.user. Enforced server-side,
    not just hidden in the UI — every protected route below uses this."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        try:
            claims = verify_token(token)
        except TokenError as exc:
            raise ApiError("Invalid or expired session", 401) from exc
        g.user = claims
        return fn(*args, **kwargs)

    return wrapper


def role_required(*roles: str):
    """login_required plus a role check. Usage: @role_required("admin")."""

    def decorator(fn):
        @login_required
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if g.user.get("role") not in roles:
                raise ApiError("Forbidden", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator
