import re

import bcrypt

MIN_PASSWORD_LENGTH = 8


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def password_strength_errors(password: str) -> list[str]:
    """Returns a list of unmet requirements — empty list means the password is strong enough."""
    password = password or ""
    missing = []
    if len(password) < MIN_PASSWORD_LENGTH:
        missing.append(f"at least {MIN_PASSWORD_LENGTH} characters")
    if not re.search(r"[a-z]", password):
        missing.append("a lowercase letter")
    if not re.search(r"[A-Z]", password):
        missing.append("an uppercase letter")
    if not re.search(r"\d", password):
        missing.append("a number")
    if not re.search(r"[^\w\s]", password):
        missing.append("a symbol")
    return missing
