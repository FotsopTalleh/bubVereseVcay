import os
import time

import cloudinary
import cloudinary.utils

_configured = False


def _ensure_configured() -> None:
    global _configured
    if _configured:
        return
    cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
        secure=True,
    )
    _configured = True


def sign_upload(folder: str = "bubversevacy/flyers") -> dict:
    """Server-side signed-upload params so the API secret never reaches the browser."""
    _ensure_configured()
    timestamp = int(time.time())
    params_to_sign = {"timestamp": timestamp, "folder": folder}
    signature = cloudinary.utils.api_sign_request(params_to_sign, os.environ["CLOUDINARY_API_SECRET"])
    return {
        "timestamp": timestamp,
        "signature": signature,
        "apiKey": os.environ["CLOUDINARY_API_KEY"],
        "cloudName": os.environ["CLOUDINARY_CLOUD_NAME"],
        "folder": folder,
    }
