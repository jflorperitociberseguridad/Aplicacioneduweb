from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone

from models.category import CourseCategory, CourseCategoryCreate, CourseCategoryUpdate
from utils.auth import get_current_user, require_roles
from utils.audit import log_audit

router = APIRouter(prefix="/categories", tags=["Categorías"])

db = None

def init_router(database):
    global db
    db = database


@router.get("", response_model=List[CourseCategory])
async def list_categories(
    parent_id: Optional[str] = None,
    include_hidden: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Listar categorías de cursos"""
    query = {}
    
    if parent_id:
        query["parent_id"] = parent_id
    elif parent_id is None:
        # Root categories (no parent)
        query["parent_id"] = None
    
    if not include_hidden or current_user["role"] not in ["admin", "teacher"]:
        query["visible"] = True
    
    categories = await db.course_categories.find(
        query, {"_id": 0}
    ).sort("position", 1).to_list(100)
    
    return categories


@router.get("/tree", response_model=List[dict])
async def get_category_tree(
    current_user: dict = Depends(get_current_user)
):
    """Obtener árbol completo de categorías"""
    all_categories = await db.course_categories.find(
        {"visible": True}, {"_id": 0}
    ).sort("position", 1).to_list(500)
    
    # Build tree structure
    def build_tree(parent_id=None):
        children = [c for c in all_categories if c.get("parent_id") == parent_id]
        for child in children:
            child["children"] = build_tree(child["id"])
        return children
    
    return build_tree(None)


@router.post("", response_model=CourseCategory)
async def create_category(
    category_data: CourseCategoryCreate,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Crear nueva categoría (solo admin)"""
    category = CourseCategory(**category_data.model_dump())
    
    await db.course_categories.insert_one(category.model_dump())
    
    await log_audit(
        db, "create", "category", category.id,
        current_user["user_id"],
        details={"name": category.name}
    )
    
    return category


@router.get("/{category_id}", response_model=CourseCategory)
async def get_category(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener categoría por ID"""
    category = await db.course_categories.find_one({"id": category_id}, {"_id": 0})
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    return category


@router.patch("/{category_id}", response_model=CourseCategory)
async def update_category(
    category_id: str,
    category_update: CourseCategoryUpdate,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Actualizar categoría (solo admin)"""
    category = await db.course_categories.find_one({"id": category_id}, {"_id": 0})
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    update_data = category_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.course_categories.update_one({"id": category_id}, {"$set": update_data})
    
    await log_audit(
        db, "update", "category", category_id,
        current_user["user_id"],
        old_values={k: category.get(k) for k in update_data.keys()},
        new_values=update_data
    )
    
    updated = await db.course_categories.find_one({"id": category_id}, {"_id": 0})
    return updated


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Eliminar categoría (solo admin, si no tiene cursos)"""
    category = await db.course_categories.find_one({"id": category_id})
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    # Check for courses in this category
    course_count = await db.courses.count_documents({"category_id": category_id})
    if course_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar: hay {course_count} cursos en esta categoría"
        )
    
    # Check for subcategories
    subcategory_count = await db.course_categories.count_documents({"parent_id": category_id})
    if subcategory_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar: hay {subcategory_count} subcategorías"
        )
    
    await db.course_categories.delete_one({"id": category_id})
    
    await log_audit(
        db, "delete", "category", category_id,
        current_user["user_id"],
        details={"name": category.get("name")}
    )
    
    return {"message": "Categoría eliminada"}
