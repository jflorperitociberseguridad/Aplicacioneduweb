from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from models.course import CourseItem, CourseItemCreate, CourseItemUpdate
from utils.auth import get_current_user, require_roles
from utils.audit import log_audit

router = APIRouter(tags=["Items/Recursos"])

db = None

def init_router(database):
    global db
    db = database


async def check_section_access(section_id: str, current_user: dict, edit: bool = False):
    """Verify user has access to section's course"""
    section = await db.course_sections.find_one({"id": section_id})
    
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sección no encontrada"
        )
    
    course = await db.courses.find_one({"id": section["course_id"]})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    if edit and course["status"] == "archived":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Los cursos archivados no se pueden editar"
        )
    
    return section, course


# Section items routes
@router.get("/sections/{section_id}/items", response_model=List[CourseItem])
async def list_section_items(
    section_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Listar items de una sección"""
    section, course = await check_section_access(section_id, current_user)
    
    query = {"section_id": section_id}
    
    # Students only see visible items
    if current_user["role"] == "student":
        query["visible"] = True
    
    items = await db.course_items.find(
        query, {"_id": 0}
    ).sort("position", 1).to_list(500)
    
    return items


@router.post("/sections/{section_id}/items", response_model=CourseItem)
async def create_item(
    section_id: str,
    item_data: CourseItemCreate,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Crear nuevo item/recurso en una sección"""
    section, course = await check_section_access(section_id, current_user, edit=True)
    
    # Get max position
    max_item = await db.course_items.find_one(
        {"section_id": section_id},
        sort=[("position", -1)]
    )
    next_position = (max_item["position"] + 1) if max_item else 0
    
    item = CourseItem(
        **item_data.model_dump(),
        section_id=section_id,
        course_id=course["id"],
        position=item_data.position if item_data.position else next_position
    )
    
    await db.course_items.insert_one(item.model_dump())
    
    # Update course timestamp
    await db.courses.update_one(
        {"id": course["id"]},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(
        db, "create", "item", item.id,
        current_user["user_id"],
        details={"course_id": course["id"], "section_id": section_id, "title": item.title, "type": item.item_type.value}
    )
    
    return item


# Item-specific routes
@router.get("/items/{item_id}", response_model=CourseItem)
async def get_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener item por ID"""
    item = await db.course_items.find_one({"id": item_id}, {"_id": 0})
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item no encontrado"
        )
    
    return item


@router.patch("/items/{item_id}", response_model=CourseItem)
async def update_item(
    item_id: str,
    item_update: CourseItemUpdate,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Actualizar item"""
    item = await db.course_items.find_one({"id": item_id}, {"_id": 0})
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item no encontrado"
        )
    
    # Check course is not archived
    course = await db.courses.find_one({"id": item["course_id"]})
    if course and course["status"] == "archived":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Los cursos archivados no se pueden editar"
        )
    
    update_data = item_update.model_dump(exclude_unset=True)
    
    # Handle nested objects
    for key in ["availability", "completion"]:
        if key in update_data and update_data[key] is not None:
            update_data[key] = update_data[key].model_dump() if hasattr(update_data[key], 'model_dump') else update_data[key]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.course_items.update_one({"id": item_id}, {"$set": update_data})
    
    # Update course timestamp
    if course:
        await db.courses.update_one(
            {"id": course["id"]},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    await log_audit(
        db, "update", "item", item_id,
        current_user["user_id"],
        old_values={k: item.get(k) for k in update_data.keys()},
        new_values=update_data
    )
    
    updated = await db.course_items.find_one({"id": item_id}, {"_id": 0})
    return updated


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: str,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Eliminar item"""
    item = await db.course_items.find_one({"id": item_id})
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item no encontrado"
        )
    
    # Check course is not archived
    course = await db.courses.find_one({"id": item["course_id"]})
    if course and course["status"] == "archived":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Los cursos archivados no se pueden editar"
        )
    
    await db.course_items.delete_one({"id": item_id})
    
    # Update course timestamp
    if course:
        await db.courses.update_one(
            {"id": course["id"]},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    await log_audit(
        db, "delete", "item", item_id,
        current_user["user_id"],
        details={"title": item.get("title"), "type": item.get("item_type")}
    )
    
    return {"message": "Item eliminado"}


@router.post("/items/{item_id}/duplicate", response_model=CourseItem)
async def duplicate_item(
    item_id: str,
    target_section_id: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Duplicar item (opcionalmente a otra sección)"""
    item = await db.course_items.find_one({"id": item_id}, {"_id": 0})
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item no encontrado"
        )
    
    section_id = target_section_id or item["section_id"]
    
    # Verify target section
    section = await db.course_sections.find_one({"id": section_id})
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sección destino no encontrada"
        )
    
    # Get max position in target section
    max_item = await db.course_items.find_one(
        {"section_id": section_id},
        sort=[("position", -1)]
    )
    next_position = (max_item["position"] + 1) if max_item else 0
    
    # Create new item
    new_item = {**item}
    new_item["id"] = str(uuid.uuid4())
    new_item["section_id"] = section_id
    new_item["course_id"] = section["course_id"]
    new_item["title"] = f"{item['title']} (Copia)"
    new_item["position"] = next_position
    new_item["created_at"] = datetime.now(timezone.utc).isoformat()
    new_item["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.course_items.insert_one(new_item)
    
    await log_audit(
        db, "duplicate", "item", new_item["id"],
        current_user["user_id"],
        details={"original_item_id": item_id}
    )
    
    return new_item


@router.post("/items/{item_id}/move")
async def move_item(
    item_id: str,
    target_section_id: str,
    new_position: int,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Mover item a otra sección/posición (drag & drop)"""
    item = await db.course_items.find_one({"id": item_id})
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item no encontrado"
        )
    
    # Verify target section
    target_section = await db.course_sections.find_one({"id": target_section_id})
    if not target_section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sección destino no encontrada"
        )
    
    old_section_id = item["section_id"]
    old_position = item["position"]
    
    # If moving to same section
    if target_section_id == old_section_id:
        if new_position == old_position:
            return {"message": "Sin cambios"}
        
        # Reorder in same section
        if new_position > old_position:
            await db.course_items.update_many(
                {
                    "section_id": old_section_id,
                    "position": {"$gt": old_position, "$lte": new_position}
                },
                {"$inc": {"position": -1}}
            )
        else:
            await db.course_items.update_many(
                {
                    "section_id": old_section_id,
                    "position": {"$gte": new_position, "$lt": old_position}
                },
                {"$inc": {"position": 1}}
            )
    else:
        # Moving to different section
        # Decrease positions in old section
        await db.course_items.update_many(
            {
                "section_id": old_section_id,
                "position": {"$gt": old_position}
            },
            {"$inc": {"position": -1}}
        )
        
        # Increase positions in new section
        await db.course_items.update_many(
            {
                "section_id": target_section_id,
                "position": {"$gte": new_position}
            },
            {"$inc": {"position": 1}}
        )
    
    # Update item
    await db.course_items.update_one(
        {"id": item_id},
        {"$set": {
            "section_id": target_section_id,
            "course_id": target_section["course_id"],
            "position": new_position,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Item movido a sección {target_section_id}, posición {new_position}"}


@router.patch("/items/{item_id}/visibility")
async def toggle_item_visibility(
    item_id: str,
    visible: bool,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Cambiar visibilidad del item"""
    item = await db.course_items.find_one({"id": item_id})
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item no encontrado"
        )
    
    await db.course_items.update_one(
        {"id": item_id},
        {"$set": {
            "visible": visible,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Item {'visible' if visible else 'oculto'}"}
