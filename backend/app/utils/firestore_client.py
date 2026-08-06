import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore


@lru_cache(maxsize=1)
def get_db():
    """Singleton Firestore client backed by the Admin SDK service account."""
    if not firebase_admin._apps:
        cred_path = os.environ.get("FIREBASE_ADMIN_CREDENTIALS_PATH", "secrets/firebase-admin.json")
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    return firestore.client()
