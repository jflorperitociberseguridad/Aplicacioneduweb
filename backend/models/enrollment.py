from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


class EnrollmentRole(str, Enum):
    TEACHER = "teacher"
    EDITOR = "editor"
    STUDENT = "student"


class EnrollmentStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    ENDED = "ended"


class EnrollmentBase(BaseModel):
    course_id: str
    user_id: str
    role: EnrollmentRole = EnrollmentRole.STUDENT


class EnrollmentCreate(EnrollmentBase):
    pass


class EnrollmentUpdate(BaseModel):
    role: Optional[EnrollmentRole] = None
    status: Optional[EnrollmentStatus] = None


class Enrollment(EnrollmentBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: EnrollmentStatus = EnrollmentStatus.ACTIVE
    enrolled_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    enrolled_by: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    progress_percentage: float = 0.0
