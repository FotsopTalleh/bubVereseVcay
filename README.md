# BubVerseVacy

Map-first event discovery. Events surface as flyer-image pins on a live map — no
account needed to browse, filter, search or get directions. Event planners sign
in to publish and manage their own listings; admins verify organizers and
moderate events.

## Stack

- **Frontend**: TanStack Start (React 19) + TanStack Router/Query, Leaflet /
  react-leaflet for the map, Tailwind CSS + shadcn/ui components.
- **Backend**: Flask, Firestore (via `firebase-admin`) for data, Cloudinary for
  image hosting, JWT-based auth.

## Development

### Frontend

```sh
npm install
npm run dev
```

### Backend

```sh
cd backend
python -m venv .venv
.venv/Scripts/activate   # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
python run.py
```

Copy `backend/.env.example` to `backend/.env` and fill in:

- `JWT_SECRET` — any random string for local dev.
- `FIREBASE_ADMIN_CREDENTIALS_PATH` — path to a Firebase service account JSON.
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` —
  from your Cloudinary dashboard. Image uploads fail without these; everything
  else (auth, events, moderation, analytics) works regardless.
- `CORS_ORIGINS` — must include whatever origin the Vite dev server picks
  (it varies by run — check the terminal output).

Seed demo data (optional, for local testing) with:

```sh
python -m scripts.seed_demo_data
```

Create an admin login separately with:

```sh
python -m scripts.create_admin
```
