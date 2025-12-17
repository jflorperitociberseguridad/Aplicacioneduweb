from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from models.course import Course, CourseCreate, CourseUpdate, CourseStatus, CourseSection
from utils.auth import get_current_user, require_roles
from utils.audit import log_audit

router = APIRouter(prefix="/courses", tags=["Cursos"])

db = None

def init_router(database):
    global db
    db = database


@router.get("", response_model=List[Course])
async def list_courses(
    category_id: Optional[str] = None,
    status: Optional[CourseStatus] = None,
    visible: Optional[bool] = None,
    search: Optional[str] = None,
    tags: Optional[str] = None,
    created_by: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Listar cursos con filtros (Pantalla A)"""
    query = {}
    
    # Students only see published visible courses or courses they're enrolled in
    if current_user["role"] == "student":
        enrolled_courses = await db.enrollments.find(
            {"user_id": current_user["user_id"], "status": "active"},
            {"course_id": 1}
        ).to_list(1000)
        enrolled_ids = [e["course_id"] for e in enrolled_courses]
        
        query["$or"] = [
            {"status": "published", "visible": True},
            {"id": {"$in": enrolled_ids}}
        ]
    else:
        # Teachers/admins can filter by status and visibility
        if status:
            query["status"] = status.value
        if visible is not None:
            query["visible"] = visible
    
    if category_id:
        query["category_id"] = category_id
    if search:
        query["$or"] = [
            {"fullname": {"$regex": search, "$options": "i"}},
            {"shortname": {"$regex": search, "$options": "i"}}
        ]
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        query["tags"] = {"$in": tag_list}
    if created_by:
        query["created_by"] = created_by
    
    courses = await db.courses.find(
        query, {"_id": 0}
    ).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return courses


@router.post("", response_model=Course)
async def create_course(
    course_data: CourseCreate,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Crear nuevo curso"""
    # Check unique shortname
    existing = await db.courses.find_one({"shortname": course_data.shortname})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un curso con ese nombre corto"
        )
    
    # Verify category exists
    category = await db.course_categories.find_one({"id": course_data.category_id})
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Categoría no encontrada"
        )
    
    course = Course(
        **course_data.model_dump(),
        created_by=current_user["user_id"]
    )
    
    await db.courses.insert_one(course.model_dump())
    
    # Create default Section 0 (Introduction)
    section0 = CourseSection(
        course_id=course.id,
        title="Introducción",
        summary="Sección de bienvenida y recursos generales del curso.",
        position=0
    )
    await db.course_sections.insert_one(section0.model_dump())
    
    # Create additional sections based on num_sections
    for i in range(1, course.num_sections + 1):
        section = CourseSection(
            course_id=course.id,
            title=f"Tema {i}" if course.format.value == "topics" else f"Semana {i}",
            position=i
        )
        await db.course_sections.insert_one(section.model_dump())
    
    # Update category course count
    await db.course_categories.update_one(
        {"id": course_data.category_id},
        {"$inc": {"course_count": 1}}
    )
    
    await log_audit(
        db, "create", "course", course.id,
        current_user["user_id"],
        details={"fullname": course.fullname, "shortname": course.shortname}
    )
    
    return course


@router.get("/{course_id}", response_model=Course)
async def get_course(
    course_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener curso por ID"""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    # Check access for students
    if current_user["role"] == "student":
        if course["status"] != "published" or not course["visible"]:
            # Check enrollment
            enrollment = await db.enrollments.find_one({
                "course_id": course_id,
                "user_id": current_user["user_id"],
                "status": "active"
            })
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes acceso a este curso"
                )
    
    return course


@router.patch("/{course_id}", response_model=Course)
async def update_course(
    course_id: str,
    course_update: CourseUpdate,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Actualizar curso (Pantalla B)"""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    # Check if course is archived (read-only)
    if course["status"] == "archived":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Los cursos archivados no se pueden editar"
        )
    
    # Teachers can only edit their own courses
    if current_user["role"] == "teacher" and course["created_by"] != current_user["user_id"]:
        # Check if enrolled as teacher
        enrollment = await db.enrollments.find_one({
            "course_id": course_id,
            "user_id": current_user["user_id"],
            "role": "teacher"
        })
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para editar este curso"
            )
    
    update_data = course_update.model_dump(exclude_unset=True)
    
    # Check shortname uniqueness if changing
    if "shortname" in update_data and update_data["shortname"] != course["shortname"]:
        existing = await db.courses.find_one({"shortname": update_data["shortname"]})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un curso con ese nombre corto"
            )
    
    # Handle nested objects properly
    for key in ["completion", "gradebook", "ai", "files"]:
        if key in update_data and update_data[key] is not None:
            update_data[key] = update_data[key].model_dump() if hasattr(update_data[key], 'model_dump') else update_data[key]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["last_modified_by"] = current_user["user_id"]
    
    await db.courses.update_one({"id": course_id}, {"$set": update_data})
    
    await log_audit(
        db, "update", "course", course_id,
        current_user["user_id"],
        old_values={k: course.get(k) for k in update_data.keys() if k in course},
        new_values=update_data
    )
    
    updated = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return updated


@router.delete("/{course_id}")
async def delete_course(
    course_id: str,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Eliminar curso (solo admin, requiere confirmación)"""
    course = await db.courses.find_one({"id": course_id})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    # Delete related data
    await db.course_sections.delete_many({"course_id": course_id})
    await db.course_items.delete_many({"course_id": course_id})
    await db.enrollments.delete_many({"course_id": course_id})
    await db.grades.delete_many({"course_id": course_id})
    await db.completion_state.delete_many({"course_id": course_id})
    
    # Update category count
    await db.course_categories.update_one(
        {"id": course["category_id"]},
        {"$inc": {"course_count": -1}}
    )
    
    await db.courses.delete_one({"id": course_id})
    
    await log_audit(
        db, "delete", "course", course_id,
        current_user["user_id"],
        details={"fullname": course.get("fullname"), "shortname": course.get("shortname")}
    )
    
    return {"message": "Curso eliminado permanentemente"}


@router.post("/{course_id}/duplicate", response_model=Course)
async def duplicate_course(
    course_id: str,
    new_shortname: str,
    new_fullname: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Duplicar curso"""
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    # Check unique shortname
    existing = await db.courses.find_one({"shortname": new_shortname})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un curso con ese nombre corto"
        )
    
    # Create new course
    new_course_data = {**course}
    new_course_data["id"] = str(uuid.uuid4())
    new_course_data["shortname"] = new_shortname
    new_course_data["fullname"] = new_fullname or f"{course['fullname']} (Copia)"
    new_course_data["status"] = "draft"
    new_course_data["created_by"] = current_user["user_id"]
    new_course_data["created_at"] = datetime.now(timezone.utc).isoformat()
    new_course_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.courses.insert_one(new_course_data)
    
    # Duplicate sections
    sections = await db.course_sections.find({"course_id": course_id}, {"_id": 0}).to_list(100)
    section_id_map = {}
    
    for section in sections:
        old_section_id = section["id"]
        section["id"] = str(uuid.uuid4())
        section["course_id"] = new_course_data["id"]
        section["created_at"] = datetime.now(timezone.utc).isoformat()
        section["updated_at"] = datetime.now(timezone.utc).isoformat()
        section_id_map[old_section_id] = section["id"]
        await db.course_sections.insert_one(section)
    
    # Duplicate items
    items = await db.course_items.find({"course_id": course_id}, {"_id": 0}).to_list(1000)
    for item in items:
        item["id"] = str(uuid.uuid4())
        item["course_id"] = new_course_data["id"]
        item["section_id"] = section_id_map.get(item["section_id"], item["section_id"])
        item["created_at"] = datetime.now(timezone.utc).isoformat()
        item["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.course_items.insert_one(item)
    
    # Update category count
    await db.course_categories.update_one(
        {"id": new_course_data["category_id"]},
        {"$inc": {"course_count": 1}}
    )
    
    await log_audit(
        db, "duplicate", "course", new_course_data["id"],
        current_user["user_id"],
        details={"original_course_id": course_id, "new_shortname": new_shortname}
    )
    
    return new_course_data


@router.post("/bulk")
async def bulk_course_action(
    course_ids: List[str],
    action: str,  # hide, show, suspend, archive, delete
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Acciones en lote para cursos"""
    # Only admins can delete
    if action == "delete" and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden eliminar cursos"
        )
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if action == "hide":
        update_data["visible"] = False
    elif action == "show":
        update_data["visible"] = True
    elif action == "suspend":
        update_data["status"] = "suspended"
    elif action == "archive":
        update_data["status"] = "archived"
    elif action == "delete":
        for cid in course_ids:
            course = await db.courses.find_one({"id": cid})
            if course:
                await db.course_sections.delete_many({"course_id": cid})
                await db.course_items.delete_many({"course_id": cid})
                await db.enrollments.delete_many({"course_id": cid})
                await db.courses.delete_one({"id": cid})
                await db.course_categories.update_one(
                    {"id": course["category_id"]},
                    {"$inc": {"course_count": -1}}
                )
                await log_audit(db, "bulk_delete", "course", cid, current_user["user_id"])
        return {"message": f"{len(course_ids)} cursos eliminados"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción no válida"
        )
    
    await db.courses.update_many(
        {"id": {"$in": course_ids}},
        {"$set": update_data}
    )
    
    for cid in course_ids:
        await log_audit(db, f"bulk_{action}", "course", cid, current_user["user_id"])
    
    return {"message": f"Acción '{action}' aplicada a {len(course_ids)} cursos"}


@router.get("/{course_id}/stats")
async def get_course_stats(
    course_id: str,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Obtener estadísticas del curso"""
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    section_count = await db.course_sections.count_documents({"course_id": course_id})
    item_count = await db.course_items.count_documents({"course_id": course_id})
    enrollment_count = await db.enrollments.count_documents({"course_id": course_id, "status": "active"})
    student_count = await db.enrollments.count_documents({"course_id": course_id, "role": "student", "status": "active"})
    
    return {
        "section_count": section_count,
        "item_count": item_count,
        "enrollment_count": enrollment_count,
        "student_count": student_count
    }
