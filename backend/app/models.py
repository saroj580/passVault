# Database TABLES. Each class with table=True becomes one table in vault.db.
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "users"

    # None until the database gives it a number when the row is saved
    id: int | None = Field(default=None, primary_key=True)
    # Always stored lowercase; unique=True makes the database refuse duplicates
    username: str = Field(index=True, unique=True, max_length=32)
    # Argon2 hash of the master password (never the password itself)
    password_hash: str
    # Random 16 bytes, used in Step 3 to derive the encryption key with PBKDF2
    kdf_salt: bytes
    created_at: datetime = Field(default_factory=utc_now)


class VaultItem(SQLModel, table=True):
    __tablename__ = "vault_items"

    id: int | None = Field(default=None, primary_key=True)
    # Which user owns this item; every query filters on it
    user_id: int = Field(foreign_key="users.id", index=True)
    # Plain text, so the list and search work without decrypting
    site: str = Field(max_length=200)
    username: str = Field(max_length=200)
    url: str | None = Field(default=None, max_length=2048)
    category: str = Field(default="Other", max_length=20)
    # Fernet tokens (look like "gAAAAAB..."); unreadable without the key
    password_encrypted: str
    notes_encrypted: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
