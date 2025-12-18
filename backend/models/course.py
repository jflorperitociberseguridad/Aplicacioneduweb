from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class CourseStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


class CourseFormat(str, Enum):
    TOPICS = "topics"
    WEEKS = "weeks"
    FREE = "free"


class ItemType(str, Enum):
    PAGE = "page"
    FILE = "file"
    VIDEO = "video"
    URL = "url"
    FORUM = "forum"
    ASSIGNMENT = "assignment"
    QUIZ = "quiz"
    FEEDBACK = "feedback"
    LABEL = "label"


class CompletionSettings(BaseModel):
    enabled: bool = False
    method: str = "manual"  # manual, automatic
    min_percentage: Optional[float] = None
    min_grade: Optional[float] = None


class GradebookSettings(BaseModel):
    scale: str = "0-100"
    passing_grade: float = 50.0


class AISettings(BaseModel):
    enabled: bool = False
    default_language: str = "es"
    require_teacher_approval: bool = True
    block_publish_on_failed_check: bool = False


class FileSettings(BaseModel):
    max_file_size_mb: int = 50
    allowed_types: List[str] = Field(default_factory=lambda: ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "jpg", "png", "mp4", "zip"])
    total_quota_mb: int = 500


class CourseBase(BaseModel):
    fullname: str
    shortname: str
    category_id: str
    summary: Optional[str] = None
    cover_image: Optional[str] = None
    cover_image_alt: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    language: str = "es"
    format: CourseFormat = CourseFormat.TOPICS
    num_sections: int = 5
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    fullname: Optional[str] = None
    shortname: Optional[str] = None
    category_id: Optional[str] = None
    summary: Optional[str] = None
    cover_image: Optional[str] = None
    cover_image_alt: Optional[str] = None
    tags: Optional[List[str]] = None
    language: Optional[str] = None
    format: Optional[CourseFormat] = None
    num_sections: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    visible: Optional[bool] = None
    status: Optional[CourseStatus] = None
    completion: Optional[CompletionSettings] = None
    gradebook: Optional[GradebookSettings] = None
    ai: Optional[AISettings] = None
    files: Optional[FileSettings] = None


class Course(CourseBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    visible: bool = True
    status: CourseStatus = CourseStatus.DRAFT
    completion: CompletionSettings = Field(default_factory=CompletionSettings)
    gradebook: GradebookSettings = Field(default_factory=GradebookSettings)
    ai: AISettings = Field(default_factory=AISettings)
    files: FileSettings = Field(default_factory=FileSettings)
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_modified_by: Optional[str] = None


# Course Section
class CourseSectionBase(BaseModel):
    title: str
    summary: Optional[str] = None
    position: int = 0


class CourseSectionCreate(CourseSectionBase):
    course_id: str


class CourseSectionUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    position: Optional[int] = None
    visible: Optional[bool] = None


class CourseSection(CourseSectionBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    course_id: str
    visible: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# Course Item
class AvailabilityRestrictions(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    require_completion: List[str] = Field(default_factory=list)  # list of item_ids
    require_grade: Optional[Dict[str, float]] = None  # item_id: min_grade
    require_group: Optional[List[str]] = None


class ItemCompletionRules(BaseModel):
    type: str = "manual"  # manual, view, submit, grade
    min_grade: Optional[float] = None


class ItemAIProvenance(BaseModel):
    provenance: Optional[str] = None  # "human", "ai_generated", "ai_improved"
    generated_from_job_id: Optional[str] = None
    last_improved_job_id: Optional[str] = None


class CourseItemBase(BaseModel):
    title: str
    item_type: ItemType
    description: Optional[str] = None
    position: int = 0
    content: Optional[Dict[str, Any]] = None  # Flexible content based on type


class CourseItemCreate(CourseItemBase):
    section_id: Optional[str] = None  # Optional because it's provided via URL


class CourseItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    position: Optional[int] = None
    visible: Optional[bool] = None
    content: Optional[Dict[str, Any]] = None
    availability: Optional[AvailabilityRestrictions] = None
    completion: Optional[ItemCompletionRules] = None


class CourseItem(CourseItemBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    section_id: str
    course_id: str
    visible: bool = True
    availability: AvailabilityRestrictions = Field(default_factory=AvailabilityRestrictions)
    completion: ItemCompletionRules = Field(default_factory=ItemCompletionRules)
    ai: ItemAIProvenance = Field(default_factory=ItemAIProvenance)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
