# The entry point of the backend. Uvicorn loads the "app" object from this file.
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import create_db_and_tables
from app.routes import auth, items  # importing these also imports the models


# Code before "yield" runs once when the server starts; after it, when it stops.
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


# Create the web application. The title shows at the top of the /docs page.
app = FastAPI(title="PassVault API", lifespan=lifespan)

# CORS: lets the Vite dev server (a different port = a different "origin")
# read our responses. Only that one origin is allowed, never "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(items.router)


# A "route": when someone sends GET /health, FastAPI calls this function
# and turns the returned dict into JSON. Electron will use it later to
# check that the backend has started.
@app.get("/health")
def health():
    return {"status": "ok"}


def find_frontend_dir() -> Path | None:
    if getattr(sys, "frozen", False):
        # Packaged backend.exe (Step 8): PyInstaller unpacks bundled files
        # into a temporary folder whose path is in sys._MEIPASS
        folder = Path(sys._MEIPASS) / "frontend_dist"
    else:
        # Development: backend/app/main.py → up 2 folders → frontend/dist
        folder = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    return folder if folder.is_dir() else None


# Serve the React build (index.html, JS, CSS) at "/". This must come LAST:
# routes registered above (/health, /auth, /items, /docs) are checked first.
frontend_dir = find_frontend_dir()
if frontend_dir:
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
