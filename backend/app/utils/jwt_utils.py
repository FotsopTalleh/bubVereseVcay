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
