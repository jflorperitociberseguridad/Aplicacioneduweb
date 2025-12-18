from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from utils.auth import get_current_user
from utils.audit import log_audit

router = APIRouter(prefix="/messages", tags=["Mensajes"])

db = None

def init_router(database):
    global db
    db = database


@router.get("/threads")
async def list_threads(
    current_user: dict = Depends(get_current_user)
):
    """Listar hilos de mensajes del usuario"""
    user_id = current_user["user_id"]
    
    # Get threads where user is participant or it's a course announcement for enrolled courses
    threads = await db.message_threads.find(
        {
            "$or": [
                {"created_by": user_id},
                {"recipient_id": user_id},
                {"type": "announcement"}  # Announcements visible to all
            ]
        },
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)
    
    # Enrich with sender info and preview
    for thread in threads:
        sender = await db.users.find_one(
            {"id": thread.get("created_by")},
            {"_id": 0, "first_name": 1, "last_name": 1}
        )
        if sender:
            thread["sender_name"] = f"{sender.get('first_name', '')} {sender.get('last_name', '')}"
        
        # Get last message preview
        last_msg = await db.messages.find_one(
            {"thread_id": thread["id"]},
            {"_id": 0, "content": 1},
            sort=[("created_at", -1)]
        )
        if last_msg:
            thread["preview"] = last_msg["content"][:100]
        
        # Check if unread
        thread["unread"] = user_id not in thread.get("read_by", [])
    
    return threads


@router.post("/threads")
async def create_thread(
    recipient_id: str,
    subject: str,
    content: str,
    course_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Crear nuevo hilo de mensajes"""
    user_id = current_user["user_id"]
    
    # Verify recipient exists
    recipient = await db.users.find_one({"id": recipient_id})
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destinatario no encontrado"
        )
    
    thread_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    thread = {
        "id": thread_id,
        "subject": subject,
        "type": "message",
        "course_id": course_id,
        "created_by": user_id,
        "recipient_id": recipient_id,
        "participants": [user_id, recipient_id],
        "read_by": [user_id],
        "created_at": now,
        "last_message_at": now
    }
    
    await db.message_threads.insert_one(thread)
    
    # Create first message
    message = {
        "id": str(uuid.uuid4()),
        "thread_id": thread_id,
        "sender_id": user_id,
        "content": content,
        "created_at": now,
        "read_by": [user_id]
    }
    
    await db.messages.insert_one(message)
    
    return thread


@router.get("/threads/{thread_id}/messages")
async def get_thread_messages(
    thread_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener mensajes de un hilo"""
    user_id = current_user["user_id"]
    
    thread = await db.message_threads.find_one({"id": thread_id})
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hilo no encontrado"
        )
    
    # Mark thread as read
    if user_id not in thread.get("read_by", []):
        await db.message_threads.update_one(
            {"id": thread_id},
            {"$addToSet": {"read_by": user_id}}
        )
    
    messages = await db.messages.find(
        {"thread_id": thread_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    
    # Enrich with sender info
    for msg in messages:
        sender = await db.users.find_one(
            {"id": msg.get("sender_id")},
            {"_id": 0, "first_name": 1, "last_name": 1}
        )
        if sender:
            msg["sender_name"] = f"{sender.get('first_name', '')} {sender.get('last_name', '')}"
        
        # Mark as read
        if user_id not in msg.get("read_by", []):
            await db.messages.update_one(
                {"id": msg["id"]},
                {"$addToSet": {"read_by": user_id}}
            )
    
    return messages


@router.post("/threads/{thread_id}/messages")
async def reply_to_thread(
    thread_id: str,
    content: str,
    current_user: dict = Depends(get_current_user)
):
    """Responder a un hilo"""
    user_id = current_user["user_id"]
    
    thread = await db.message_threads.find_one({"id": thread_id})
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hilo no encontrado"
        )
    
    now = datetime.now(timezone.utc).isoformat()
    
    message = {
        "id": str(uuid.uuid4()),
        "thread_id": thread_id,
        "sender_id": user_id,
        "content": content,
        "created_at": now,
        "read_by": [user_id]
    }
    
    await db.messages.insert_one(message)
    
    # Update thread
    await db.message_threads.update_one(
        {"id": thread_id},
        {
            "$set": {"last_message_at": now},
            "$addToSet": {"participants": user_id}
        }
    )
    
    # Reset read status for other participants (they have new message)
    await db.message_threads.update_one(
        {"id": thread_id},
        {"$set": {"read_by": [user_id]}}
    )
    
    return message


@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """Obtener cantidad de mensajes sin leer"""
    user_id = current_user["user_id"]
    
    count = await db.message_threads.count_documents({
        "$or": [
            {"recipient_id": user_id},
            {"participants": user_id}
        ],
        "read_by": {"$ne": user_id}
    })
    
    return {"unread_count": count}
