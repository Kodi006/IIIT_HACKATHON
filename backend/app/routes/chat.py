"""
Chat endpoints for interactive Q&A about clinical notes
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import chat_with_note

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Interactive chat about an analyzed clinical note
    
    Allows users to ask follow-up questions about their analysis.
    Requires the full analysis context to be sent with each request.
    """
    try:
        if not request.question or request.question.strip() == "":
            raise HTTPException(status_code=400, detail="Question is required")
        
        if not request.analysis_context:
            raise HTTPException(status_code=400, detail="Analysis context is required")
        
        # Convert chat history to list of dicts
        chat_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.chat_history
        ]
        
        result = await chat_with_note(
            question=request.question,
            analysis_context=request.analysis_context,
            chat_history=chat_history,
            llm_mode=request.llm_mode,
            top_k=3
        )
        
        return ChatResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@router.get("/test")
async def test_chat_endpoint():
    """Test endpoint to verify chat API is working"""
    return {
        "status": "success",
        "message": "Chat API is operational",
        "endpoints": {
            "chat": "/api/chat/chat",
            "test": "/api/chat/test"
        }
    }
