"""
OCR endpoints
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import OCRRequest, OCRResponse
from app.services.ocr_service import extract_text_from_base64

router = APIRouter()

@router.post("/extract", response_model=OCRResponse)
async def extract_text_from_image(request: OCRRequest):
    """
    Extract text from an uploaded image using OCR
    Expects base64 encoded image
    """
    try:
        result = await extract_text_from_base64(request.image_base64)
        return OCRResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")
