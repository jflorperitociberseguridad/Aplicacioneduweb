from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid


async def log_audit(
    db,
    action: str,
    entity_type: str,
    entity_id: str,
    user_id: str,
    details: Optional[Dict[str, Any]] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None
):
    """Log an audit trail entry"""
    audit_entry = {
        "id": str(uuid.uuid4()),
        "action": action,  # create, update, delete, login, etc.
        "entity_type": entity_type,  # user, course, enrollment, etc.
        "entity_id": entity_id,
        "user_id": user_id,
        "details": details or {},
        "old_values": old_values,
        "new_values": new_values,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_address": None  # Can be added from request
    }
    
    await db.audit_logs.insert_one(audit_entry)
    return audit_entry
