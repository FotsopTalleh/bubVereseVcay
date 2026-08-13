import os
from datetime import datetime, timedelta, timezone

import jwt

ALGORITHM = "HS256"


class TokenError(Exception):
    pass


def _secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET is not set")
    return secret


def issue_token(payload: dict) -> str:
    expires_hours = int(os.environ.get("JWT_EXPIRES_HOURS", "168"))
    now = datetime.now(timezone.utc)
    claims = {
        **payload,
        "iat": now,
        "exp": now + timedelta(hours=expires_hours),
    }
    return jwt.encode(claims, _secret(), algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, _secret(), algorithms=[ALGORITHM])
    except jwt.PyJWTError as exc:
        raise TokenError(str(exc)) from exc


def issue_password_reset_ticket(organizer_id: str) -> str:
    """Short-lived, single-purpose token proving a reset code was verified ,
    distinct from a login token via the `purpose` claim."""
    now = datetime.now(timezone.utc)
    claims = {
        "sub": organizer_id,
        "purpose": "password_reset",
        "iat": now,
        "exp": now + timedelta(minutes=10),
    }
    return jwt.encode(claims, _secret(), algorithm=ALGORITHM)


def verify_password_reset_ticket(token: str) -> dict:
    claims = verify_token(token)
    if claims.get("purpose") != "password_reset":
        raise TokenError("Not a password-reset ticket")
    return claims
