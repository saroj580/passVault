# Reusable dependencies: small functions routes ask for with Depends(...).
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app import key_store
from app.database import get_session
from app.models import User
from app.security import read_user_id_from_token

# Reads "Authorization: Bearer <token>" from the request.
# tokenUrl tells the /docs Authorize button where to log in.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    not_logged_in = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Not logged in or session expired",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_id = read_user_id_from_token(token)
    if user_id is None:
        raise not_logged_in
    # A valid token is not enough: after logout (or a restart) the key is
    # gone, and without the key the user must log in again.
    if key_store.get_key(user_id) is None:
        raise not_logged_in

    user = session.get(User, user_id)
    if user is None:
        raise not_logged_in
    return user


def get_current_key(user: User = Depends(get_current_user)) -> bytes:
    # The logged-in user's encryption key, for routes that encrypt or decrypt
    key = key_store.get_key(user.id)
    if key is None:  # expired in the tiny moment since get_current_user
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Not logged in or session expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return key
