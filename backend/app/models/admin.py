def to_public_view(doc_id: str, data: dict) -> dict:
    """Admin account shape with passwordHash stripped."""
    return {
        "id": doc_id,
        "email": data.get("email"),
        "createdAt": data.get("createdAt"),
    }
