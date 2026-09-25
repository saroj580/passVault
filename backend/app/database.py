# Everything about WHERE the database lives and HOW we open it.
import os
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine


def get_data_dir() -> Path:
    # %APPDATA% is usually C:\Users\<you>\AppData\Roaming
    appdata = os.environ.get("APPDATA")
    if not appdata:
        raise RuntimeError("APPDATA is not set; PassVault only runs on Windows")
    folder = Path(appdata) / "PassVault"
    # parents=True: create missing parent folders; exist_ok=True: no error if it exists
    folder.mkdir(parents=True, exist_ok=True)
    return folder


DB_PATH = get_data_dir() / "vault.db"

# The engine is the connection to the database file.
# check_same_thread=False: FastAPI may answer requests on different threads,
# and SQLite refuses that unless we allow it.
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)


def create_db_and_tables():
    # Creates every table class marked table=True (if it does not exist yet).
    # The model classes must have been imported before this runs.
    SQLModel.metadata.create_all(engine)


def get_session():
    # A FastAPI "dependency": gives one database session to a request,
    # then closes it automatically when the request is done.
    with Session(engine) as session:
        yield session
