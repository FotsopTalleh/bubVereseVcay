import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

load_dotenv()

# Module-level so route modules can `from app import limiter` and apply
# @limiter.limit(...), safe because create_app() only imports routes (which
# do that import) after this module has already finished executing once.
limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")


def create_app() -> Flask:
    app = Flask(__name__)

    origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins or "*"}})

    limiter.init_app(app)

    from app.middleware.errors import register_error_handlers

    register_error_handlers(app)

    from app.routes.admin import admin_bp
    from app.routes.auth import auth_bp
    from app.routes.events import events_bp
    from app.routes.planner import planner_bp
    from app.routes.uploads import uploads_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(events_bp, url_prefix="/api/events")
    app.register_blueprint(planner_bp, url_prefix="/api/planner")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(uploads_bp, url_prefix="/api/uploads")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
