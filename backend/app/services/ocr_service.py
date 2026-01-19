"""
OCR Service using Pytesseract
"""

import base64
import time
from io import BytesIO
from PIL import Image
import pytesseract
from fastapi import HTTPException

async def extract_text_from_base64(image_base64: str) -> dict:
    """
    Extract text from base64 encoded image using OCR
    Returns dict with text, success status, and processing time
    """
    start_time = time.time()
    
    try:
        # Remove data URL prefix if present
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_base64)
        
        # Open image
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        
        # Run OCR
        text = pytesseract.image_to_string(img)
        
        processing_time = time.time() - start_time
        
        return {
            "text": text,
            "success": True,
            "error": None,
            "processing_time": processing_time
        }
        
    except Exception as e:
        processing_time = time.time() - start_time
        return {
            "text": "",
            "success": False,
            "error": str(e),
            "processing_time": processing_time
        }
