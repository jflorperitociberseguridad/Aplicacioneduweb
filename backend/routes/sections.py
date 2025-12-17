from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime, timezone

from models.course import CourseSection, CourseSectionCreate, CourseSectionUpdate
from utils.auth import get_current_user, require_roles
from utils.audit import log_audit

router = APIRouter(prefix="/courses/{course_id}/sections", tags=["Secciones"])

db = None

def init_router(database):
    global db
    db = database


async def check_course_access(course_id: str, current_user: dict, edit: bool = False):
    """Verify user has access to course"""
    course = await db.courses.find_one({"id": course_id})
    
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
    
    if current_user["role"] == "student":
        enrollment = await db.enrollments.find_one({
            "course_id": course_id,
            "user_id": current_user["user_id"],
            "status": "active"
        })
        if not enrollment and (course["status"] != "published" or not course["visible"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes acceso a este curso"
            )
    
    return course


@router.get("", response_model=List[CourseSection])
async def list_sections(
    course_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Listar secciones de un curso (Pantalla C - índice lateral)"""
    await check_course_access(course_id, current_user)
    
    query = {"course_id": course_id}
    
    # Students only see visible sections
    if current_user["role"] == "student":
        query["visible"] = True
    
    sections = await db.course_sections.find(
        query, {"_id": 0}
    ).sort("position", 1).to_list(100)
    
    return sections


@router.post("", response_model=CourseSection)
async def create_section(
    course_id: str,
    section_data: CourseSectionCreate,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Crear nueva sección"""
    await check_course_access(course_id, current_user, edit=True)
    
    # Get max position
    max_section = await db.course_sections.find_one(
        {"course_id": course_id},
        sort=[("position", -1)]
    )
    next_position = (max_section["position"] + 1) if max_section else 0
    
    section = CourseSection(
        **section_data.model_dump(),
        course_id=course_id,
        position=section_data.position if section_data.position else next_position
    )
    
    await db.course_sections.insert_one(section.model_dump())
    
    # Update course timestamp
    await db.courses.update_one(
        {"id": course_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(
        db, "create", "section", section.id,
        current_user["user_id"],
        details={"course_id": course_id, "title": section.title}
    )
    
    return section


@router.get("/{section_id}", response_model=CourseSection)
async def get_section(
    course_id: str,
    section_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener sección por ID"""
    await check_course_access(course_id, current_user)
    
    section = await db.course_sections.find_one(
        {"id": section_id, "course_id": course_id},
        {"_id": 0}
    )
    
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sección no encontrada"
        )
    
    return section


@router.patch("/{section_id}", response_model=CourseSection)
async def update_section(
    course_id: str,
    section_id: str,
    section_update: CourseSectionUpdate,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Actualizar sección"""
    await check_course_access(course_id, current_user, edit=True)
    
    section = await db.course_sections.find_one(
        {"id": section_id, "course_id": course_id},
        {"_id": 0}
    )
    
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sección no encontrada"
        )
    
    update_data = section_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.course_sections.update_one(
        {"id": section_id},
        {"$set": update_data}
    )
    
    # Update course timestamp
    await db.courses.update_one(
        {"id": course_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(
        db, "update", "section", section_id,
        current_user["user_id"],
        old_values={k: section.get(k) for k in update_data.keys()},
        new_values=update_data
    )
    
    updated = await db.course_sections.find_one({"id": section_id}, {"_id": 0})
    return updated


@router.delete("/{section_id}")
async def delete_section(
    course_id: str,
    section_id: str,
    force: bool = False,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Eliminar sección (requiere confirmación si tiene contenido)"""
    await check_course_access(course_id, current_user, edit=True)
    
    section = await db.course_sections.find_one(
        {"id": section_id, "course_id": course_id}
    )
    
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sección no encontrada"
        )
    
    # Check for items
    item_count = await db.course_items.count_documents({"section_id": section_id})
    if item_count > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La sección tiene {item_count} elementos. Usa force=true para confirmar."
        )
    
    # Delete items
    if item_count > 0:
        await db.course_items.delete_many({"section_id": section_id})
    
    await db.course_sections.delete_one({"id": section_id})
    
    # Update course timestamp
    await db.courses.update_one(
        {"id": course_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(
        db, "delete", "section", section_id,
        current_user["user_id"],
        details={"title": section.get("title"), "items_deleted": item_count}
    )
    
    return {"message": "Sección eliminada"}


@router.post("/{section_id}/move")
async def move_section(
    course_id: str,
    section_id: str,
    new_position: int,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Mover sección a nueva posición (drag & drop)"""
    await check_course_access(course_id, current_user, edit=True)
    
    section = await db.course_sections.find_one(
        {"id": section_id, "course_id": course_id}
    )
    
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sección no encontrada"
        )
    
    old_position = section["position"]
    
    if new_position == old_position:
        return {"message": "Sin cambios"}
    
    # Reorder other sections
    if new_position > old_position:
        # Moving down: decrease position of sections between old and new
        await db.course_sections.update_many(
            {
                "course_id": course_id,
                "position": {"$gt": old_position, "$lte": new_position}
            },
            {"$inc": {"position": -1}}
        )
    else:
        # Moving up: increase position of sections between new and old
        await db.course_sections.update_many(
            {
                "course_id": course_id,
                "position": {"$gte": new_position, "$lt": old_position}
            },
            {"$inc": {"position": 1}}
        )
    
    # Update section position
    await db.course_sections.update_one(
        {"id": section_id},
        {"$set": {
            "position": new_position,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update course timestamp
    await db.courses.update_one(
        {"id": course_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Sección movida de {old_position} a {new_position}"}
