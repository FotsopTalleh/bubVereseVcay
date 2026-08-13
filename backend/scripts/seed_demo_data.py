"""Pushes demo organizers + events into Firestore for local testing, mirroring
the old frontend prototype's src/lib/seed.ts fixtures.

Run from backend/: python -m scripts.seed_demo_data
"""

import math
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()

from app.utils.firestore_client import get_db
from app.utils.passwords import hash_password


def _day(offset: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=offset)).date().isoformat()


def _history(base: int, spread: int) -> list:
    rows = []
    for i in range(7):
        rows.append(
            {
                "date": _day(i - 6),
                "pinClicks": max(0, round(base + math.sin(i) * spread + i * 2)),
                "directionClicks": max(0, round(base / 4 + math.cos(i) * (spread / 3) + i)),
                "shareCount": max(0, round(base / 8 + math.sin(i) * (spread / 4))),
                "linkClicks": max(0, round(base / 10 + math.cos(i) * (spread / 5))),
            }
        )
    return rows


ORGANIZERS = [
    {
        "email": "planner@bubverse.app",
        "password": "planner123",
        "name": "Mount Fako Collective",
        "bio": "Culture and music programming across Buea.",
        "channels": [
            {"type": "WhatsApp", "value": "+237 6 77 00 11 22"},
            {"type": "Instagram", "value": "https://instagram.com/mountfako"},
        ],
        "showContactsPublicly": False,
        "status": "Verified",
        "createdAt": _day(-90),
    },
    {
        "email": "nights@bubverse.app",
        "password": "planner123",
        "name": "Douala Nights Agency",
        "bio": "Nightlife and lifestyle events in Douala.",
        "channels": [{"type": "Mobile phone", "value": "+237 6 99 44 33 21"}],
        "showContactsPublicly": True,
        "status": "Pending Verification",
        "createdAt": _day(-20),
    },
    {
        "email": "sports@bubverse.app",
        "password": "planner123",
        "name": "Southwest Sports Union",
        "bio": "",
        "channels": [{"type": "Email", "value": "contact@swsu.cm"}],
        "showContactsPublicly": False,
        "status": "Needs More Information",
        "createdAt": _day(-40),
    },
]

DEMO_IMAGE = "https://res.cloudinary.com/demo/image/upload/samples/people/kitchen-bar.jpg"

# Cloudinary's public "demo" cloud — freely readable, no account/creds needed.
# Used to give seeded events a small photo gallery for the detail-view carousel.
_CLOUDINARY_DEMO = "https://res.cloudinary.com/demo/image/upload/"
_GALLERY = {
    "music": ["samples/people/kitchen-bar.jpg", "samples/coffee.jpg", "samples/smile.jpg"],
    "sports": ["samples/people/bicycle.jpg", "samples/shoes.jpg", "samples/sheep.jpg"],
    "business": ["samples/people/kitchen-bar.jpg", "samples/man-on-a-street.jpg", "samples/breakfast.jpg"],
    "culture": ["samples/landscapes/nature-mountains.jpg", "samples/food/spices.jpg", "samples/landscapes/girl-urban-view.jpg"],
    "nightlife": ["samples/landscapes/beach-boat.jpg", "samples/smile.jpg", "samples/people/boy-snow-hoodie.jpg"],
    "community": ["samples/animals/three-dogs.jpg", "samples/food/pot-mussels.jpg", "samples/breakfast.jpg"],
}


def _images(category: str) -> list:
    return [f"{_CLOUDINARY_DEMO}{path}" for path in _GALLERY[category.lower()]]


EVENTS = [
    dict(title="Afrobeats Night Live", category="Music", date=_day(3), startTime="20:00", endTime="23:59",
         venueName="Molyko Open Arena", address="Molyko Street, Buea, Southwest Region",
         lat=4.1568, lng=9.2871, organizerEmail="planner@bubverse.app",
         description="A live Afrobeats showcase with six regional acts, a full band set and an open dance floor until late.",
         images=_images("Music"), rating=4.7,
         pinClicks=184, directionClicks=42, shareCount=27, linkClicks=61, status="Published", createdAt=_day(-14), updatedAt=_day(-2), history=_history(20, 6)),
    dict(title="Buea Community Football Cup", category="Sports", date=_day(6), startTime="09:00", endTime="17:00",
         venueName="Buea Town Stadium", address="Buea Town, Southwest Region",
         lat=4.1489, lng=9.2405, organizerEmail="sports@bubverse.app",
         description="Sixteen neighbourhood teams compete across a single day of knockout matches. Free entry for spectators.",
         images=_images("Sports"), rating=4.3,
         pinClicks=96, directionClicks=31, shareCount=14, linkClicks=33, status="Published", createdAt=_day(-10), updatedAt=_day(-3), history=_history(12, 4)),
    dict(title="Startup Business Summit", category="Business", date=_day(12), startTime="08:30", endTime="16:00",
         venueName="Mountain Hotel Conference Hall", address="Mountain Hotel, Buea, Southwest Region",
         lat=4.1621, lng=9.2464, organizerEmail="planner@bubverse.app",
         description="Founders, investors and operators meet for a day of talks on building companies in Cameroon.",
         images=_images("Business"), rating=4.5,
         pinClicks=143, directionClicks=55, shareCount=19, linkClicks=44, status="Published", createdAt=_day(-21), updatedAt=_day(-5), history=_history(16, 5)),
    dict(title="Cultural Heritage Festival", category="Culture", date=_day(9), startTime="11:00", endTime="20:00",
         venueName="Bonanjo Cultural Grounds", address="Bonanjo, Douala, Littoral Region",
         lat=4.0433, lng=9.6929, organizerEmail="planner@bubverse.app",
         description="Traditional dance troupes, craft stalls and a heritage food market spread across the palace grounds.",
         images=_images("Culture"), rating=4.8,
         pinClicks=221, directionClicks=78, shareCount=35, linkClicks=82, status="Published", createdAt=_day(-30), updatedAt=_day(-4), history=_history(28, 8)),
    dict(title="Rooftop Party: Neon Skyline", category="Nightlife", date=_day(2), startTime="22:00", endTime="04:00",
         venueName="Skyline Terrace Akwa", address="Rue Joss, Akwa, Douala",
         lat=4.0511, lng=9.7085, organizerEmail="nights@bubverse.app",
         description="Late-night rooftop session with resident DJs, a skyline view over Akwa and a strict 21+ door policy.",
         images=_images("Nightlife"), rating=4.4,
         pinClicks=310, directionClicks=121, shareCount=48, linkClicks=113, status="Published", createdAt=_day(-8), updatedAt=_day(-1), history=_history(40, 12)),
    dict(title="Neighbourhood Cleanup Day", category="Community", date=_day(5), startTime="07:00", endTime="12:00",
         venueName="Bonapriso Market Square", address="Bonapriso, Douala, Littoral Region",
         lat=4.0301, lng=9.7145, organizerEmail="nights@bubverse.app",
         description="Volunteer cleanup along the Bonapriso corridor. Gloves, bags and refreshments provided on site.",
         images=_images("Community"), rating=4.9,
         pinClicks=58, directionClicks=19, shareCount=9, linkClicks=21, status="Published", createdAt=_day(-6), updatedAt=_day(-1), history=_history(8, 3)),
    dict(title="Sunset Acoustic Session", category="Music", date=_day(15), startTime="17:30", endTime="21:00",
         venueName="Great Soppo Gardens", address="Great Soppo, Buea, Southwest Region",
         lat=4.1454, lng=9.2612, organizerEmail="planner@bubverse.app",
         description="An intimate acoustic set from three songwriters, seated capacity of 120 on the garden lawn.",
         images=_images("Music"), rating=4.6,
         pinClicks=47, directionClicks=12, shareCount=5, linkClicks=11, status="Unpublished", createdAt=_day(-4), updatedAt=_day(-1), history=_history(6, 2)),
    dict(title="Akwa Street Food Carnival", category="Culture", date=_day(20), startTime="12:00", endTime="22:00",
         venueName="Boulevard de la Liberte", address="Akwa, Douala, Littoral Region",
         lat=4.0562, lng=9.7012, organizerEmail="nights@bubverse.app",
         description="Forty vendors line the boulevard for a weekend of regional street food and live percussion.",
         images=_images("Culture"), rating=4.2,
         pinClicks=132, directionClicks=44, shareCount=17, linkClicks=39, status="Published", createdAt=_day(-12), updatedAt=_day(-2), history=_history(18, 6)),
]


def main() -> None:
    db = get_db()

    org_ids: dict[str, str] = {}
    for org in ORGANIZERS:
        existing = list(db.collection("organizers").where("email", "==", org["email"]).limit(1).stream())
        if existing:
            org_ids[org["email"]] = existing[0].id
            print(f"Organizer already exists: {org['email']}")
            continue
        data = {k: v for k, v in org.items() if k != "password"}
        data["passwordHash"] = hash_password(org["password"])
        doc_ref = db.collection("organizers").document()
        doc_ref.set(data)
        org_ids[org["email"]] = doc_ref.id
        print(f"Created organizer: {org['email']}")

    for event in EVENTS:
        existing = list(
            db.collection("events")
            .where("title", "==", event["title"])
            .where("organizerId", "==", org_ids[event["organizerEmail"]])
            .limit(1)
            .stream()
        )
        if existing:
            existing[0].reference.update({"images": event["images"], "rating": event["rating"]})
            print(f"Event already exists, backfilled images/rating: {event['title']}")
            continue
        data = {k: v for k, v in event.items() if k != "organizerEmail"}
        data["organizerId"] = org_ids[event["organizerEmail"]]
        data["flyerImageUrl"] = DEMO_IMAGE
        db.collection("events").document().set(data)
        print(f"Created event: {event['title']}")

    print("\nDemo logins (password: planner123): " + ", ".join(o["email"] for o in ORGANIZERS))
    print("Create an admin login separately with: python -m scripts.create_admin")


if __name__ == "__main__":
    main()
