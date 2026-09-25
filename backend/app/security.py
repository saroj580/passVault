# Password hashing, key derivation and JWTs. All crypto code lives in this file.
import base64
import hashlib
import secrets
import string
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cryptography.fernet import Fernet

# PasswordHasher uses safe Argon2id default settings and adds its own salt.
_hasher = PasswordHasher()

PBKDF2_ITERATIONS = 600_000
TOKEN_LIFETIME = timedelta(minutes=15)
JWT_ALGORITHM = "HS256"
# A new random secret every time the backend starts. It is never saved, so
# after a restart all old tokens stop working (the keys are gone anyway).
_JWT_SECRET = secrets.token_urlsafe(64)


# ---------- Argon2: checking the master password ----------

def hash_password(password: str) -> str:
    # Returns a text like "$argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>"
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


# ---------- PBKDF2: turning the master password into an encryption key ----------

def new_kdf_salt() -> bytes:
    # secrets = cryptographically secure randomness (unlike the "random" module)
    return secrets.token_bytes(16)


def derive_key(password: str, kdf_salt: bytes) -> bytes:
    # Same password + same salt always gives the same 32 bytes,
    # so we can rebuild the key at every login without ever storing it.
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), kdf_salt, PBKDF2_ITERATIONS, dklen=32
    )


# ---------- JWT: the "wristband" sent with every request ----------

def create_access_token(user_id: int) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + TOKEN_LIFETIME
    payload = {"sub": str(user_id), "exp": expires_at}
    token = jwt.encode(payload, _JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires_at


def read_user_id_from_token(token: str) -> int | None:
    # Returns the user id if the signature is valid and the token is not
    # expired; otherwise None. PyJWT checks both for us inside decode().
    try:
        payload = jwt.decode(token, _JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None


# ---------- Fernet: locking and unlocking site passwords and notes ----------

def _fernet(key: bytes) -> Fernet:
    # Fernet wants the 32-byte key written as url-safe base64 text
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt(key: bytes, text: str) -> str:
    # A new random IV each time: the same text gives a different token
    return _fernet(key).encrypt(text.encode("utf-8")).decode("ascii")


def decrypt(key: bytes, token: str) -> str:
    # Raises InvalidToken if the key is wrong or the data was changed
    return _fernet(key).decrypt(token.encode("ascii")).decode("utf-8")


# ---------- Password generator ----------

SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?"


def generate_password(length: int, uppercase: bool, digits: bool, symbols: bool) -> str:
    pools = [string.ascii_lowercase]
    if uppercase:
        pools.append(string.ascii_uppercase)
    if digits:
        pools.append(string.digits)
    if symbols:
        pools.append(SYMBOLS)

    # One character from every chosen pool, so each type is guaranteed...
    chars = [secrets.choice(pool) for pool in pools]
    # ...then fill the rest from all chosen pools together
    alphabet = "".join(pools)
    chars += [secrets.choice(alphabet) for _ in range(length - len(chars))]
    # Shuffle so the guaranteed characters are not always at the start
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)
