"""
Clinical analysis endpoints
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.schemas import AnalysisRequest, AnalysisResponse
from app.services.rag_service import analyze_clinical_note

router = APIRouter()

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_note(request: AnalysisRequest):
    """
    Analyze clinical note using RAG pipeline
    Returns SOAP notes, differential diagnoses, and evidence traceability
    """
    try:
        if not request.text or request.text.strip() == "":
            raise HTTPException(status_code=400, detail="Clinical note text is required")
        
        result = await analyze_clinical_note(
            full_text=request.text,
            llm_mode=request.llm_mode,
            top_k=request.top_k,
            use_small_embedder=request.use_small_embedder
        )
        
        return AnalysisResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify API is working"""
    return {
        "status": "success",
        "message": "Analysis API is operational",
        "endpoints": {
            "analyze": "/api/analysis/analyze",
            "test": "/api/analysis/test"
        }
    }
