"""
Webhook Controller
Handles webhook events from the real-time API
"""
import logging
import json
import sys
import os
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from HookPython.model import SessionData, MessageData

# Add parent directory to Python path for absolute imports
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)



logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

@router.post("/message")
async def receive_real_time_webhook(payload: MessageData):
    """
    Endpoint to receive real-time webhook events.
    This endpoint handles events such as session creation, conversation output, and session closure.
    
    Args:
        payload: The webhook payload object
        
    Returns:
        HTTP 200 OK response
    """
    logger.info("========== Webhook Event Received ==========")
    logger.info(f"Event: {payload.event}")
    logger.info(f"Session ID: {payload.session_id}")
    logger.info(f"Role: {payload.role}")
    logger.info(f"Timestamp: {payload.timestamp}")
    logger.info(f"Message: {payload.message}")
    logger.info("============================================")
    
    # Handle business logic based on event type
    if payload.event == "session.created":
        # TODO: handle session creation logic
        pass
    elif payload.event == "conversation.output":
        # TODO: handle conversation messages
        pass
    elif payload.event == "session.closed":
        # TODO: handle session closure logic
        pass
    else:
        logger.warn(f"Unknown event type: {payload.event}")
    
    return JSONResponse(content={"message": "Webhook received successfully"}, status_code=200)

@router.post("/session")
async def receive_session_record(sess_data: SessionData):
    """
    Endpoint to receive full session records when a session ends.
    This endpoint receives the entire session data and logs it in JSON format.
    
    Args:
        sess_data: The session record
        
    Returns:
        HTTP 200 OK response
    """
    try:
        # Convert to JSON string with pretty printing
        json_str = json.dumps(sess_data.model_dump(), indent=2, ensure_ascii=False)
        
        logger.info(f"Full session record received: {json_str}")
        
        # TODO: persist sess_data to the database or perform other business logic
    except Exception as e:
        logger.error("Failed to process session record", exc_info=True)
    
    return JSONResponse(content={"message": "Session record received successfully"}, status_code=200)

