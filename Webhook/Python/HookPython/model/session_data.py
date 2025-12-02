"""
Session Data Model
Represents a full session record with all messages and metadata
"""
from __future__ import annotations
from pydantic import BaseModel
from typing import List, Optional

# Import MessageData for type hints
from .message_data import MessageData

class SessionData(BaseModel):
    """
    Represents a full session record, including all messages and session metadata.
    
    Attributes:
        messages: All messages in this session. Each message is represented as a MessageData.
        start_time: Session start time (UTC)
        end_time: Session end time (UTC)
        session_id: Session identifier
    """
    messages: Optional[List[MessageData]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    session_id: Optional[str] = None

