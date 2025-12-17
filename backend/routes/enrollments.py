from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from models.enrollment import Enrollment, EnrollmentCreate, EnrollmentUpdate, EnrollmentRole, EnrollmentStatus
from utils.auth import get_current_user, require_roles
from utils.audit import log_audit

router = APIRouter(tags=["Matriculaciones"])

db = None

def init_router(database):
    global db
    db = database


# Course enrollments routes
@router.get("/courses/{course_id}/enrollments", response_model=List[Enrollment])
async def list_course_enrollments(
    course_id: str,
    role: Optional[EnrollmentRole] = None,
    status: Optional[EnrollmentStatus] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Listar matriculaciones de un curso"""
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    query = {"course_id": course_id}
    
    if role:
        query["role"] = role.value
    if status:
        query["status"] = status.value
    
    enrollments = await db.enrollments.find(
        query, {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with user data
    for enrollment in enrollments:
        user = await db.users.find_one(
            {"id": enrollment["user_id"]},
            {"_id": 0, "hashed_password": 0}
        )
        if user:
            enrollment["user"] = {
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "email": user.get("email")
            }
    
    return enrollments


@router.post("/courses/{course_id}/enrollments", response_model=Enrollment)
async def enroll_user(
    course_id: str,
    enrollment_data: EnrollmentCreate,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Matricular usuario en curso"""
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    # Verify user exists
    user = await db.users.find_one({"id": enrollment_data.user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # Check if already enrolled
    existing = await db.enrollments.find_one({
        "course_id": course_id,
        "user_id": enrollment_data.user_id
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario ya está matriculado en este curso"
        )
    
    enrollment = Enrollment(
        course_id=course_id,
        user_id=enrollment_data.user_id,
        role=enrollment_data.role,
        enrolled_by=current_user["user_id"]
    )
    
    await db.enrollments.insert_one(enrollment.model_dump())
    
    await log_audit(
        db, "enroll", "enrollment", enrollment.id,
        current_user["user_id"],
        details={
            "course_id": course_id,
            "user_id": enrollment_data.user_id,
            "role": enrollment_data.role.value
        }
    )
    
    return enrollment


@router.patch("/enrollments/{enrollment_id}", response_model=Enrollment)
async def update_enrollment(
    enrollment_id: str,
    enrollment_update: EnrollmentUpdate,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Actualizar matriculación (rol, estado)"""
    enrollment = await db.enrollments.find_one({"id": enrollment_id}, {"_id": 0})
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matriculación no encontrada"
        )
    
    update_data = enrollment_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.enrollments.update_one({"id": enrollment_id}, {"$set": update_data})
    
    await log_audit(
        db, "update", "enrollment", enrollment_id,
        current_user["user_id"],
        old_values={k: enrollment.get(k) for k in update_data.keys()},
        new_values=update_data
    )
    
    updated = await db.enrollments.find_one({"id": enrollment_id}, {"_id": 0})
    return updated


@router.delete("/enrollments/{enrollment_id}")
async def unenroll_user(
    enrollment_id: str,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Dar de baja matriculación"""
    enrollment = await db.enrollments.find_one({"id": enrollment_id})
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matriculación no encontrada"
        )
    
    await db.enrollments.delete_one({"id": enrollment_id})
    
    await log_audit(
        db, "unenroll", "enrollment", enrollment_id,
        current_user["user_id"],
        details={
            "course_id": enrollment.get("course_id"),
            "user_id": enrollment.get("user_id")
        }
    )
    
    return {"message": "Matriculación eliminada"}


@router.post("/courses/{course_id}/enrollments/bulk")
async def bulk_enroll(
    course_id: str,
    user_ids: List[str],
    role: EnrollmentRole = EnrollmentRole.STUDENT,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Matricular múltiples usuarios"""
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    enrolled = 0
    skipped = 0
    
    for user_id in user_ids:
        # Check user exists
        user = await db.users.find_one({"id": user_id})
        if not user:
            skipped += 1
            continue
        
        # Check if already enrolled
        existing = await db.enrollments.find_one({
            "course_id": course_id,
            "user_id": user_id
        })
        if existing:
            skipped += 1
            continue
        
        enrollment = Enrollment(
            course_id=course_id,
            user_id=user_id,
            role=role,
            enrolled_by=current_user["user_id"]
        )
        
        await db.enrollments.insert_one(enrollment.model_dump())
        enrolled += 1
        
        await log_audit(
            db, "bulk_enroll", "enrollment", enrollment.id,
            current_user["user_id"]
        )
    
    return {
        "message": f"{enrolled} usuarios matriculados, {skipped} omitidos",
        "enrolled": enrolled,
        "skipped": skipped
    }


# Self-enrollment methods
@router.get("/courses/{course_id}/enrollment-methods")
async def get_enrollment_methods(
    course_id: str,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Obtener métodos de matriculación del curso"""
    methods = await db.enrollment_methods.find(
        {"course_id": course_id},
        {"_id": 0}
    ).to_list(10)
    
    return methods


@router.post("/courses/{course_id}/enrollment-methods")
async def create_enrollment_method(
    course_id: str,
    method_type: str,  # "self", "code", "link"
    enrollment_code: Optional[str] = None,
    role: EnrollmentRole = EnrollmentRole.STUDENT,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Crear método de auto-matriculación"""
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )
    
    method = {
        "id": str(uuid.uuid4()),
        "course_id": course_id,
        "type": method_type,
        "code": enrollment_code or str(uuid.uuid4())[:8].upper(),
        "role": role.value,
        "enabled": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.enrollment_methods.insert_one(method)
    
    return method


@router.post("/enroll/code")
async def self_enroll_with_code(
    code: str,
    current_user: dict = Depends(get_current_user)
):
    """Auto-matriculación con código"""
    method = await db.enrollment_methods.find_one({
        "code": code,
        "enabled": True
    })
    
    if not method:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de matriculación inválido"
        )
    
    # Check if already enrolled
    existing = await db.enrollments.find_one({
        "course_id": method["course_id"],
        "user_id": current_user["user_id"]
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya estás matriculado en este curso"
        )
    
    enrollment = Enrollment(
        course_id=method["course_id"],
        user_id=current_user["user_id"],
        role=EnrollmentRole(method.get("role", "student")),
        enrolled_by=current_user["user_id"]
    )
    
    await db.enrollments.insert_one(enrollment.model_dump())
    
    return {"message": "Matriculación exitosa", "enrollment_id": enrollment.id}


# My enrollments (for students)
@router.get("/my-enrollments", response_model=List[dict])
async def get_my_enrollments(
    current_user: dict = Depends(get_current_user)
):
    """Obtener mis matriculaciones con datos del curso"""
    enrollments = await db.enrollments.find(
        {"user_id": current_user["user_id"], "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with course data
    for enrollment in enrollments:
        course = await db.courses.find_one(
            {"id": enrollment["course_id"]},
            {"_id": 0, "fullname": 1, "shortname": 1, "cover_image": 1, "status": 1}
        )
        if course:
            enrollment["course"] = course
    
    return enrollments
