"""
app_singlefile.py

Single-file Streamlit demo for an Explainable Clinical Co-Pilot (hackathon).
Features:
 - accepts typed clinical notes or uploaded image (runs OCR)
 - hierarchical clinical chunking (section-aware)
 - embeddings with sentence-transformers and FAISS vector store
 - two-step clinical reasoning: Step1 extract facts, Step2 produce DDx JSON with evidence chunk_ids
 - SOAP note generation
 - Traceability explorer highlights evidence snippets
 - LLM mode: 'openai' (requires OPENAI_API_KEY) or 'local_stub' (offline, deterministic)
 
Important: For a production/hackathon submission replace the LLM stub with your own model call
(e.g., an on-device Llama/Medic model or a hosted API). Adapt and customize this file to
ensure originality and to meet hackathon rules.
"""

import os

# Disable TensorFlow and torchvision to avoid DLL errors on Windows
os.environ['USE_TF'] = '0'
os.environ['USE_TORCH'] = '1'
os.environ['TRANSFORMERS_NO_ADVISORY_WARNINGS'] = '1'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

import re
import json
import uuid
import base64
from io import BytesIO
from typing import List, Dict, Any

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from PIL import Image
import pytesseract
import streamlit as st
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from tqdm import tqdm

import openai

########################
# Configuration
########################

EMBED_MODEL = "sentence-transformers/all-mpnet-base-v2"  # swap for clinical embedder if available
EMBED_DIM = 768  # dimension for the above model; adjust if you change model
LLM_MODE = os.getenv("LLM_MODE", "openai")  # "openai" or "local_stub"
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # change if you prefer a different model
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", None)  # set externally if using OpenAI

# Section headers to detect in clinical notes (extend these as needed)
SECTION_HEADERS = [
    r"HISTORY OF PRESENT ILLNESS[:\s]*",
    r"HPI[:\s]*",
    r"PAST MEDICAL HISTORY[:\s]*",
    r"MEDICAL HISTORY[:\s]*",
    r"PHYSICAL EXAMINATION[:\s]*",
    r"PHYSICAL EXAM[:\s]*",
    r"ASSESSMENT[:\s]*",
    r"PLAN[:\s]*",
    r"LABORATORY[:\s]*",
    r"LABS[:\s]*",
    r"IMAGING[:\s]*",
    r"MEDICATIONS[:\s]*",
    r"ALLERGIES[:\s]*",
    r"ROS[:\s]*",  # review of systems
]

########################
# Utilities: OCR + Text processing
########################

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
    If no headers found, returns a single UNLABELED section.
    """
    if not text or text.strip() == "":
        return [{"section": "UNLABELED", "body": ""}]
    # Build a pattern that captures headers
    pattern = "(" + "|".join(SECTION_HEADERS) + ")"
    parts = re.split(pattern, text, flags=re.IGNORECASE)
    # parts: [before, header1, body1, header2, body2, ...] or entire text if no match
    if len(parts) <= 1:
        return [{"section": "UNLABELED", "body": text.strip()}]
    sections = []
    # handle leading text before first header
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
    """Simple character-level chunker for demo. Adjust to token-based in production."""
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

########################
# Embedding + FAISS index
########################

@st.cache_resource(show_spinner=False)
def load_embedder(model_name: str = EMBED_MODEL):
    return SentenceTransformer(model_name)

def build_index_from_chunks(chunks: List[Dict[str, Any]], embedder: SentenceTransformer):
    """
    Build a FAISS index from a list of chunk dicts.
    chunk dict fields: chunk_id, text, section, doc_id, metadata...
    Returns index, id_map where id_map maps faiss internal id -> chunk dict
    """
    texts = [c["text"] for c in chunks]
    embeddings = embedder.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # inner product (use normalized embeddings for cosine)
    # normalize embeddings for cosine similarity
    faiss.normalize_L2(embeddings)
    index.add(embeddings)
    # id_map
    id_map = {i: chunks[i] for i in range(len(chunks))}
    return index, id_map, embeddings

def retrieve_from_index(query: str, embedder: SentenceTransformer, index, id_map, top_k: int = 6):
    q_emb = embedder.encode([query], convert_to_numpy=True)
    faiss.normalize_L2(q_emb)
    D, I = index.search(q_emb, top_k)
    results = []
    for idx, score in zip(I[0], D[0]):
        if idx < 0:
            continue
        item = id_map[idx].copy()
        item["score"] = float(score)
        results.append(item)
    return results

########################
# LLM wrapper (OpenAI or local stub)
########################

from openai import OpenAI
client = None  # Will be initialized only when needed

def call_openai_chat(system_prompt, user_prompt, max_tokens=512, temperature=0.7):
    global client
    if client is None:
        client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o-mini",  # or gpt-4o, gpt-4-turbo etc.
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content



def call_local_stub(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.0) -> str:
    """
    Deterministic local stub for offline demo. It does NOT do real clinical reasoning.
    Replace with local LLM inference (transformers, ggml, etc.) in your final.
    """
    # Extract chunk information from user_prompt
    lowered = user_prompt.lower()
    
    # Helper function to extract chunk IDs from context
    def extract_chunk_ids(text, keyword):
        """Extract chunk IDs that contain a specific keyword"""
        chunks = []
        lines = text.split('\n')
        for line in lines:
            if keyword in line.lower() and '[' in line and ']' in line:
                # Extract chunk_id from [chunk_id][section]: text format
                try:
                    # Find the first [...]  which should be the chunk_id
                    start = line.find('[')
                    end = line.find(']', start)
                    if start != -1 and end != -1:
                        chunk_id = line[start+1:end]
                        # Skip if it's "evidence:" or other metadata
                        if chunk_id and not chunk_id.startswith('evidence') and '_' in chunk_id:
                            chunks.append(chunk_id)
                except:
                    pass
        return chunks[:2]  # Return up to 2 chunk IDs
    
    # Step 2: Differential Diagnosis (check this FIRST before Step 1)
    # Step 2 asks for "differential diagnoses as a JSON array"
    if ("differential diagnoses" in lowered or "json array" in lowered or 
        "step1_output" in lowered or "reasoning engine" in system_prompt.lower()):
        
        # Extract key clinical features
        has_fever = any(word in lowered for word in ["fever", "febrile", "temperature"])
        has_chest_pain = any(word in lowered for word in ["chest pain", "chest discomfort"])
        has_sob = any(word in lowered for word in ["shortness of breath", "dyspnea", "sob"])
        has_cough = "cough" in lowered
        has_headache = "headache" in lowered
        has_neck = any(word in lowered for word in ["neck stiffness", "nuchal"])
        has_meningeal = any(word in lowered for word in ["meningeal", "kernig", "brudzinski"])
        has_abd_pain = any(word in lowered for word in ["abdominal pain", "belly pain", "stomach pain"])
        has_nausea = any(word in lowered for word in ["nausea", "vomiting"])
        has_confusion = any(word in lowered for word in ["confusion", "altered", "disoriented"])
        has_elevated_wbc = "wbc" in lowered or "white blood" in lowered
        has_troponin = "troponin" in lowered
        
        ddx = []
        
        # Meningitis pattern
        if (has_fever and has_neck and has_headache) or has_meningeal:
            evidence_chunks = []
            for keyword in ["fever", "neck", "nuchal", "headache", "meningeal"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            
            ddx.append({
                "diagnosis": "Bacterial Meningitis",
                "confidence": "High",
                "rationale": "Classic triad of fever, severe headache, and nuchal rigidity with positive meningeal signs.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
        
        # Pneumonia pattern
        if has_fever and (has_cough or has_sob) and has_elevated_wbc:
            evidence_chunks = []
            for keyword in ["fever", "cough", "breath", "wbc"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            
            ddx.append({
                "diagnosis": "Community-Acquired Pneumonia",
                "confidence": "High",
                "rationale": "Fever with respiratory symptoms and leukocytosis suggests bacterial pneumonia. Chest X-ray indicated.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
        
        # Myocardial Infarction pattern
        if has_chest_pain and (has_troponin or has_sob):
            evidence_chunks = []
            for keyword in ["chest", "pain", "troponin"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            
            ddx.append({
                "diagnosis": "Acute Myocardial Infarction",
                "confidence": "High",
                "rationale": "Chest pain with elevated troponin or associated symptoms concerning for acute MI. Urgent cardiology consultation needed.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
        
        # Sepsis pattern
        if has_fever and has_elevated_wbc and (has_confusion or "hypotension" in lowered):
            evidence_chunks = []
            for keyword in ["fever", "wbc", "confusion", "pressure"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            
            ddx.append({
                "diagnosis": "Sepsis",
                "confidence": "High",
                "rationale": "Fever with leukocytosis and altered mental status or hemodynamic instability concerning for sepsis. Requires urgent management.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
        
        # Acute Abdomen pattern
        if has_abd_pain and (has_fever or has_nausea or has_elevated_wbc):
            evidence_chunks = []
            for keyword in ["abdominal", "pain", "nausea"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            
            ddx.append({
                "diagnosis": "Acute Abdomen (Appendicitis/Cholecystitis)",
                "confidence": "Medium",
                "rationale": "Abdominal pain with systemic symptoms warrants imaging to evaluate for surgical abdomen.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
        
        # Stroke pattern
        if has_confusion or "weakness" in lowered or "numbness" in lowered:
            evidence_chunks = []
            for keyword in ["confusion", "weakness", "numbness", "neurological"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            
            ddx.append({
                "diagnosis": "Cerebrovascular Accident (Stroke)",
                "confidence": "Medium",
                "rationale": "Acute neurological symptoms require urgent imaging to evaluate for stroke. Time-sensitive intervention may be needed.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
        
        # Headache differential (if headache without meningeal signs)
        if has_headache and not (has_meningeal or has_neck):
            headache_chunks = extract_chunk_ids(user_prompt, "headache")
            ddx.append({
                "diagnosis": "Migraine or Tension Headache",
                "confidence": "Medium",
                "rationale": "Headache without focal neurological deficits or meningeal signs. Consider primary headache disorder.",
                "evidence": headache_chunks[:2] if headache_chunks else ["CLINICAL"]
            })
        
        # Generic fallback if no specific patterns matched
        if not ddx:
            # Try to extract any diagnosis mentioned in the text
            diagnosis_keywords = [
                "meningitis", "pneumonia", "mi", "myocardial", "stroke", "sepsis",
                "appendicitis", "cholecystitis", "uti", "gastroenteritis"
            ]
            found_diagnosis = None
            for keyword in diagnosis_keywords:
                if keyword in lowered:
                    found_diagnosis = keyword.title()
                    break
            
            if found_diagnosis:
                chunks = extract_chunk_ids(user_prompt, found_diagnosis.lower())
                ddx.append({
                    "diagnosis": found_diagnosis,
                    "confidence": "Medium",
                    "rationale": "Based on clinical presentation documented in the note.",
                    "evidence": chunks[:2] if chunks else ["CLINICAL"]
                })
            else:
                ddx.append({
                    "diagnosis": "Undifferentiated Illness",
                    "confidence": "Low",
                    "rationale": "Clinical presentation requires further diagnostic workup to establish diagnosis.",
                    "evidence": []
                })
        
        return json.dumps(ddx[:3], indent=2)  # Return top 3
    
    # SOAP Note Generation
    if "SOAP" in system_prompt.upper() or "summarizer" in system_prompt.lower():
        subjective = []
        objective = []
        assessment = []
        plan = []
        
        # Extract key information from context
        if "fever" in lowered:
            subjective.append("Fever")
        if "headache" in lowered:
            subjective.append("severe headache")
        if "neck stiffness" in lowered or "nuchal rigidity" in lowered:
            subjective.append("neck stiffness")
        if "nausea" in lowered or "vomiting" in lowered:
            subjective.append("nausea/vomiting")
        if "photophobia" in lowered:
            subjective.append("photophobia")
            
        # Look for vital signs and physical exam
        if "temp" in lowered or "°f" in lowered or "fever" in lowered:
            objective.append("Elevated temperature")
        if "nuchal rigidity" in lowered or "kernig" in lowered or "brudzinski" in lowered:
            objective.append("Positive meningeal signs")
        if "wbc" in lowered or "white blood cell" in lowered:
            objective.append("Elevated WBC")
            
        # Assessment based on context
        if "meningitis" in lowered:
            assessment.append("Concerning for bacterial meningitis")
        elif "fever" in lowered and ("headache" in lowered or "neck" in lowered):
            assessment.append("Fever with neurological symptoms")
            
        # Plan extraction
        if "lp" in lowered or "lumbar puncture" in lowered or "csf" in lowered:
            plan.append("Lumbar puncture for CSF analysis")
        if "antibiotic" in lowered or "ceftriaxone" in lowered or "vancomycin" in lowered:
            plan.append("Empiric antibiotics")
        if "icu" in lowered or "admit" in lowered:
            plan.append("ICU admission for monitoring")
            
        # Format SOAP note
        s_text = ", ".join(subjective) if subjective else "Patient presents with acute symptoms"
        o_text = "; ".join(objective) if objective else "Vital signs abnormal, physical exam significant"
        a_text = assessment[0] if assessment else "Clinical picture requires urgent evaluation"
        p_text = ", ".join(plan) if plan else "Further workup and treatment indicated"
        
        return f"S: {s_text}\nO: {o_text}\nA: {a_text}\nP: {p_text}"
    
    # Step 1: Extract Structured Facts
    if "extract" in system_prompt.lower() or "extractor" in system_prompt.lower():
        out = []
        import re
        
        # 1. Patient History & Demographics
        demographics = []
        # Extract age
        age_patterns = [
            r'(\d+)[- ]year[s]?[- ]old',
            r'age[:\s]+(\d+)',
            r'(\d+)[- ]yo\b',
            r'(\d+)\s*y/?o'
        ]
        for pattern in age_patterns:
            age_match = re.search(pattern, lowered)
            if age_match:
                demographics.append(f"- Age: {age_match.group(1)} years")
                break
                
        # Extract gender
        if re.search(r'\bmale\b', lowered) and not re.search(r'\bfemale\b', lowered):
            demographics.append("- Sex: Male")
        elif re.search(r'\bfemale\b', lowered):
            demographics.append("- Sex: Female")
            
        if not demographics:
            demographics = ["- Not specified in available context"]
        out.append("1. Patient History & Demographics:\n" + "\n".join(demographics))
        
        # 2. Chief Complaint & Symptoms (more generic detection)
        symptoms = []
        
        # Common symptom keywords to look for
        symptom_keywords = {
            'pain': ['pain', 'ache', 'discomfort'],
            'fever': ['fever', 'febrile', 'pyrexia', 'temperature'],
            'headache': ['headache', 'cephalgia'],
            'nausea': ['nausea', 'nauseous', 'vomiting', 'emesis'],
            'shortness of breath': ['shortness of breath', 'dyspnea', 'sob', 'breathless'],
            'cough': ['cough', 'coughing'],
            'fatigue': ['fatigue', 'tired', 'weakness', 'malaise'],
            'dizziness': ['dizziness', 'dizzy', 'vertigo', 'lightheaded'],
            'chest pain': ['chest pain', 'chest discomfort'],
            'abdominal pain': ['abdominal pain', 'stomach pain', 'belly pain'],
            'neck stiffness': ['neck stiffness', 'nuchal rigidity', 'stiff neck'],
            'rash': ['rash', 'skin lesion'],
            'swelling': ['swelling', 'edema'],
            'confusion': ['confusion', 'confused', 'altered mental', 'disoriented']
        }
        
        for symptom_name, keywords in symptom_keywords.items():
            for keyword in keywords:
                if keyword in lowered:
                    chunks = extract_chunk_ids(user_prompt, keyword)
                    if chunks:
                        symptoms.append(f"- {symptom_name.title()} [evidence: {chunks[0]}]")
                    else:
                        symptoms.append(f"- {symptom_name.title()} [evidence: CLINICAL]")
                    break
        
        if not symptoms:
            # Fallback: extract any "presents with" or "complains of" phrases
            presents_match = re.search(r'(?:presents? with|complain[s]? of|report[s]?)\s+([^.]+)', lowered)
            if presents_match:
                symptoms.append(f"- {presents_match.group(1).strip().title()} [evidence: CLINICAL]")
            else:
                symptoms = ["- Chief complaint documented in clinical note"]
        
        out.append("2. Chief Complaint & Symptoms:\n" + "\n".join(symptoms))
        
        # 3. Physical Exam & Vitals (more comprehensive)
        exam = []
        
        # Vital signs patterns
        vitals_patterns = {
            'temperature': [r'temp[erature]*[:\s]+(\d+\.?\d*)', r'(\d{2,3}\.?\d*)\s*°?f', r'fever'],
            'blood pressure': [r'bp[:\s]+(\d+/\d+)', r'blood pressure[:\s]+(\d+/\d+)'],
            'heart rate': [r'hr[:\s]+(\d+)', r'heart rate[:\s]+(\d+)', r'(\d+)\s*bpm', r'pulse[:\s]+(\d+)'],
            'respiratory rate': [r'rr[:\s]+(\d+)', r'respiratory rate[:\s]+(\d+)', r'(\d+)\s*breaths'],
            'oxygen saturation': [r'o2[:\s]+(\d+)%?', r'spo2[:\s]+(\d+)%?', r'sat[:\s]+(\d+)%?']
        }
        
        for vital_name, patterns in vitals_patterns.items():
            for pattern in patterns:
                if re.search(pattern, lowered):
                    chunks = extract_chunk_ids(user_prompt, vital_name.split()[0])
                    exam.append(f"- {vital_name.title()} noted [evidence: {chunks[0] if chunks else 'VITALS'}]")
                    break
        
        # Physical exam findings keywords
        exam_keywords = {
            'abnormal breath sounds': ['crackles', 'rales', 'wheezing', 'rhonchi'],
            'cardiac findings': ['murmur', 'gallop', 'rub'],
            'meningeal signs': ['nuchal rigidity', 'kernig', 'brudzinski', 'meningeal'],
            'neurological findings': ['focal deficit', 'weakness', 'numbness', 'paralysis'],
            'skin findings': ['rash', 'lesion', 'erythema', 'cyanosis', 'jaundice'],
            'abdominal findings': ['tenderness', 'guarding', 'rebound', 'distension']
        }
        
        for exam_name, keywords in exam_keywords.items():
            for keyword in keywords:
                if keyword in lowered:
                    chunks = extract_chunk_ids(user_prompt, keyword)
                    exam.append(f"- {exam_name.title()} [evidence: {chunks[0] if chunks else 'PHYSICAL'}]")
                    break
        
        if not exam:
            exam = ["- Physical examination findings documented"]
        out.append("3. Physical Exam & Vitals:\n" + "\n".join(exam))
        
        # 4. Key Lab & Imaging Findings (more comprehensive)
        labs = []
        
        # Lab test keywords
        lab_keywords = {
            'WBC': ['wbc', 'white blood cell', 'leukocyte'],
            'Hemoglobin': ['hemoglobin', 'hgb', 'hb'],
            'Platelet count': ['platelet', 'plt'],
            'Neutrophils': ['neutrophil', 'pmn'],
            'Glucose': ['glucose', 'blood sugar'],
            'Creatinine': ['creatinine', 'cr'],
            'Troponin': ['troponin'],
            'BUN': ['bun', 'blood urea nitrogen'],
            'Electrolytes': ['sodium', 'potassium', 'na+', 'k+'],
            'Liver enzymes': ['alt', 'ast', 'liver enzyme'],
            'CRP': ['crp', 'c-reactive protein'],
            'ESR': ['esr', 'sed rate']
        }
        
        for lab_name, keywords in lab_keywords.items():
            for keyword in keywords:
                if keyword in lowered:
                    chunks = extract_chunk_ids(user_prompt, keyword)
                    # Check if elevated/decreased
                    if any(term in lowered for term in ['elevated', 'high', 'increased', '↑']):
                        labs.append(f"- Elevated {lab_name} [evidence: {chunks[0] if chunks else 'LABS'}]")
                    elif any(term in lowered for term in ['low', 'decreased', 'reduced', '↓']):
                        labs.append(f"- Decreased {lab_name} [evidence: {chunks[0] if chunks else 'LABS'}]")
                    else:
                        labs.append(f"- {lab_name} results available [evidence: {chunks[0] if chunks else 'LABS'}]")
                    break
        
        # Imaging findings
        imaging_keywords = ['x-ray', 'xray', 'ct', 'mri', 'ultrasound', 'echo', 'ecg', 'ekg']
        for keyword in imaging_keywords:
            if keyword in lowered:
                chunks = extract_chunk_ids(user_prompt, keyword)
                labs.append(f"- {keyword.upper()} findings documented [evidence: {chunks[0] if chunks else 'IMAGING'}]")
                break
        
        if not labs:
            labs = ["- Laboratory/imaging results in clinical note"]
        out.append("4. Key Lab & Imaging Findings:\n" + "\n".join(labs))
        
        # 5. Clinician's Stated Assessment (extract any assessment/diagnosis mentioned)
        assessment = []
        
        # Common assessment/diagnosis keywords
        assessment_keywords = [
            'meningitis', 'pneumonia', 'copd', 'asthma', 'mi', 'myocardial infarction',
            'stroke', 'sepsis', 'appendicitis', 'cholecystitis', 'pancreatitis',
            'uti', 'urinary tract infection', 'gastroenteritis', 'dehydration',
            'hypertension', 'diabetes', 'concerning for', 'likely', 'suggests',
            'differential', 'impression', 'diagnosis'
        ]
        
        for keyword in assessment_keywords:
            if keyword in lowered:
                chunks = extract_chunk_ids(user_prompt, keyword)
                # Extract the sentence containing the assessment
                sentences = user_prompt.split('.')
                for sentence in sentences:
                    if keyword in sentence.lower():
                        assessment.append(f"- {sentence.strip()[:100]}... [evidence: {chunks[0] if chunks else 'ASSESSMENT'}]")
                        break
                if assessment:
                    break
        
        if not assessment:
            # Fallback: look for assessment section
            if "assessment" in lowered or "plan" in lowered:
                chunks = extract_chunk_ids(user_prompt, "assessment") or extract_chunk_ids(user_prompt, "plan")
                assessment.append(f"- Clinical assessment documented [evidence: {chunks[0] if chunks else 'ASSESSMENT'}]")
            else:
                assessment = ["- Assessment requires clinical correlation"]
        
        out.append("5. Clinician's Stated Assessment:\n" + "\n".join(assessment))
        
        return "\n\n".join(out)
    
    # fallback
    return "LOCAL_STUB_RESPONSE"

def call_llm(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.0):
    """
    Call the appropriate LLM based on LLM_MODE setting.
    Modes: 'openai' (requires API key) or 'local_stub' (demo mode, no downloads needed)
    """
    if LLM_MODE == "openai":
        return call_openai_chat(system_prompt, user_prompt, max_tokens=max_tokens, temperature=temperature)
    else:
        # Default to the local_stub (lightweight, no downloads)
        return call_local_stub(system_prompt, user_prompt, max_tokens=max_tokens, temperature=temperature)

########################
# RAG pipeline: retrieval + two-step reasoning
########################

def prepare_chunks_from_text(full_text: str, doc_id: int = 0) -> List[Dict[str, Any]]:
    """
    Section-aware hierarchical chunking:
      - split into sections
      - chunk each section into char-level chunks
      - create chunk_id and metadata
    """
    sections = split_into_sections(full_text)
    chunks = []
    chunk_seq = 0
    for sec in sections:
        header = sec["section"] if sec["section"] else "UNLABELED"
        body = sec["body"] if sec["body"] else ""
        sec_chunks = chunk_text(body, max_chars=1500)
        for i, c in enumerate(sec_chunks):
            chunk_id = f"{doc_id}_{header[:20]}_{chunk_seq}_{str(uuid.uuid4())[:8]}"
            chunks.append({
                "chunk_id": chunk_id,
                "text": c,
                "section": header,
                "doc_id": doc_id,
                "chunk_num": chunk_seq
            })
            chunk_seq += 1
    if not chunks:
        # empty note fallback: create one chunk with full_text
        chunks.append({
            "chunk_id": f"{doc_id}_UNLABELED_0",
            "text": full_text,
            "section": "UNLABELED",
            "doc_id": doc_id,
            "chunk_num": 0
        })
    return chunks

def generate_summary_and_ddx(full_text: str, embedder: SentenceTransformer, top_k: int = 8):
    """
    1) prepare chunks and build index
    2) retrieve top_k chunks for the whole note
    3) Step 1: Ask LLM to extract structured facts (provide chunk IDs + text as context)
    4) Step 2: Ask LLM to produce top-3 DDx JSON referencing chunk ids
    5) Also request SOAP note generation
    """
    global LLM_MODE, OPENAI_MODEL
    # Step A: chunk and index
    chunks = prepare_chunks_from_text(full_text)
    index, id_map, embeddings = build_index_from_chunks(chunks, embedder)

    # retrieve using the whole note as query
    retrieved = retrieve_from_index(full_text, embedder, index, id_map, top_k=top_k)

    # create a context string that includes chunk ids and section labels
    context_parts = []
    for r in retrieved:
        context_parts.append(f"[{r['chunk_id']}][{r['section']}]: {r['text']}")
    context = "\n\n".join(context_parts)

    # Step 1 prompt: extract structured facts (Chain-of-Thought style)
    step1_system = "You are a clinical extractor. Extract and organize facts from the provided context into categories. Do not make diagnoses."
    step1_user = f"CONTEXT:\n{context}\n\nExtract into categories:\n1. Patient History & Demographics:\n2. Chief Complaint & Symptoms:\n3. Physical Exam & Vitals:\n4. Key Lab & Imaging Findings:\n5. Clinician's Stated Assessment:\n\nInclude chunk ids in brackets after each finding, e.g., (evidence: [chunk_id])."

    step1_output = call_llm(step1_system, step1_user)

    # Step 2 prompt: produce JSON ddx with evidence referencing chunk_ids from retrieved list
    step2_system = "You are a clinical reasoning engine. Use ONLY the structured facts provided from Step 1 to produce a prioritized differential diagnosis."
    step2_user = f"STEP1_OUTPUT:\n{step1_output}\n\nTask: Provide the top 3 differential diagnoses as a JSON array. For each diagnosis include:\n - diagnosis: string\n - confidence: High|Medium|Low\n - rationale: 1-2 sentence explanation\n - evidence: list of chunk_id strings that support this diagnosis\nReturn valid JSON only."

    step2_output = call_llm(step2_system, step2_user)

    # SOAP prompt: produce concise SOAP note
    soap_system = "You are a professional medical summarization agent. Produce a concise, factual SOAP note using only the context given below. Do not infer outside the provided text."
    soap_user = f"CONTEXT:\n{context}\n\nProduce SOAP: S (Subjective), O (Objective), A (Assessment), P (Plan)."

    soap_output = call_llm(soap_system, soap_user)

    # Try to parse step2_output as JSON
    ddx_json = None
    parse_error = None
    try:
        ddx_json = json.loads(step2_output)
    except Exception as e:
        parse_error = str(e)

    return {
        "soap": soap_output,
        "step1": step1_output,
        "step2_raw": step2_output,
        "ddx": ddx_json,
        "ddx_parse_error": parse_error,
        "retrieved": retrieved,
        "all_chunks": chunks
    }

########################
# UI: Streamlit app
########################

st.set_page_config(layout="wide", page_title="Clinician's Co-Pilot — Demo")
st.title("Clinician's Co-Pilot — Explainable Clinical Decision Support (Demo)")

# Left column: Inputs
left, right = st.columns([0.45, 0.55])

with left:
    st.header("Input")
    input_mode = st.radio("Input type", ["Typed note", "Upload image (photo/scanned note)"])
    
    # Sample clinical note for testing
    sample_note = """CHIEF COMPLAINT: Fever, headache, and neck stiffness for 3 days.

HISTORY OF PRESENT ILLNESS:
Patient is a 35-year-old male presenting to the emergency department with a 3-day history of progressively worsening fever (up to 102.5°F), severe headache, and neck stiffness. He reports photophobia and nausea with one episode of vomiting. Denies recent head trauma, sick contacts, or travel. No similar episodes in the past.

PAST MEDICAL HISTORY:
- No significant past medical history
- No chronic medications
- No known drug allergies

PHYSICAL EXAMINATION:
- Vitals: Temp 101.8°F, HR 110 bpm, BP 128/82 mmHg, RR 18, O2 sat 98% on room air
- General: Appears ill, in moderate distress
- HEENT: Pupils equal and reactive, photophobia noted
- Neck: Positive nuchal rigidity, Kernig's and Brudzinski's signs positive
- Neurological: Alert and oriented x3, no focal neurological deficits
- Skin: No rash observed

LABORATORY:
- WBC: 15,200/μL (elevated)
- Neutrophils: 82% (elevated)
- CRP: 45 mg/L (elevated)

ASSESSMENT:
Clinical presentation highly concerning for bacterial meningitis given fever, severe headache, nuchal rigidity, and positive meningeal signs.

PLAN:
- Urgent LP for CSF analysis
- Start empiric IV antibiotics (ceftriaxone + vancomycin)
- CT head if LP delayed
- Admit to ICU for close monitoring
- Infectious disease consult"""
    
    note_text = ""
    uploaded_image_bytes = None
    if input_mode == "Typed note":
        note_text = st.text_area("Paste / type the clinical note here", value=sample_note, height=420)
    else:
        uploaded_file = st.file_uploader("Upload image (jpg/png/pdf pages)", type=["png", "jpg", "jpeg", "pdf"])
        if uploaded_file is not None:
            # If PDF, attempt to open first page as image
            data = uploaded_file.read()
            if uploaded_file.type == "application/pdf":
                try:
                    # If pdf, use PIL's pdf loader (may require poppler); fallback to error
                    img = Image.open(BytesIO(data))
                    buffered = BytesIO()
                    img.save(buffered, format="PNG")
                    uploaded_image_bytes = buffered.getvalue()
                except Exception as e:
                    st.error("PDF -> image conversion failed. Upload JPG/PNG or install poppler.")
            else:
                uploaded_image_bytes = data
            if uploaded_image_bytes:
                st.image(uploaded_image_bytes, caption="Uploaded image", use_column_width=True)
                if st.button("Run OCR on uploaded image"):
                    with st.spinner("Running OCR..."):
                        extracted = extract_text_from_image_bytes(uploaded_image_bytes)
                        st.success("OCR complete — text extracted below. Edit if necessary before analysis.")
                        st.text_area("Extracted text (edit if OCR had errors)", value=extracted, height=320, key="ocr_text")
                        note_text = extracted

    # If OCR text area exists (from previous button), prefer that
    if "ocr_text" in st.session_state and st.session_state.get("ocr_text"):
        note_text = st.session_state.get("ocr_text")

    # options
    st.markdown("---")
    st.write("LLM & Retrieval Options")
    llm_mode_select = st.selectbox(
        "LLM mode", 
        ["local_stub", "openai"], 
        index=0,  # Default to local_stub
        help="local_stub: Demo mode (no API needed) | openai: GPT models (requires API key)"
    )
    use_custom_embed = st.checkbox("Use smaller embedder (faster demo)", value=False)
    top_k = st.slider("Number of chunks to retrieve (k)", min_value=3, max_value=12, value=6)

    if llm_mode_select == "openai" and (not OPENAI_API_KEY):
        st.warning("OpenAI selected as LLM mode but OPENAI_API_KEY not set in environment. Switch to local_stub or set key.")

    if st.button("Analyze patient note"):
        if not note_text or note_text.strip()=="":
            st.error("Provide a clinical note (typed or via OCR) before analysis.")
        else:
            # Load embedder (smaller model for speed if requested)
            with st.spinner("Loading embedding model... (this may take ~30s on first run)"):
                if use_custom_embed:
                    embedder = load_embedder("sentence-transformers/all-MiniLM-L6-v2")
                else:
                    embedder = load_embedder(EMBED_MODEL)

            # set LLM mode globally
            
            LLM_MODE = llm_mode_select
            # (OpenAI model can be adjusted by env var or by editing OPENAI_MODEL constant)

            with st.spinner("Running RAG + reasoning pipeline..."):
                result = generate_summary_and_ddx(note_text, embedder, top_k=top_k)

            # render outputs in right column
            st.session_state["last_result"] = result
            st.success("Analysis complete — results shown on the right.")

with right:
    st.header("Analysis & Explainability")
    if "last_result" not in st.session_state:
        st.info("No analysis yet — provide a note on the left and click 'Analyze patient note'.")
    else:
        res = st.session_state["last_result"]
        st.subheader("SOAP Summary")
        st.code(res["soap"] if res["soap"] else "No SOAP output")

        st.subheader("Step 1 — Structured Facts (Extraction)")
        st.text_area("Step 1 output (structured facts)", value=res["step1"] or "No step1 output", height=200)

        st.subheader("Step 2 — Differential Diagnosis (JSON)")
        if res["ddx"]:
            try:
                st.json(res["ddx"])
            except Exception:
                st.text(res["step2_raw"])
        else:
            st.error("DDx JSON could not be parsed by the LLM. Raw output below.")
            st.text_area("Raw Step 2 Output", value=res["step2_raw"], height=200)
            if res["ddx_parse_error"]:
                st.caption(f"Parse error: {res['ddx_parse_error']}")

        st.subheader("Traceability Explorer")
        # allow user to pick a diagnosis and see evidence highlighted
        choices = []
        if res["ddx"] and isinstance(res["ddx"], list):
            choices = [d.get("diagnosis","(no name)") for d in res["ddx"]]
        if choices:
            chosen = st.selectbox("Select diagnosis to trace", choices)
            dx_obj = next((d for d in res["ddx"] if d.get("diagnosis")==chosen), None)
            evidence_ids = dx_obj.get("evidence") if dx_obj else []
            # show the retrieved chunks and highlight evidence snippets (simple approach)
            st.markdown("**Evidence snippets from retrieved chunks:**")
            for r in res["retrieved"]:
                mark = "🔍" if r["chunk_id"] in (evidence_ids or []) else ""
                st.write(f"{mark} **{r['chunk_id']}** — _{r['section']}_ — score {r['score']:.3f}")
                # show first 300 chars
                snippet = r["text"][:400] + ("..." if len(r["text"])>400 else "")
                if r["chunk_id"] in (evidence_ids or []):
                    st.markdown(f"<mark>{snippet}</mark>", unsafe_allow_html=True)
                else:
                    st.write(snippet)
            st.markdown("---")
            st.subheader("Full original note (raw)")
            st.text_area("Original note", value=note_text, height=300)
        else:
            st.info("No structured DDx list available to trace. Inspect Step 1 / Step 2 outputs above.")

########################
# End of app
########################
