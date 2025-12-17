from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class CourseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    position: int = 0


class CourseCategoryCreate(CourseCategoryBase):
    pass


class CourseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    position: Optional[int] = None
    visible: Optional[bool] = None


class CourseCategory(CourseCategoryBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    visible: bool = True
    course_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
