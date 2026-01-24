"""
General medical chatbot endpoints
Independent of clinical note analysis
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.general_chat_service import general_medical_chat


router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class GeneralChatRequest(BaseModel):
    question: str
    chat_history: List[ChatMessage] = []
    llm_mode: Optional[str] = "groq"


class GeneralChatResponse(BaseModel):
    answer: str
    disclaimer: str
    processing_time: float


@router.post("/chat", response_model=GeneralChatResponse)
async def chat_endpoint(request: GeneralChatRequest):
    """
    General medical Q&A endpoint
    
    Answers general health questions without requiring clinical note context.
    Includes safety guardrails and medical disclaimers.
    """
    try:
        if not request.question or request.question.strip() == "":
            raise HTTPException(status_code=400, detail="Question is required")
        
        # Convert chat history to list of dicts
        chat_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.chat_history
        ]
        
        result = await general_medical_chat(
            question=request.question,
            chat_history=chat_history,
            llm_mode=request.llm_mode or "groq"
        )
        
        return GeneralChatResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify general chat API is working"""
    return {
        "status": "success",
        "message": "General Medical Chat API is operational",
        "endpoints": {
            "chat": "/api/general-chat/chat",
            "test": "/api/general-chat/test"
        }
    }
