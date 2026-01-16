import re
from io import BytesIO
from typing import List, Dict
from PIL import Image
import pytesseract
import streamlit as st
from src.config import SECTION_HEADERS

def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    """Run Tesseract OCR on uploaded image bytes and return text."""
    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        st.error(f"Could not open image: {e}")
        return ""
    text = pytesseract.image_to_string(img)
    return text

def split_into_sections(text: str) -> List[Dict[str, str]]:
    """
    Split clinical note into sections by recognizing common headers.
    Returns list of {"section": header, "body": text}.
    """
    if not text or text.strip() == "":
        return [{"section": "UNLABELED", "body": ""}]
    
    pattern = "(" + "|".join(SECTION_HEADERS) + ")"
    parts = re.split(pattern, text, flags=re.IGNORECASE)
    
    if len(parts) <= 1:
        return [{"section": "UNLABELED", "body": text.strip()}]
    
    sections = []
    if parts[0].strip():
        sections.append({"section": "UNLABELED", "body": parts[0].strip()})
    
    i = 1
    while i < len(parts):
        header = parts[i].strip().upper() if parts[i] else "UNLABELED"
        body = parts[i+1].strip() if (i+1) < len(parts) else ""
        sections.append({"section": header, "body": body})
        i += 2
    return sections

def chunk_text(text: str, max_chars: int = 2000) -> List[str]:
    """Simple character-level chunker."""
    text = text.strip()
    if not text:
        return []
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + max_chars, n)
        chunk = text[start:end].strip()
        chunks.append(chunk)
        start = end
    return chunks
