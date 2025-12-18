from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(
    title="Aula Virtual API",
    description="Plataforma de aula virtual tipo Moodle",
    version="1.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import and initialize routes
from routes import (
    auth_router, users_router, courses_router, 
    categories_router, sections_router, items_router,
    enrollments_router
)
from routes.messages import router as messages_router
from routes.evaluation import router as evaluation_router
from routes.auth import init_router as init_auth
from routes.users import init_router as init_users
from routes.courses import init_router as init_courses
from routes.categories import init_router as init_categories
from routes.sections import init_router as init_sections
from routes.items import init_router as init_items
from routes.enrollments import init_router as init_enrollments
from routes.messages import init_router as init_messages
from routes.evaluation import init_router as init_evaluation

# Initialize all routes with database
init_auth(db)
init_users(db)
init_courses(db)
init_categories(db)
init_sections(db)
init_items(db)
init_enrollments(db)
init_messages(db)
init_evaluation(db)

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(courses_router)
api_router.include_router(categories_router)
api_router.include_router(sections_router)
api_router.include_router(items_router)
api_router.include_router(enrollments_router)
api_router.include_router(messages_router)
api_router.include_router(evaluation_router)

# Health check
@api_router.get("/")
async def root():
    return {"message": "Aula Virtual API", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Create indexes on startup"""
    # Users
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    
    # Courses
    await db.courses.create_index("shortname", unique=True)
    await db.courses.create_index("id", unique=True)
    await db.courses.create_index("category_id")
    await db.courses.create_index("status")
    
    # Categories
    await db.course_categories.create_index("id", unique=True)
    await db.course_categories.create_index("parent_id")
    
    # Sections
    await db.course_sections.create_index("id", unique=True)
    await db.course_sections.create_index([("course_id", 1), ("position", 1)], unique=True)
    
    # Items
    await db.course_items.create_index("id", unique=True)
    await db.course_items.create_index([("section_id", 1), ("position", 1)])
    await db.course_items.create_index("course_id")
    
    # Enrollments
    await db.enrollments.create_index("id", unique=True)
    await db.enrollments.create_index([("course_id", 1), ("user_id", 1)], unique=True)
    
    # Audit logs
    await db.audit_logs.create_index("entity_type")
    await db.audit_logs.create_index("user_id")
    await db.audit_logs.create_index("timestamp")
    
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
