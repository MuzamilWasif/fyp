from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role
from ..schemas.schemas import UserCreate, UserOut, Token
from ..core.security import hash_password, verify_password, create_access_token, get_current_user, require_roles
from ..services.audit import log

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db),
             admin: User = Depends(require_roles(Role.ADMIN))):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        email=payload.email, full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=Role(payload.role), department=payload.department, reg_no=payload.reg_no,
    )
    db.add(user); db.commit(); db.refresh(user)
    log(db, user=admin, action="user_created", entity="user", entity_id=user.id, detail=payload.email)
    return user


@router.post("/login", response_model=Token)
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    log(db, user=user, action="login", ip=request.client.host if request.client else "")
    return Token(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
