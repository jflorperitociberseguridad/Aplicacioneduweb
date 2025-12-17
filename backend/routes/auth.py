from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
import uuid

from models.auth import Token, LoginRequest, PasswordResetRequest, PasswordReset
from models.user import User, UserCreate, UserInDB
from utils.auth import verify_password, get_password_hash, create_access_token, get_current_user
from utils.audit import log_audit

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# Database will be injected
db = None

def init_router(database):
    global db
    db = database


@router.post("/login", response_model=Token)
async def login(request: LoginRequest):
    """Iniciar sesión con email y contraseña"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
    
    if not verify_password(request.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
    
    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está desactivada. Contacta al administrador."
        )
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Log access
    await db.access_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "action": "login",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "success": True
    })
    
    # Create token
    access_token = create_access_token(
        data={
            "sub": user["id"],
            "email": user["email"],
            "role": user["role"]
        }
    )
    
    return Token(access_token=access_token)


@router.post("/register", response_model=User)
async def register(user_data: UserCreate):
    """Registrar nuevo usuario (solo admin puede crear usuarios normalmente)"""
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Create user
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    
    user = User(**user_dict)
    user_in_db = {
        **user.model_dump(),
        "hashed_password": get_password_hash(password)
    }
    
    await db.users.insert_one(user_in_db)
    
    return user


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Obtener información del usuario actual"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "hashed_password": 0})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    return user


@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Solicitar restablecimiento de contraseña (mock - no envía email real)"""
    user = await db.users.find_one({"email": request.email})
    
    # Always return success to prevent email enumeration
    if user:
        # In production, generate token and send email
        reset_token = str(uuid.uuid4())
        await db.password_resets.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "token": reset_token,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "used": False
        })
    
    return {"message": "Si el email existe, recibirás instrucciones para restablecer tu contraseña."}


@router.post("/reset-password")
async def reset_password(request: PasswordReset):
    """Restablecer contraseña con token"""
    reset_record = await db.password_resets.find_one({
        "token": request.token,
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o expirado"
        )
    
    # Update password
    await db.users.update_one(
        {"id": reset_record["user_id"]},
        {"$set": {
            "hashed_password": get_password_hash(request.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"id": reset_record["id"]},
        {"$set": {"used": True}}
    )
    
    return {"message": "Contraseña actualizada correctamente"}
