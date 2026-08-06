"""One-off CLI to bootstrap an admin account in Firestore.

Run from backend/: python -m scripts.create_admin
"""

import getpass
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

from app.utils.firestore_client import get_db
from app.utils.passwords import hash_password


def main() -> None:
    db = get_db()
    email = input("Admin email: ").strip().lower()
    if not email:
        print("Email is required.")
        return

    existing = list(db.collection("admins").where("email", "==", email).limit(1).stream())
    if existing:
        print(f"An admin with email {email} already exists.")
        return

    password = getpass.getpass("Admin password (min 8 chars): ")
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        return
    if password != getpass.getpass("Confirm password: "):
        print("Passwords did not match.")
        return

    db.collection("admins").document().set(
        {
            "email": email,
            "passwordHash": hash_password(password),
            "createdAt": datetime.now(timezone.utc).date().isoformat(),
        }
    )
    print(f"Admin account created for {email}.")


if __name__ == "__main__":
    main()
