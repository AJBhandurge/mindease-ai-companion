"""
AUTHENTICATION API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db, User
from app.core.security import hash_password, verify_password, create_access_token
from ai.companions import list_companions, get_companion

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(username=req.username, password_hash=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return {"token": token, "user_id": user.id, "username": user.username, "companion_id": user.companion_id}


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.id)
    return {"token": token, "user_id": user.id, "username": user.username, "companion_id": user.companion_id}


@router.post("/companion/select")
def select_companion(user_id: int, companion_id: str, db: Session = Depends(get_db)):
    valid_ids = ["maya", "arjun", "zara", "leo"]
    if companion_id not in valid_ids:
        raise HTTPException(status_code=400, detail="Invalid companion")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.companion_id = companion_id
    db.commit()
    companion = get_companion(companion_id)
    return {
        "success": True,
        "companion": {
            "id": companion["id"], "name": companion["name"],
            "emoji": companion["emoji"], "tagline": companion["tagline"],
            "color": companion["color"]
        }
    }


@router.get("/companions")
def get_companions():
    return list_companions()
