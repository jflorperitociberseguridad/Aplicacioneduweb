#!/usr/bin/env python3
"""
Seed script para crear datos demo del curso "Ciberseguridad con IA"
Ejecutar: python scripts/seed_ciberseguridad_ia.py
"""

import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from passlib.context import CryptContext

# Load environment
load_dotenv(Path(__file__).parent.parent / 'backend' / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_PASSWORD = "Demo2024!"

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

async def seed_database():
    """Main seed function"""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Iniciando seed de datos...")
    print(f"   Base de datos: {db_name}")
    
    # Clear existing data (optional - comment out in production)
    collections = ['users', 'course_categories', 'courses', 'course_sections', 
                   'course_items', 'enrollments', 'enrollment_methods',
                   'questions', 'question_categories', 'quizzes', 'assignments',
                   'events', 'message_threads', 'messages', 'completion_state']
    
    for col in collections:
        await db[col].delete_many({})
    print("   ✓ Colecciones limpiadas")
    
    # =========================================================================
    # 1. CATEGORIES
    # =========================================================================
    categories = [
        {
            "id": "cat-tecnologia",
            "name": "Tecnología",
            "description": "Cursos de tecnología e informática",
            "parent_id": None,
            "position": 0,
            "visible": True,
            "course_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "cat-seguridad",
            "name": "Ciberseguridad",
            "description": "Cursos de seguridad informática y protección de datos",
            "parent_id": "cat-tecnologia",
            "position": 0,
            "visible": True,
            "course_count": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "cat-ia",
            "name": "Inteligencia Artificial",
            "description": "Cursos de IA y Machine Learning",
            "parent_id": "cat-tecnologia",
            "position": 1,
            "visible": True,
            "course_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "cat-programacion",
            "name": "Programación",
            "description": "Cursos de desarrollo de software",
            "parent_id": "cat-tecnologia",
            "position": 2,
            "visible": True,
            "course_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "cat-negocios",
            "name": "Negocios",
            "description": "Cursos de gestión empresarial",
            "parent_id": None,
            "position": 1,
            "visible": True,
            "course_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.course_categories.insert_many(categories)
    print("   ✓ Categorías creadas")
    
    # =========================================================================
    # 2. USERS
    # =========================================================================
    users = [
        {
            "id": "user-admin",
            "email": "admin@aulavirtual.com",
            "first_name": "Administrador",
            "last_name": "Principal",
            "role": "admin",
            "status": "active",
            "language": "es",
            "timezone": "Europe/Madrid",
            "avatar_url": None,
            "phone": "+34 600 000 001",
            "preferences": {
                "notifications_email": True,
                "notifications_push": True,
                "notifications_inapp": True,
                "digest_frequency": "daily",
                "privacy_show_email": False,
                "privacy_show_activity": True,
                "accessibility_high_contrast": False,
                "accessibility_large_text": False
            },
            "gdpr_consent": True,
            "gdpr_consent_date": datetime.now(timezone.utc).isoformat(),
            "hashed_password": hash_password(DEMO_PASSWORD),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        },
        {
            "id": "user-teacher",
            "email": "profesor@aulavirtual.com",
            "first_name": "María",
            "last_name": "García López",
            "role": "teacher",
            "status": "active",
            "language": "es",
            "timezone": "Europe/Madrid",
            "avatar_url": None,
            "phone": "+34 600 000 002",
            "preferences": {
                "notifications_email": True,
                "notifications_push": True,
                "notifications_inapp": True,
                "digest_frequency": "daily",
                "privacy_show_email": True,
                "privacy_show_activity": True,
                "accessibility_high_contrast": False,
                "accessibility_large_text": False
            },
            "gdpr_consent": True,
            "gdpr_consent_date": datetime.now(timezone.utc).isoformat(),
            "hashed_password": hash_password(DEMO_PASSWORD),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        },
        {
            "id": "user-editor",
            "email": "editor@aulavirtual.com",
            "first_name": "Carlos",
            "last_name": "Martínez Ruiz",
            "role": "editor",
            "status": "active",
            "language": "es",
            "timezone": "Europe/Madrid",
            "avatar_url": None,
            "phone": "+34 600 000 003",
            "preferences": {
                "notifications_email": True,
                "notifications_push": False,
                "notifications_inapp": True,
                "digest_frequency": "weekly",
                "privacy_show_email": False,
                "privacy_show_activity": True,
                "accessibility_high_contrast": False,
                "accessibility_large_text": False
            },
            "gdpr_consent": True,
            "gdpr_consent_date": datetime.now(timezone.utc).isoformat(),
            "hashed_password": hash_password(DEMO_PASSWORD),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        },
        {
            "id": "user-student1",
            "email": "estudiante1@aulavirtual.com",
            "first_name": "Ana",
            "last_name": "Fernández Torres",
            "role": "student",
            "status": "active",
            "language": "es",
            "timezone": "Europe/Madrid",
            "avatar_url": None,
            "phone": "+34 600 000 004",
            "preferences": {
                "notifications_email": True,
                "notifications_push": True,
                "notifications_inapp": True,
                "digest_frequency": "daily",
                "privacy_show_email": False,
                "privacy_show_activity": False,
                "accessibility_high_contrast": False,
                "accessibility_large_text": False
            },
            "gdpr_consent": True,
            "gdpr_consent_date": datetime.now(timezone.utc).isoformat(),
            "hashed_password": hash_password(DEMO_PASSWORD),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        },
        {
            "id": "user-student2",
            "email": "estudiante2@aulavirtual.com",
            "first_name": "Pedro",
            "last_name": "Sánchez Gómez",
            "role": "student",
            "status": "active",
            "language": "es",
            "timezone": "Europe/Madrid",
            "avatar_url": None,
            "phone": "+34 600 000 005",
            "preferences": {
                "notifications_email": False,
                "notifications_push": True,
                "notifications_inapp": True,
                "digest_frequency": "weekly",
                "privacy_show_email": False,
                "privacy_show_activity": True,
                "accessibility_high_contrast": False,
                "accessibility_large_text": False
            },
            "gdpr_consent": True,
            "gdpr_consent_date": datetime.now(timezone.utc).isoformat(),
            "hashed_password": hash_password(DEMO_PASSWORD),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        }
    ]
    
    await db.users.insert_many(users)
    print("   ✓ Usuarios creados")
    
    # =========================================================================
    # 3. COURSE: Ciberseguridad con IA
    # =========================================================================
    course_id = "course-ciber-ia-101"
    
    course = {
        "id": course_id,
        "fullname": "Ciberseguridad con Inteligencia Artificial",
        "shortname": "CIBER-IA-101",
        "category_id": "cat-seguridad",
        "summary": """<p>Bienvenido al curso de <strong>Ciberseguridad con Inteligencia Artificial</strong>.</p>
<p>En este curso aprenderás a utilizar técnicas de IA para detectar y prevenir amenazas de seguridad, 
analizar vulnerabilidades y proteger sistemas informáticos.</p>
<h4>Objetivos del curso:</h4>
<ul>
<li>Comprender los fundamentos de la ciberseguridad moderna</li>
<li>Aplicar técnicas de Machine Learning para detección de amenazas</li>
<li>Implementar sistemas de respuesta automatizada</li>
<li>Analizar casos reales de ciberataques</li>
</ul>""",
        "cover_image": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800",
        "cover_image_alt": "Ciberseguridad e Inteligencia Artificial",
        "tags": ["ciberseguridad", "ia", "machine-learning", "seguridad", "redes"],
        "language": "es",
        "format": "topics",
        "num_sections": 5,
        "start_date": datetime.now(timezone.utc).isoformat(),
        "end_date": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
        "visible": True,
        "status": "published",
        "completion": {
            "enabled": True,
            "method": "automatic",
            "min_percentage": 80.0,
            "min_grade": None
        },
        "gradebook": {
            "scale": "0-100",
            "passing_grade": 60.0
        },
        "ai": {
            "enabled": True,
            "default_language": "es",
            "require_teacher_approval": True,
            "block_publish_on_failed_check": False
        },
        "files": {
            "max_file_size_mb": 50,
            "allowed_types": ["pdf", "doc", "docx", "ppt", "pptx", "jpg", "png", "mp4", "zip"],
            "total_quota_mb": 500
        },
        "created_by": "user-teacher",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_modified_by": "user-teacher"
    }
    
    await db.courses.insert_one(course)
    print("   ✓ Curso creado")
    
    # =========================================================================
    # 4. SECTIONS
    # =========================================================================
    sections = [
        {
            "id": "section-0",
            "course_id": course_id,
            "title": "Introducción",
            "summary": "Bienvenida al curso y recursos generales",
            "position": 0,
            "visible": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "section-1",
            "course_id": course_id,
            "title": "Tema 1: Fundamentos de Ciberseguridad",
            "summary": "Conceptos básicos y panorama actual de la ciberseguridad",
            "position": 1,
            "visible": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "section-2",
            "course_id": course_id,
            "title": "Tema 2: Machine Learning para Seguridad",
            "summary": "Introducción a técnicas de ML aplicadas a la detección de amenazas",
            "position": 2,
            "visible": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "section-3",
            "course_id": course_id,
            "title": "Tema 3: Detección de Anomalías",
            "summary": "Técnicas avanzadas para identificar comportamientos maliciosos",
            "position": 3,
            "visible": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "section-4",
            "course_id": course_id,
            "title": "Tema 4: Respuesta Automatizada",
            "summary": "Implementación de sistemas SOAR y respuesta a incidentes",
            "position": 4,
            "visible": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "section-5",
            "course_id": course_id,
            "title": "Tema 5: Casos Prácticos y Proyecto Final",
            "summary": "Análisis de casos reales y proyecto integrador",
            "position": 5,
            "visible": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.course_sections.insert_many(sections)
    print("   ✓ Secciones creadas")
    
    # =========================================================================
    # 5. ITEMS (Resources/Activities)
    # =========================================================================
    items = [
        # Section 0 - Introduction
        {
            "id": "item-welcome-page",
            "section_id": "section-0",
            "course_id": course_id,
            "title": "Bienvenida al curso",
            "item_type": "page",
            "description": "Mensaje de bienvenida y orientación inicial",
            "position": 0,
            "visible": True,
            "content": {
                "html": """<h2>¡Bienvenido/a al curso de Ciberseguridad con IA!</h2>
<p>Soy la profesora María García y seré tu guía en este emocionante viaje por el mundo de la ciberseguridad aplicada con inteligencia artificial.</p>
<h3>¿Qué aprenderás?</h3>
<ul>
<li>Detectar amenazas usando algoritmos de ML</li>
<li>Analizar logs y tráfico de red</li>
<li>Implementar respuestas automatizadas</li>
</ul>
<p><strong>Duración estimada:</strong> 12 semanas (3 meses)</p>"""
            },
            "availability": {"start_date": None, "end_date": None, "require_completion": [], "require_grade": None, "require_group": None},
            "completion": {"type": "view", "min_grade": None},
            "ai": {"provenance": "human", "generated_from_job_id": None, "last_improved_job_id": None},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "item-syllabus",
            "section_id": "section-0",
            "course_id": course_id,
            "title": "Programa del curso (PDF)",
            "item_type": "file",
            "description": "Descarga el programa completo del curso",
            "position": 1,
            "visible": True,
            "content": {
                "file_url": "/files/syllabus-ciber-ia.pdf",
                "file_name": "syllabus-ciber-ia.pdf",
                "file_size": 245000,
                "mime_type": "application/pdf"
            },
            "availability": {"start_date": None, "end_date": None, "require_completion": [], "require_grade": None, "require_group": None},
            "completion": {"type": "view", "min_grade": None},
            "ai": {"provenance": "human", "generated_from_job_id": None, "last_improved_job_id": None},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "item-intro-forum",
            "section_id": "section-0",
            "course_id": course_id,
            "title": "Foro de presentaciones",
            "item_type": "forum",
            "description": "Preséntate a tus compañeros",
            "position": 2,
            "visible": True,
            "content": {
                "forum_type": "general",
                "allow_attachments": True
            },
            "availability": {"start_date": None, "end_date": None, "require_completion": [], "require_grade": None, "require_group": None},
            "completion": {"type": "submit", "min_grade": None},
            "ai": {"provenance": "human", "generated_from_job_id": None, "last_improved_job_id": None},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        
        # Section 1 - Fundamentals
        {
            "id": "item-t1-intro",
            "section_id": "section-1",
            "course_id": course_id,
            "title": "1.1 Introducción a la Ciberseguridad",
            "item_type": "page",
            "description": "Conceptos fundamentales y evolución histórica",
            "position": 0,
            "visible": True,
            "content": {
                "html": """<h2>Introducción a la Ciberseguridad</h2>
<p>La ciberseguridad es el conjunto de prácticas diseñadas para proteger sistemas, redes y programas de ataques digitales.</p>
<h3>Pilares de la seguridad (CIA):</h3>
<ul>
<li><strong>Confidencialidad:</strong> Proteger la información de accesos no autorizados</li>
<li><strong>Integridad:</strong> Garantizar que los datos no sean alterados</li>
<li><strong>Disponibilidad:</strong> Asegurar el acceso cuando se necesite</li>
</ul>"""
            },
            "availability": {"start_date": None, "end_date": None, "require_completion": [], "require_grade": None, "require_group": None},
            "completion": {"type": "view", "min_grade": None},
            "ai": {"provenance": "human", "generated_from_job_id": None, "last_improved_job_id": None},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "item-t1-video",
            "section_id": "section-1",
            "course_id": course_id,
            "title": "1.2 Video: Panorama actual de amenazas",
            "item_type": "url",
            "description": "Video explicativo sobre las amenazas más comunes",
            "position": 1,
            "visible": True,
            "content": {
                "url": "https://www.youtube.com/watch?v=example",
                "embed": True
            },
            "availability": {"start_date": None, "end_date": None, "require_completion": [], "require_grade": None, "require_group": None},
            "completion": {"type": "view", "min_grade": None},
            "ai": {"provenance": "human", "generated_from_job_id": None, "last_improved_job_id": None},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "item-t1-quiz",
            "section_id": "section-1",
            "course_id": course_id,
            "title": "Quiz: Fundamentos de Ciberseguridad",
            "item_type": "quiz",
            "description": "Evalúa tu comprensión de los conceptos básicos",
            "position": 2,
            "visible": True,
            "content": {
                "quiz_id": "quiz-t1",
                "time_limit_minutes": 30,
                "max_attempts": 3,
                "shuffle_questions": True
            },
            "availability": {"start_date": None, "end_date": None, "require_completion": ["item-t1-intro"], "require_grade": None, "require_group": None},
            "completion": {"type": "grade", "min_grade": 60.0},
            "ai": {"provenance": "human", "generated_from_job_id": None, "last_improved_job_id": None},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        
        # Section 2 - ML for Security
        {
            "id": "item-t2-intro",
            "section_id": "section-2",
            "course_id": course_id,
            "title": "2.1 ML aplicado a seguridad",
            "item_type": "page",
            "description": "Fundamentos de Machine Learning para ciberseguridad",
            "position": 0,
            "visible": True,
            "content": {
                "html": """<h2>Machine Learning para Ciberseguridad</h2>
<p>El Machine Learning permite crear sistemas que aprenden de los datos para detectar patrones maliciosos.</p>
<h3>Tipos de aprendizaje:</h3>
<ul>
<li><strong>Supervisado:</strong> Clasificación de malware conocido</li>
<li><strong>No supervisado:</strong> Detección de anomalías</li>
<li><strong>Refuerzo:</strong> Sistemas adaptativos de defensa</li>
</ul>"""
            },
            "availability": {"start_date": None, "end_date": None, "require_completion": [], "require_grade": None, "require_group": None},
            "completion": {"type": "view", "min_grade": None},
            "ai": {"provenance": "human", "generated_from_job_id": None, "last_improved_job_id": None},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "item-t2-feedback",
            "section_id": "section-2",
            "course_id": course_id,
            "title": "Encuesta: Tu experiencia con ML",
            "item_type": "feedback",
            "description": "Cuéntanos tu nivel de experiencia previo",
            "position": 1,
            "visible": True,
            "content": {
                "feedback_id": "feedback-ml-experience",
                "anonymous": True
            },
            "availability": {"start_date": None, "end_date": None, "require_completion": [], "require_grade": None, "require_group": None},
            "completion": {"type": "submit", "min_grade": None},
            "ai": {"provenance": "human", "generated_from_job_id": None, "last_improved_job_id": None},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        
        # Section 5 - Final Project
        {
            "id": "item-t5-assignment",
            "section_id": "section-5",
            "course_id": course_id,
            "title": "Proyecto Final: Sistema de Detección",
            "item_type": "assignment",
            "description": "Implementa un sistema de detección de amenazas usando ML",
            "position": 0,
            "visible": True,
            "content": {
                "assignment_id": "assignment-final",
                "max_file_size_mb": 50,
                "allowed_file_types": ["pdf", "zip", "py", "ipynb"],
                "max_submissions": 3
            },
            "availability": {"start_date": None, "end_date": (datetime.now(timezone.utc) + timedelta(days=85)).isoformat(), "require_completion": [], "require_grade": None, "require_group": None},
            "completion": {"type": "grade", "min_grade": 60.0},
            "ai": {"provenance": "human", "generated_from_job_id": None, "last_improved_job_id": None},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.course_items.insert_many(items)
    print("   ✓ Items/recursos creados")
    
    # =========================================================================
    # 6. QUESTION BANK
    # =========================================================================
    question_categories = [
        {
            "id": "qcat-fundamentos",
            "course_id": course_id,
            "name": "Fundamentos de Ciberseguridad",
            "description": "Preguntas sobre conceptos básicos",
            "parent_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    questions = [
        {
            "id": "q1-cia",
            "category_id": "qcat-fundamentos",
            "course_id": course_id,
            "type": "multiple_choice",
            "question_text": "¿Cuáles son los tres pilares fundamentales de la seguridad de la información (CIA)?",
            "options": [
                {"id": "a", "text": "Confidencialidad, Integridad, Disponibilidad", "correct": True},
                {"id": "b", "text": "Control, Implementación, Auditoría", "correct": False},
                {"id": "c", "text": "Cifrado, Identificación, Autorización", "correct": False},
                {"id": "d", "text": "Comunicación, Infraestructura, Aplicaciones", "correct": False}
            ],
            "points": 10,
            "feedback": "CIA significa Confidentiality, Integrity, Availability.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "q2-malware",
            "category_id": "qcat-fundamentos",
            "course_id": course_id,
            "type": "multiple_choice",
            "question_text": "¿Qué tipo de malware se propaga automáticamente a través de redes?",
            "options": [
                {"id": "a", "text": "Virus", "correct": False},
                {"id": "b", "text": "Gusano", "correct": True},
                {"id": "c", "text": "Troyano", "correct": False},
                {"id": "d", "text": "Spyware", "correct": False}
            ],
            "points": 10,
            "feedback": "Los gusanos (worms) se replican y propagan automáticamente sin necesidad de acción del usuario.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "q3-phishing",
            "category_id": "qcat-fundamentos",
            "course_id": course_id,
            "type": "true_false",
            "question_text": "El phishing es un tipo de ataque de ingeniería social.",
            "correct_answer": True,
            "points": 5,
            "feedback": "El phishing utiliza técnicas de manipulación psicológica para engañar a las víctimas.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.question_categories.insert_many(question_categories)
    await db.questions.insert_many(questions)
    print("   ✓ Banco de preguntas creado")
    
    # =========================================================================
    # 7. QUIZ
    # =========================================================================
    quiz = {
        "id": "quiz-t1",
        "item_id": "item-t1-quiz",
        "course_id": course_id,
        "name": "Quiz: Fundamentos de Ciberseguridad",
        "description": "Evalúa tu comprensión de los conceptos básicos",
        "question_ids": ["q1-cia", "q2-malware", "q3-phishing"],
        "time_limit_minutes": 30,
        "max_attempts": 3,
        "passing_grade": 60.0,
        "shuffle_questions": True,
        "shuffle_options": True,
        "show_feedback": "after_attempt",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.quizzes.insert_one(quiz)
    print("   ✓ Quiz creado")
    
    # =========================================================================
    # 8. ASSIGNMENT
    # =========================================================================
    assignment = {
        "id": "assignment-final",
        "item_id": "item-t5-assignment",
        "course_id": course_id,
        "name": "Proyecto Final: Sistema de Detección",
        "description": """<p>Desarrolla un sistema de detección de amenazas utilizando técnicas de Machine Learning.</p>
<h4>Requisitos:</h4>
<ul>
<li>Dataset de entrenamiento documentado</li>
<li>Modelo de ML implementado (Python)</li>
<li>Métricas de evaluación (precisión, recall, F1)</li>
<li>Informe técnico (PDF)</li>
</ul>""",
        "due_date": (datetime.now(timezone.utc) + timedelta(days=85)).isoformat(),
        "max_grade": 100,
        "allow_late": True,
        "late_penalty_percent": 10,
        "rubric_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.assignments.insert_one(assignment)
    print("   ✓ Tarea creada")
    
    # =========================================================================
    # 9. ENROLLMENTS
    # =========================================================================
    enrollments = [
        {
            "id": "enroll-teacher",
            "course_id": course_id,
            "user_id": "user-teacher",
            "role": "teacher",
            "status": "active",
            "enrolled_at": datetime.now(timezone.utc).isoformat(),
            "enrolled_by": "user-admin",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "progress_percentage": 0.0
        },
        {
            "id": "enroll-editor",
            "course_id": course_id,
            "user_id": "user-editor",
            "role": "editor",
            "status": "active",
            "enrolled_at": datetime.now(timezone.utc).isoformat(),
            "enrolled_by": "user-admin",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "progress_percentage": 0.0
        },
        {
            "id": "enroll-student1",
            "course_id": course_id,
            "user_id": "user-student1",
            "role": "student",
            "status": "active",
            "enrolled_at": datetime.now(timezone.utc).isoformat(),
            "enrolled_by": "user-teacher",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "progress_percentage": 35.0
        },
        {
            "id": "enroll-student2",
            "course_id": course_id,
            "user_id": "user-student2",
            "role": "student",
            "status": "active",
            "enrolled_at": datetime.now(timezone.utc).isoformat(),
            "enrolled_by": "user-teacher",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "progress_percentage": 15.0
        }
    ]
    
    await db.enrollments.insert_many(enrollments)
    print("   ✓ Matriculaciones creadas")
    
    # =========================================================================
    # 10. EVENTS (Calendar)
    # =========================================================================
    events = [
        {
            "id": "event-inicio",
            "course_id": course_id,
            "title": "Inicio del curso",
            "description": "Fecha de inicio oficial del curso",
            "event_type": "course",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": None,
            "all_day": True,
            "created_by": "user-teacher",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "event-deadline",
            "course_id": course_id,
            "title": "Entrega Proyecto Final",
            "description": "Fecha límite para entregar el proyecto final",
            "event_type": "assignment",
            "related_item_id": "item-t5-assignment",
            "start_date": (datetime.now(timezone.utc) + timedelta(days=85)).isoformat(),
            "end_date": None,
            "all_day": True,
            "created_by": "user-teacher",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.events.insert_one(events[0])
    await db.events.insert_one(events[1])
    print("   ✓ Eventos creados")
    
    # =========================================================================
    # 11. MESSAGES (Announcement)
    # =========================================================================
    thread = {
        "id": "thread-welcome",
        "course_id": course_id,
        "subject": "¡Bienvenidos al curso!",
        "type": "announcement",
        "created_by": "user-teacher",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_message_at": datetime.now(timezone.utc).isoformat()
    }
    
    message = {
        "id": "msg-welcome",
        "thread_id": "thread-welcome",
        "sender_id": "user-teacher",
        "content": """¡Hola a todos!

Bienvenidos al curso de Ciberseguridad con Inteligencia Artificial.

Estoy muy emocionada de comenzar este viaje con vosotros. Durante las próximas semanas, exploraremos cómo la IA está revolucionando el campo de la ciberseguridad.

Por favor, preséntense en el foro de presentaciones y no duden en contactarme si tienen cualquier duda.

¡Mucho éxito!
María García""",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read_by": ["user-student1"]
    }
    
    await db.message_threads.insert_one(thread)
    await db.messages.insert_one(message)
    print("   ✓ Mensajes/anuncios creados")
    
    # =========================================================================
    # 12. COMPLETION STATE (for student1)
    # =========================================================================
    completion_states = [
        {
            "id": "comp-student1-welcome",
            "user_id": "user-student1",
            "course_id": course_id,
            "item_id": "item-welcome-page",
            "completed": True,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "completion_type": "view"
        },
        {
            "id": "comp-student1-intro",
            "user_id": "user-student1",
            "course_id": course_id,
            "item_id": "item-t1-intro",
            "completed": True,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "completion_type": "view"
        }
    ]
    
    await db.completion_state.insert_many(completion_states)
    print("   ✓ Estados de completitud creados")
    
    # =========================================================================
    # DONE
    # =========================================================================
    client.close()
    
    print("\n" + "="*60)
    print("✅ SEED COMPLETADO EXITOSAMENTE")
    print("="*60)
    print("\n📋 CREDENCIALES DE DEMO:")
    print("-"*60)
    print(f"   Contraseña común: {DEMO_PASSWORD}")
    print("-"*60)
    print("   👤 Admin:      admin@aulavirtual.com")
    print("   👩‍🏫 Profesora:  profesor@aulavirtual.com")
    print("   ✏️  Editor:     editor@aulavirtual.com")
    print("   👩‍🎓 Estudiante: estudiante1@aulavirtual.com")
    print("   👨‍🎓 Estudiante: estudiante2@aulavirtual.com")
    print("-"*60)
    print("\n📚 CURSO CREADO:")
    print(f"   Nombre: Ciberseguridad con Inteligencia Artificial")
    print(f"   Código: CIBER-IA-101")
    print(f"   Estado: Publicado")
    print(f"   Secciones: 6 (Introducción + 5 temas)")
    print(f"   Recursos: 10 items")
    print(f"   Matriculados: 4 usuarios")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(seed_database())
