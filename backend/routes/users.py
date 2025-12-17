from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone

from models.user import User, UserCreate, UserUpdate, UserRole, UserStatus
from utils.auth import get_password_hash, get_current_user, require_roles
from utils.audit import log_audit

router = APIRouter(prefix="/users", tags=["Usuarios"])

db = None

def init_router(database):
    global db
    db = database


@router.get("", response_model=List[User])
async def list_users(
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Listar usuarios con filtros"""
    query = {}
    
    if role:
        query["role"] = role.value
    if status:
        query["status"] = status.value
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(
        query, 
        {"_id": 0, "hashed_password": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    return users


@router.post("", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Crear nuevo usuario (solo admin)"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    
    user = User(**user_dict)
    user_in_db = {
        **user.model_dump(),
        "hashed_password": get_password_hash(password)
    }
    
    await db.users.insert_one(user_in_db)
    
    await log_audit(
        db, "create", "user", user.id, 
        current_user["user_id"],
        details={"email": user.email, "role": user.role}
    )
    
    return user


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener usuario por ID"""
    # Users can view their own profile, admins/teachers can view any
    if current_user["user_id"] != user_id and current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver este perfil"
        )
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    return user


@router.patch("/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar usuario"""
    # Users can update their own profile (limited fields), admins can update any
    is_self = current_user["user_id"] == user_id
    is_admin = current_user["role"] == "admin"
    
    if not is_self and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para actualizar este perfil"
        )
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Non-admins can't change role or status
    if not is_admin:
        update_data.pop("role", None)
        update_data.pop("status", None)
    
    # Handle password change
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    await log_audit(
        db, "update", "user", user_id,
        current_user["user_id"],
        old_values={k: user.get(k) for k in update_data.keys() if k in user},
        new_values=update_data
    )
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    return updated_user


@router.post("/bulk", response_model=dict)
async def bulk_user_action(
    user_ids: List[str],
    action: str,  # deactivate, reactivate, change_role
    role: Optional[UserRole] = None,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Acciones en lote para usuarios"""
    if action == "deactivate":
        await db.users.update_many(
            {"id": {"$in": user_ids}},
            {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    elif action == "reactivate":
        await db.users.update_many(
            {"id": {"$in": user_ids}},
            {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    elif action == "change_role" and role:
        await db.users.update_many(
            {"id": {"$in": user_ids}},
            {"$set": {"role": role.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción no válida"
        )
    
    for uid in user_ids:
        await log_audit(db, f"bulk_{action}", "user", uid, current_user["user_id"])
    
    return {"message": f"Acción '{action}' aplicada a {len(user_ids)} usuarios"}
