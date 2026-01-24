"""
Clinical analysis endpoints
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
import json

from app.models.schemas import AnalysisRequest, AnalysisResponse
from app.services.rag_service import analyze_clinical_note
from app.database import get_db
from app.models.db_models import AnalysisRecord

router = APIRouter()

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_note(request: AnalysisRequest, db: Session = Depends(get_db)):
    """
    Analyze clinical note using RAG pipeline
    Returns SOAP notes, differential diagnoses, and evidence traceability
    Auto-saves result to database for dashboard history
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
        
        # Auto-save to database for history
        try:
            primary_dx = None
            confidence = None
            if result.get("ddx") and len(result["ddx"]) > 0:
                primary_dx = result["ddx"][0].get("diagnosis")
                confidence = result["ddx"][0].get("confidence")
            
            record = AnalysisRecord(
                note_preview=request.text[:200] if request.text else "",
                full_note=request.text,
                soap=result.get("soap", ""),
                ddx_json=json.dumps(result.get("ddx")) if result.get("ddx") else None,
                step1_facts=result.get("step1_facts", ""),
                primary_diagnosis=primary_dx,
                confidence=confidence,
                processing_time=result.get("processing_time", 0),
                llm_mode=request.llm_mode
            )
            db.add(record)
            db.commit()
        except Exception as save_error:
            # Don't fail the request if save fails, just log
            print(f"Warning: Failed to save analysis to history: {save_error}")
        
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
