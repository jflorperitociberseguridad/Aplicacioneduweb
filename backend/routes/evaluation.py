from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from utils.auth import get_current_user, require_roles
from utils.audit import log_audit

router = APIRouter(tags=["Evaluación"])

db = None

def init_router(database):
    global db
    db = database


# ============== GRADEBOOK ==============

@router.get("/courses/{course_id}/gradebook")
async def get_gradebook(
    course_id: str,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Obtener libro de calificaciones del curso"""
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    # Get enrollments (students)
    enrollments = await db.enrollments.find(
        {"course_id": course_id, "role": "student"},
        {"_id": 0}
    ).to_list(500)
    
    # Get gradable items (assignments, quizzes)
    items = await db.course_items.find(
        {"course_id": course_id, "item_type": {"$in": ["assignment", "quiz"]}},
        {"_id": 0}
    ).to_list(100)
    
    # Get grades
    grades = await db.grades.find(
        {"course_id": course_id},
        {"_id": 0}
    ).to_list(5000)
    
    # Build gradebook matrix
    students = []
    for enrollment in enrollments:
        user = await db.users.find_one(
            {"id": enrollment["user_id"]},
            {"_id": 0, "first_name": 1, "last_name": 1, "email": 1}
        )
        if user:
            student_grades = {}
            for item in items:
                grade = next(
                    (g for g in grades if g["user_id"] == enrollment["user_id"] and g["item_id"] == item["id"]),
                    None
                )
                student_grades[item["id"]] = {
                    "grade": grade.get("grade") if grade else None,
                    "feedback": grade.get("feedback") if grade else None,
                    "graded_at": grade.get("graded_at") if grade else None
                }
            
            # Calculate average
            graded_items = [g for g in student_grades.values() if g["grade"] is not None]
            avg = sum(g["grade"] for g in graded_items) / len(graded_items) if graded_items else None
            
            students.append({
                "user_id": enrollment["user_id"],
                "user": user,
                "grades": student_grades,
                "average": round(avg, 2) if avg else None,
                "progress": enrollment.get("progress_percentage", 0)
            })
    
    return {
        "course": {"id": course_id, "fullname": course["fullname"]},
        "items": items,
        "students": students,
        "gradebook_settings": course.get("gradebook", {})
    }


@router.post("/grades")
async def set_grade(
    user_id: str,
    item_id: str,
    course_id: str,
    grade: float,
    feedback: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Establecer calificación"""
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.grades.find_one({
        "user_id": user_id,
        "item_id": item_id,
        "course_id": course_id
    })
    
    if existing:
        await db.grades.update_one(
            {"id": existing["id"]},
            {"$set": {
                "grade": grade,
                "feedback": feedback,
                "graded_by": current_user["user_id"],
                "graded_at": now
            }}
        )
        grade_id = existing["id"]
    else:
        grade_id = str(uuid.uuid4())
        await db.grades.insert_one({
            "id": grade_id,
            "user_id": user_id,
            "item_id": item_id,
            "course_id": course_id,
            "grade": grade,
            "feedback": feedback,
            "graded_by": current_user["user_id"],
            "graded_at": now
        })
    
    return {"message": "Calificación guardada", "grade_id": grade_id}


@router.get("/courses/{course_id}/my-grades")
async def get_my_grades(
    course_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener mis calificaciones en el curso"""
    user_id = current_user["user_id"]
    
    grades = await db.grades.find(
        {"course_id": course_id, "user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with item info
    for grade in grades:
        item = await db.course_items.find_one(
            {"id": grade["item_id"]},
            {"_id": 0, "title": 1, "item_type": 1}
        )
        if item:
            grade["item"] = item
    
    return grades


# ============== QUESTION BANK ==============

@router.get("/courses/{course_id}/question-categories")
async def list_question_categories(
    course_id: str,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Listar categorías de preguntas"""
    categories = await db.question_categories.find(
        {"course_id": course_id},
        {"_id": 0}
    ).to_list(100)
    return categories


@router.post("/courses/{course_id}/question-categories")
async def create_question_category(
    course_id: str,
    name: str,
    description: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Crear categoría de preguntas"""
    category = {
        "id": str(uuid.uuid4()),
        "course_id": course_id,
        "name": name,
        "description": description,
        "parent_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.question_categories.insert_one(category)
    return category


@router.get("/courses/{course_id}/questions")
async def list_questions(
    course_id: str,
    category_id: Optional[str] = None,
    question_type: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Listar preguntas del banco"""
    query = {"course_id": course_id}
    if category_id:
        query["category_id"] = category_id
    if question_type:
        query["type"] = question_type
    
    questions = await db.questions.find(query, {"_id": 0}).to_list(500)
    return questions


@router.post("/courses/{course_id}/questions")
async def create_question(
    course_id: str,
    category_id: str,
    question_type: str,  # multiple_choice, true_false, short_answer, essay
    question_text: str,
    points: float = 10,
    options: Optional[List[dict]] = None,
    correct_answer: Optional[str] = None,
    feedback: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Crear pregunta en el banco"""
    question = {
        "id": str(uuid.uuid4()),
        "course_id": course_id,
        "category_id": category_id,
        "type": question_type,
        "question_text": question_text,
        "points": points,
        "options": options or [],
        "correct_answer": correct_answer,
        "feedback": feedback,
        "created_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.questions.insert_one(question)
    return question


@router.patch("/questions/{question_id}")
async def update_question(
    question_id: str,
    question_text: Optional[str] = None,
    points: Optional[float] = None,
    options: Optional[List[dict]] = None,
    correct_answer: Optional[str] = None,
    feedback: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "teacher", "editor"]))
):
    """Actualizar pregunta"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if question_text:
        update_data["question_text"] = question_text
    if points is not None:
        update_data["points"] = points
    if options is not None:
        update_data["options"] = options
    if correct_answer is not None:
        update_data["correct_answer"] = correct_answer
    if feedback is not None:
        update_data["feedback"] = feedback
    
    await db.questions.update_one({"id": question_id}, {"$set": update_data})
    return {"message": "Pregunta actualizada"}


@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: str,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Eliminar pregunta"""
    await db.questions.delete_one({"id": question_id})
    return {"message": "Pregunta eliminada"}


# ============== QUIZZES ==============

@router.get("/courses/{course_id}/quizzes")
async def list_quizzes(
    course_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Listar cuestionarios del curso"""
    quizzes = await db.quizzes.find(
        {"course_id": course_id},
        {"_id": 0}
    ).to_list(50)
    return quizzes


@router.get("/quizzes/{quiz_id}")
async def get_quiz(
    quiz_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener detalle del cuestionario"""
    quiz = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    
    # Get questions
    questions = await db.questions.find(
        {"id": {"$in": quiz.get("question_ids", [])}},
        {"_id": 0}
    ).to_list(100)
    
    quiz["questions"] = questions
    return quiz


@router.post("/quizzes/{quiz_id}/attempts")
async def start_quiz_attempt(
    quiz_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Iniciar intento de cuestionario"""
    user_id = current_user["user_id"]
    
    quiz = await db.quizzes.find_one({"id": quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")
    
    # Check max attempts
    attempt_count = await db.quiz_attempts.count_documents({
        "quiz_id": quiz_id,
        "user_id": user_id
    })
    
    if quiz.get("max_attempts") and attempt_count >= quiz["max_attempts"]:
        raise HTTPException(
            status_code=400,
            detail=f"Has alcanzado el máximo de {quiz['max_attempts']} intentos"
        )
    
    attempt = {
        "id": str(uuid.uuid4()),
        "quiz_id": quiz_id,
        "user_id": user_id,
        "course_id": quiz["course_id"],
        "attempt_number": attempt_count + 1,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": None,
        "answers": {},
        "score": None,
        "status": "in_progress"
    }
    
    await db.quiz_attempts.insert_one(attempt)
    return attempt


@router.post("/quiz-attempts/{attempt_id}/submit")
async def submit_quiz_attempt(
    attempt_id: str,
    answers: dict,  # {question_id: answer}
    current_user: dict = Depends(get_current_user)
):
    """Enviar respuestas del cuestionario"""
    attempt = await db.quiz_attempts.find_one({"id": attempt_id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Intento no encontrado")
    
    if attempt["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    if attempt["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Este intento ya fue enviado")
    
    quiz = await db.quizzes.find_one({"id": attempt["quiz_id"]})
    questions = await db.questions.find(
        {"id": {"$in": quiz.get("question_ids", [])}},
        {"_id": 0}
    ).to_list(100)
    
    # Calculate score
    total_points = sum(q.get("points", 10) for q in questions)
    earned_points = 0
    
    for q in questions:
        user_answer = answers.get(q["id"])
        if q["type"] == "multiple_choice":
            correct = next((o for o in q.get("options", []) if o.get("correct")), None)
            if correct and user_answer == correct.get("id"):
                earned_points += q.get("points", 10)
        elif q["type"] == "true_false":
            if str(user_answer).lower() == str(q.get("correct_answer", "")).lower():
                earned_points += q.get("points", 10)
    
    score = (earned_points / total_points * 100) if total_points > 0 else 0
    
    await db.quiz_attempts.update_one(
        {"id": attempt_id},
        {"$set": {
            "answers": answers,
            "score": round(score, 2),
            "earned_points": earned_points,
            "total_points": total_points,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        }}
    )
    
    # Save grade
    if quiz.get("item_id"):
        await db.grades.update_one(
            {
                "user_id": current_user["user_id"],
                "item_id": quiz["item_id"],
                "course_id": quiz["course_id"]
            },
            {"$set": {
                "id": str(uuid.uuid4()),
                "grade": score,
                "graded_at": datetime.now(timezone.utc).isoformat(),
                "graded_by": "system"
            }},
            upsert=True
        )
    
    return {
        "score": round(score, 2),
        "earned_points": earned_points,
        "total_points": total_points,
        "passed": score >= quiz.get("passing_grade", 60)
    }


@router.get("/quiz-attempts/{attempt_id}")
async def get_quiz_attempt(
    attempt_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener detalle del intento"""
    attempt = await db.quiz_attempts.find_one({"id": attempt_id}, {"_id": 0})
    if not attempt:
        raise HTTPException(status_code=404, detail="Intento no encontrado")
    
    # Only owner or teacher can view
    if attempt["user_id"] != current_user["user_id"] and current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    return attempt


# ============== ASSIGNMENTS ==============

@router.get("/courses/{course_id}/assignments")
async def list_assignments(
    course_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Listar tareas del curso"""
    assignments = await db.assignments.find(
        {"course_id": course_id},
        {"_id": 0}
    ).to_list(50)
    return assignments


@router.get("/assignments/{assignment_id}")
async def get_assignment(
    assignment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener detalle de la tarea"""
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return assignment


@router.post("/assignments/{assignment_id}/submissions")
async def submit_assignment(
    assignment_id: str,
    content: Optional[str] = None,
    file_url: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Enviar entrega de tarea"""
    assignment = await db.assignments.find_one({"id": assignment_id})
    if not assignment:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    user_id = current_user["user_id"]
    
    # Check existing submissions
    existing = await db.submissions.count_documents({
        "assignment_id": assignment_id,
        "user_id": user_id
    })
    
    max_submissions = assignment.get("max_submissions", 1)
    if existing >= max_submissions:
        raise HTTPException(
            status_code=400,
            detail=f"Máximo de {max_submissions} entregas alcanzado"
        )
    
    submission = {
        "id": str(uuid.uuid4()),
        "assignment_id": assignment_id,
        "user_id": user_id,
        "course_id": assignment["course_id"],
        "submission_number": existing + 1,
        "content": content,
        "file_url": file_url,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "status": "submitted",
        "grade": None,
        "feedback": None
    }
    
    await db.submissions.insert_one(submission)
    return submission


@router.get("/assignments/{assignment_id}/submissions")
async def list_submissions(
    assignment_id: str,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Listar entregas de una tarea (profesor)"""
    submissions = await db.submissions.find(
        {"assignment_id": assignment_id},
        {"_id": 0}
    ).to_list(500)
    
    # Enrich with user info
    for sub in submissions:
        user = await db.users.find_one(
            {"id": sub["user_id"]},
            {"_id": 0, "first_name": 1, "last_name": 1, "email": 1}
        )
        sub["user"] = user
    
    return submissions


@router.post("/submissions/{submission_id}/grade")
async def grade_submission(
    submission_id: str,
    grade: float,
    feedback: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "teacher"]))
):
    """Calificar entrega"""
    submission = await db.submissions.find_one({"id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "grade": grade,
            "feedback": feedback,
            "graded_by": current_user["user_id"],
            "graded_at": now,
            "status": "graded"
        }}
    )
    
    # Update grades collection
    assignment = await db.assignments.find_one({"id": submission["assignment_id"]})
    if assignment and assignment.get("item_id"):
        await db.grades.update_one(
            {
                "user_id": submission["user_id"],
                "item_id": assignment["item_id"],
                "course_id": submission["course_id"]
            },
            {"$set": {
                "id": str(uuid.uuid4()),
                "grade": grade,
                "feedback": feedback,
                "graded_by": current_user["user_id"],
                "graded_at": now
            }},
            upsert=True
        )
    
    return {"message": "Entrega calificada"}
