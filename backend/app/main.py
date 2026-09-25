# The entry point of the backend. Uvicorn loads the "app" object from this file.
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import create_db_and_tables
from app.routes import auth, items  # importing these also imports the models


# Code before "yield" runs once when the server starts; after it, when it stops.
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


# Create the web application. The title shows at the top of the /docs page.
app = FastAPI(title="PassVault API", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(items.router)


# A "route": when someone sends GET /health, FastAPI calls this function
# and turns the returned dict into JSON. Electron will use it later to
# check that the backend has started.
@app.get("/health")
def health():
    return {"status": "ok"}
