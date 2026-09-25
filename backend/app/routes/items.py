# Routes for the vault: list, search, read, create, update, delete items,
# plus the password generator. Every route needs a logged-in user.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, col, or_, select

from app.database import get_session
from app.deps import get_current_key, get_current_user
from app.models import User, VaultItem, utc_now
from app.schemas import GeneratedPassword, ItemIn, ItemOut, ItemSummary
from app.security import decrypt, encrypt, generate_password

router = APIRouter(tags=["items"])


def get_own_item(session: Session, user: User, item_id: int) -> VaultItem:
    item = session.get(VaultItem, item_id)
    # Someone else's item gets the same 404 as a missing one, so nobody
    # can find out that it exists.
    if item is None or item.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return item


def to_item_out(item: VaultItem, key: bytes) -> ItemOut:
    return ItemOut(
        id=item.id,
        site=item.site,
        username=item.username,
        url=item.url,
        category=item.category,
        password=decrypt(key, item.password_encrypted),
        notes=decrypt(key, item.notes_encrypted) if item.notes_encrypted else None,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/items", response_model=list[ItemSummary])
def list_items(
    q: str | None = Query(default=None, max_length=200, description="Search text"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = select(VaultItem).where(VaultItem.user_id == user.id)
    if q:
        # icontains = "contains, ignoring upper/lower case"; autoescape makes
        # % and _ in the search text count as normal characters
        query = query.where(
            or_(
                col(VaultItem.site).icontains(q, autoescape=True),
                col(VaultItem.username).icontains(q, autoescape=True),
                col(VaultItem.url).icontains(q, autoescape=True),
                col(VaultItem.category).icontains(q, autoescape=True),
            )
        )
    return session.exec(query.order_by(VaultItem.site)).all()


@router.get("/items/{item_id}", response_model=ItemOut)
def get_item(
    item_id: int,
    user: User = Depends(get_current_user),
    key: bytes = Depends(get_current_key),
    session: Session = Depends(get_session),
):
    return to_item_out(get_own_item(session, user, item_id), key)


@router.post("/items", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    data: ItemIn,
    user: User = Depends(get_current_user),
    key: bytes = Depends(get_current_key),
    session: Session = Depends(get_session),
):
    item = VaultItem(
        user_id=user.id,
        site=data.site,
        username=data.username,
        url=data.url,
        category=data.category,
        password_encrypted=encrypt(key, data.password),
        notes_encrypted=encrypt(key, data.notes) if data.notes else None,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return to_item_out(item, key)


@router.put("/items/{item_id}", response_model=ItemOut)
def update_item(
    item_id: int,
    data: ItemIn,
    user: User = Depends(get_current_user),
    key: bytes = Depends(get_current_key),
    session: Session = Depends(get_session),
):
    item = get_own_item(session, user, item_id)
    item.site = data.site
    item.username = data.username
    item.url = data.url
    item.category = data.category
    item.password_encrypted = encrypt(key, data.password)
    item.notes_encrypted = encrypt(key, data.notes) if data.notes else None
    item.updated_at = utc_now()
    session.add(item)
    session.commit()
    session.refresh(item)
    return to_item_out(item, key)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    session.delete(get_own_item(session, user, item_id))
    session.commit()


@router.get("/generate-password", response_model=GeneratedPassword)
def generate(
    length: int = Query(default=20, ge=8, le=128),
    uppercase: bool = True,
    digits: bool = True,
    symbols: bool = True,
    user: User = Depends(get_current_user),
):
    return GeneratedPassword(password=generate_password(length, uppercase, digits, symbols))
