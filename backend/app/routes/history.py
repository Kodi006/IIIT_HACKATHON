"""
History API endpoints for dashboard
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
import json

from app.database import get_db
from app.models.db_models import AnalysisRecord

router = APIRouter()


@router.get("/")
async def get_history(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get paginated list of analysis history
    """
    records = db.query(AnalysisRecord)\
        .order_by(desc(AnalysisRecord.created_at))\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    total = db.query(func.count(AnalysisRecord.id)).scalar()
    
    return {
        "records": [r.to_dict() for r in records],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """
    Get dashboard statistics
    """
    total_analyses = db.query(func.count(AnalysisRecord.id)).scalar() or 0
    
    avg_time = db.query(func.avg(AnalysisRecord.processing_time)).scalar() or 0
    
    # Most common diagnosis
    most_common = db.query(
        AnalysisRecord.primary_diagnosis,
        func.count(AnalysisRecord.primary_diagnosis).label('count')
    ).filter(
        AnalysisRecord.primary_diagnosis.isnot(None)
    ).group_by(
        AnalysisRecord.primary_diagnosis
    ).order_by(
        desc('count')
    ).first()
    
    # Confidence distribution
    confidence_dist = db.query(
        AnalysisRecord.confidence,
        func.count(AnalysisRecord.confidence).label('count')
    ).filter(
        AnalysisRecord.confidence.isnot(None)
    ).group_by(
        AnalysisRecord.confidence
    ).all()
    
    return {
        "total_analyses": total_analyses,
        "avg_processing_time": round(avg_time, 2),
        "most_common_diagnosis": most_common[0] if most_common else None,
        "most_common_count": most_common[1] if most_common else 0,
        "confidence_distribution": {c[0]: c[1] for c in confidence_dist}
    }


@router.get("/{record_id}")
async def get_analysis(record_id: int, db: Session = Depends(get_db)):
    """
    Get single analysis by ID with full details
    """
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return record.to_full_dict()


@router.delete("/{record_id}")
async def delete_analysis(record_id: int, db: Session = Depends(get_db)):
    """
    Delete analysis by ID
    """
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    db.delete(record)
    db.commit()
    
    return {"message": "Analysis deleted", "id": record_id}


@router.get("/test")
async def test_endpoint():
    """Test endpoint"""
    return {"status": "success", "message": "History API is operational"}
