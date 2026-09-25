# Keeps each logged-in user's encryption key in memory (RAM) only.
# Nothing here is ever written to disk or logged. When the backend stops,
# every key disappears and everyone has to log in again.
from datetime import datetime, timezone

# user_id -> (key, expires_at)
_keys: dict[int, tuple[bytes, datetime]] = {}


def _remove_expired():
    now = datetime.now(timezone.utc)
    for user_id in [uid for uid, (_, exp) in _keys.items() if exp <= now]:
        del _keys[user_id]


def store_key(user_id: int, key: bytes, expires_at: datetime):
    # A second login replaces the entry (same key, later expiry time).
    _keys[user_id] = (key, expires_at)


def get_key(user_id: int) -> bytes | None:
    _remove_expired()
    entry = _keys.get(user_id)
    return entry[0] if entry else None


def remove_key(user_id: int):
    _keys.pop(user_id, None)
