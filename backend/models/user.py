from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class UserRole(str, Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    EDITOR = "editor"
    STUDENT = "student"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole = UserRole.STUDENT
    status: UserStatus = UserStatus.ACTIVE
    language: str = "es"
    timezone: str = "Europe/Madrid"
    avatar_url: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None


class UserPreferences(BaseModel):
    notifications_email: bool = True
    notifications_push: bool = True
    notifications_inapp: bool = True
    digest_frequency: str = "daily"
    privacy_show_email: bool = False
    privacy_show_activity: bool = True
    accessibility_high_contrast: bool = False
    accessibility_large_text: bool = False


class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    gdpr_consent: bool = False
    gdpr_consent_date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None


class UserInDB(User):
    hashed_password: str
