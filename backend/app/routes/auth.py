# Routes for creating accounts, logging in and logging out.
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app import key_store
from app.database import get_session
from app.deps import get_current_user
from app.models import User
from app.schemas import RegisterRequest, TokenOut, UserOut
from app.security import (
    create_access_token,
    derive_key,
    hash_password,
    new_kdf_salt,
    verify_password,
)

# All routes in this file start with /auth and are grouped as "auth" in /docs
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, session: Session = Depends(get_session)):
    username = data.username.lower()

    existing = session.exec(select(User).where(User.username == username)).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")

    user = User(
        username=username,
        password_hash=hash_password(data.password),
        kdf_salt=new_kdf_salt(),
    )
    session.add(user)
    session.commit()
    session.refresh(user)  # reload the row so user.id is filled in
    return user


@router.post("/login", response_model=TokenOut)
def login(
    # OAuth2 login uses form fields (username, password), not JSON
    form: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.username == form.username.lower())).first()
    # Same message for "no such user" and "wrong password", so nobody can
    # find out which usernames exist.
    if user is None or not verify_password(user.password_hash, form.password):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Wrong username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token, expires_at = create_access_token(user.id)
    key = derive_key(form.password, user.kdf_salt)
    key_store.store_key(user.id, key, expires_at)
    return TokenOut(access_token=token, expires_at=expires_at)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(user: User = Depends(get_current_user)):
    key_store.remove_key(user.id)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    # A simple protected route: handy to test the token in /docs
    return user
