import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore


@lru_cache(maxsize=1)
def get_db():
    """Singleton Firestore client. Resolves credentials in order:
    1. FIREBASE_ADMIN_CREDENTIALS_JSON — the full service-account JSON as a
       string env var, for hosts with no GCP metadata server (e.g. Railway).
    2. FIREBASE_ADMIN_CREDENTIALS_PATH — a local JSON file (local dev).
    3. Application Default Credentials — an attached GCP service account,
       no secret needed at all (e.g. Cloud Run)."""
    if not firebase_admin._apps:
        cred_json = os.environ.get("FIREBASE_ADMIN_CREDENTIALS_JSON")
        cred_path = os.environ.get("FIREBASE_ADMIN_CREDENTIALS_PATH")
        if cred_json:
            cred = credentials.Certificate(json.loads(cred_json))
        elif cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
        else:
            cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)
    return firestore.client()
