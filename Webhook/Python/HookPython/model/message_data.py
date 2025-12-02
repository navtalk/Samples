"""
Message Data Model
Represents a webhook message payload
"""
from pydantic import BaseModel
from typing import Optional

class MessageData(BaseModel):
    """
    Message data model for webhook events.
    
    Attributes:
        event: Event type (session.created, conversation.output, session.closed)
        session_id: Session identifier
        role: Message role (ai, user, system)
        timestamp: Timestamp in ISO 8601 format
        message: Message content (for conversation.output events)
    """
    event: str  # session.created, conversation.output, session.closed
    session_id: Optional[str] = None
    role: Optional[str] = None  # ai, user, system
    timestamp: Optional[str] = None  # ISO 8601
    message: Optional[str] = None  # conversation.output

