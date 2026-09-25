# The SHAPE of JSON going in and out of the API (not database tables).
# FastAPI uses these to check incoming data and to filter what we send back.
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class RegisterRequest(BaseModel):
    # Letters, digits, _ . - only; 3 to 32 characters
    username: str = Field(min_length=3, max_length=32, pattern=r"^[A-Za-z0-9_.-]+$")
    # max_length stops someone sending a huge text that makes Argon2 slow
    password: str = Field(min_length=12, max_length=1024)


class UserOut(BaseModel):
    # Only these fields are sent back: never password_hash or kdf_salt
    id: int
    username: str
    created_at: datetime


class TokenOut(BaseModel):
    # access_token and token_type are the names the OAuth2 standard requires
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


# Literal = only these exact values are accepted (anything else → 422)
Category = Literal["Personal", "Work", "Banking", "Social", "Other"]


class ItemIn(BaseModel):
    # What the client sends to create (POST) or replace (PUT) an item
    site: str = Field(min_length=1, max_length=200)
    username: str = Field(default="", max_length=200)
    url: str | None = Field(default=None, max_length=2048, pattern=r"^https?://\S+$")
    category: Category = "Other"
    password: str = Field(min_length=1, max_length=1024)
    notes: str | None = Field(default=None, max_length=10_000)

    # Runs before the checks above: an empty url box counts as "no url"
    @field_validator("url", mode="before")
    @classmethod
    def empty_url_is_none(cls, value):
        return None if value == "" else value


class ItemSummary(BaseModel):
    # One row of the list: no password, no notes
    id: int
    site: str
    username: str
    url: str | None
    category: Category


class ItemOut(ItemSummary):
    # One full item, with password and notes decrypted
    password: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


class GeneratedPassword(BaseModel):
    password: str
