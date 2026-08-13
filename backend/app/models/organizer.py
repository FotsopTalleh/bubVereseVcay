ORGANIZER_STATUSES = (
    "Pending Verification",
    "Verified",
    "Needs More Information",
    "Rejected",
    "Suspended",
)

CHANNEL_TYPES = (
    "Mobile phone",
    "WhatsApp",
    "Email",
    "Instagram",
    "Facebook",
    "X (Twitter)",
    "LinkedIn",
    "Other",
)


def to_admin_view(doc_id: str, data: dict) -> dict:
    """Full organizer record for admin/self views. Never includes passwordHash."""
    return {
        "id": doc_id,
        "name": data.get("name"),
        "email": data.get("email"),
        "bio": data.get("bio"),
        "profileImageUrl": data.get("profileImageUrl"),
        "channels": data.get("channels", []),
        "showContactsPublicly": data.get("showContactsPublicly", False),
        "status": data.get("status"),
        "createdAt": data.get("createdAt"),
    }


def to_public_view(doc_id: str, data: dict) -> dict:
    """Limited organizer summary attached to a public event response, contact
    channels are only included if the organizer opted in to showing them."""
    show = data.get("showContactsPublicly", False)
    return {
        "id": doc_id,
        "name": data.get("name"),
        "bio": data.get("bio", ""),
        "profileImageUrl": data.get("profileImageUrl"),
        "status": data.get("status"),
        "channels": data.get("channels", []) if show else [],
        "showContactsPublicly": show,
    }
