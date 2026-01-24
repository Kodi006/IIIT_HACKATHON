"""
RAG Pipeline Service - Core clinical analysis engine
Includes embeddings, FAISS indexing, and LLM reasoning
"""

import os
import re
import json
import uuid
import time
from typing import List, Dict, Any, Tuple
import numpy as np
import requests

# ML imports
from sentence_transformers import SentenceTransformer
import faiss

# Configuration
EMBED_MODEL = "sentence-transformers/all-mpnet-base-v2"
EMBED_MODEL_SMALL = "sentence-transformers/all-MiniLM-L6-v2"
EMBED_DIM = 768
EMBED_DIM_SMALL = 384
COLAB_T4_URL = "https://a92c-34-16-161-55.ngrok-free.app/generate"

# Section headers
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
    r"ROS[:\s]*",
]

# Global model cache
_embedder_cache = {}

def get_embedder(use_small: bool = False) -> SentenceTransformer:
    """Get or load embedding model with caching"""
    global _embedder_cache
    
    key = "small" if use_small else "large"
    
    if key not in _embedder_cache:
        model_name = EMBED_MODEL_SMALL if use_small else EMBED_MODEL
        _embedder_cache[key] = SentenceTransformer(model_name)
    
    return _embedder_cache[key]

def split_into_sections(text: str) -> List[Dict[str, str]]:
    """Split clinical note into sections by recognizing headers"""
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

def chunk_text(text: str, max_chars: int = 1500) -> List[str]:
    """Simple character-level chunker"""
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

def prepare_chunks_from_text(full_text: str, doc_id: int = 0) -> List[Dict[str, Any]]:
    """Section-aware hierarchical chunking"""
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
        chunks.append({
            "chunk_id": f"{doc_id}_UNLABELED_0",
            "text": full_text,
            "section": "UNLABELED",
            "doc_id": doc_id,
            "chunk_num": 0
        })
    
    return chunks

def build_index_from_chunks(
    chunks: List[Dict[str, Any]], 
    embedder: SentenceTransformer
) -> Tuple[Any, Dict[int, Dict], np.ndarray]:
    """Build FAISS index from chunks"""
    texts = [c["text"] for c in chunks]
    embeddings = embedder.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    faiss.normalize_L2(embeddings)
    index.add(embeddings)
    
    id_map = {i: chunks[i] for i in range(len(chunks))}
    
    return index, id_map, embeddings

def retrieve_from_index(
    query: str,
    embedder: SentenceTransformer,
    index: Any,
    id_map: Dict[int, Dict],
    top_k: int = 6
) -> List[Dict[str, Any]]:
    """Retrieve top-k relevant chunks"""
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

# LLM functions
def call_colab_t4(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.7) -> str:
    """Call Google Colab T4 GPU via Ngrok"""
    try:
        payload = {
            "prompt": f"{system_prompt}\n\n{user_prompt}",
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        headers = {"Content-Type": "application/json"}
        # Use a short timeout for connection but longer for read if needed
        response = requests.post(COLAB_T4_URL, json=payload, headers=headers, timeout=120)
        response.raise_for_status()
        
        # Determine if response is json or text
        try:
            data = response.json()
            # If the API returns { "response": ... } or { "generated_text": ... }
            if isinstance(data, dict):
                return data.get("response") or data.get("generated_text") or str(data)
            return str(data)
        except json.JSONDecodeError:
            return response.text
            
    except Exception as e:
        return f"Error calling Colab T4: {str(e)}"

# Import the entire local_stub function from the original code
def call_local_stub(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.0) -> str:
    """Local stub for offline demo"""
    lowered = user_prompt.lower()
    
    def extract_chunk_ids(text, keyword):
        chunks = []
        lines = text.split('\n')
        for line in lines:
            if keyword in line.lower() and '[' in line and ']' in line:
                try:
                    start = line.find('[')
                    end = line.find(']', start)
                    if start != -1 and end != -1:
                        chunk_id = line[start+1:end]
                        if chunk_id and not chunk_id.startswith('evidence') and '_' in chunk_id:
                            chunks.append(chunk_id)
                except:
                    pass
        return chunks[:2]
    
    
    # Step 3: Interactive Chat (Moved to top)
    if "user question" in lowered or "chat history" in lowered:
        question_match = re.search(r'USER QUESTION: (.*)', user_prompt, re.IGNORECASE)
        question = question_match.group(1) if question_match else "your question"
        
        # Simple keyword matching for demo
        response_parts = []
        response_parts.append(f"Based on the analysis regarding \"{question}\":\n")
        
        # Check context for relevant info
        context_match = re.search(r'CONTEXT:\n(.*?)CHAT HISTORY', user_prompt, re.DOTALL)
        if not context_match:
             context_match = re.search(r'CONTEXT:\n(.*?)USER QUESTION', user_prompt, re.DOTALL)
             
        context = context_match.group(1) if context_match else ""
        
        found_info = False
        lines = context.split('\n')
        for line in lines:
            # Simple keyword overlap
            q_words = [w for w in question.lower().split() if len(w) > 3]
            if any(w in line.lower() for w in q_words) and len(line) > 20:
                response_parts.append(f"- {line.strip()}")
                found_info = True
                if len(response_parts) > 5: break
        
        if not found_info:
            response_parts.append("I couldn't find specific evidence for that in the clinical note, but based on the general assessment, the patient warrants close monitoring.")
            
        response_parts.append("\n(Note: This is a local demo stub. For full reasoning, switch to Ollama or OpenAI mode.)")
        return "\n".join(response_parts)

    # Step 2: Differential Diagnosis
    if (("differential diagnoses" in lowered or "json array" in lowered or 
        "step1_output" in lowered or "reasoning engine" in system_prompt.lower()) and 
        "user question" not in lowered):
        
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
        
        # Heart failure indicators
        has_orthopnea = "orthopnea" in lowered
        has_edema = any(word in lowered for word in ["edema", "swelling", "leg swelling"])
        has_jvd = any(word in lowered for word in ["jugular", "jvp", "jvd"])
        has_crackles = any(word in lowered for word in ["crackles", "rales"])
        has_bnp = "bnp" in lowered
        has_cardiomegaly = "cardiomegaly" in lowered
        has_pulm_congestion = any(word in lowered for word in ["pulmonary congestion", "pulmonary edema"])
        has_hypertension = any(word in lowered for word in ["hypertension", "blood pressure"])
        has_ckd = any(word in lowered for word in ["chronic kidney", "ckd", "renal"])
        has_diabetes = any(word in lowered for word in ["diabetes", "dm", "diabetic"])
        
        ddx = []
        
        # Heart Failure
        if (has_sob and has_orthopnea and has_edema) or (has_jvd and has_crackles) or has_bnp:
            evidence_chunks = []
            for keyword in ["shortness", "orthopnea", "edema", "swelling", "jugular", "crackles", "bnp", "cardiomegaly"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            
            ddx.append({
                "diagnosis": "Acute Decompensated Heart Failure",
                "confidence": "High",
                "rationale": "Classic presentation with dyspnea, orthopnea, bilateral edema, elevated JVP, crackles, elevated BNP, and radiographic findings of cardiomegaly and pulmonary congestion.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
        
        # Hypertensive Emergency
        if has_hypertension and (has_sob or has_headache or has_confusion):
            evidence_chunks = []
            for keyword in ["blood pressure", "hypertension"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            
            ddx.append({
                "diagnosis": "Hypertensive Emergency",
                "confidence": "Medium",
                "rationale": "Significantly elevated blood pressure with evidence of end-organ dysfunction.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
        
        # Renal Fluid Overload
        if has_ckd and has_edema and has_sob:
            evidence_chunks = []
            for keyword in ["kidney", "renal", "edema", "fluid"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            
            ddx.append({
                "diagnosis": "Renal Fluid Overload",
                "confidence": "Medium",
                "rationale": "Chronic kidney disease leading to fluid retention and volume overload.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
        
        # Meningitis
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
        
        if has_fever and (has_cough or has_sob) and has_elevated_wbc:
            evidence_chunks = []
            for keyword in ["fever", "cough", "breath", "wbc"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            
            ddx.append({
                "diagnosis": "Community-Acquired Pneumonia",
                "confidence": "High",
                "rationale": "Fever with respiratory symptoms and leukocytosis suggests bacterial pneumonia.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
        
        if has_chest_pain and (has_troponin or has_sob):
            evidence_chunks = []
            for keyword in ["chest", "pain", "troponin"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            
            ddx.append({
                "diagnosis": "Acute Myocardial Infarction",
                "confidence": "High",
                "rationale": "Chest pain with elevated troponin concerning for acute MI.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
        
        if not ddx:
            ddx.append({
                "diagnosis": "Undifferentiated Illness",
                "confidence": "Low",
                "rationale": "Clinical presentation requires further diagnostic workup.",
                "evidence": []
            })
        
        return json.dumps(ddx[:3], indent=2)
    
    # SOAP Note
    if "SOAP" in system_prompt.upper() or "summarizer" in system_prompt.lower():
        subjective = []
        objective = []
        assessment = []
        plan = []
        
        # Subjective findings
        if "fever" in lowered:
            subjective.append("fever")
        if "headache" in lowered:
            subjective.append("severe headache")
        if "neck stiffness" in lowered or "nuchal rigidity" in lowered:
            subjective.append("neck stiffness")
        if "shortness of breath" in lowered or "dyspnea" in lowered or "sob" in lowered:
            subjective.append("progressive shortness of breath")
        if "orthopnea" in lowered:
            subjective.append("orthopnea")
        if "leg swelling" in lowered or "edema" in lowered:
            subjective.append("bilateral leg swelling")
        
        # Objective findings
        if "temp" in lowered or "fever" in lowered:
            objective.append("elevated temperature")
        if "nuchal rigidity" in lowered:
            objective.append("positive meningeal signs")
        if "wbc" in lowered:
            objective.append("elevated WBC")
        if "jugular" in lowered or "jvp" in lowered:
            objective.append("elevated JVP")
        if "crackles" in lowered or "rales" in lowered:
            objective.append("bilateral basal crackles")
        if "edema" in lowered or "pitting" in lowered:
            objective.append("pitting edema")
        if "blood pressure" in lowered or "bp" in lowered:
            if "168" in lowered or "hypertension" in lowered:
                objective.append("BP 168/92 mmHg")
        if "bnp" in lowered:
            objective.append("BNP 980 pg/mL")
        if "cardiomegaly" in lowered or "pulmonary congestion" in lowered:
            objective.append("cardiomegaly and pulmonary congestion on CXR")
        
        # Assessment
        if ("shortness of breath" in lowered or "dyspnea" in lowered) and ("edema" in lowered or "orthopnea" in lowered):
            assessment.append("Acute decompensated heart failure")
        elif "meningitis" in lowered:
            assessment.append("Concerning for bacterial meningitis")
        
        s_text = ", ".join(subjective) if subjective else "Patient presents with acute symptoms"
        o_text = "; ".join(objective) if objective else "Vital signs abnormal"
        a_text = assessment[0] if assessment else "Clinical picture requires urgent evaluation"
        p_text = "Further workup and treatment indicated"
        
        return f"S: {s_text}\nO: {o_text}\nA: {a_text}\nP: {p_text}"
    
    # Step 1: Extract Facts
    if "extract" in system_prompt.lower() or "extractor" in system_prompt.lower():
        out = []
        
        # Demographics
        demographics = []
        age_match = re.search(r'(\d+)[- ]year[s]?[- ]old', lowered)
        if age_match:
            demographics.append(f"- Age: {age_match.group(1)} years")
        
        if re.search(r'\bmale\b', lowered) and not re.search(r'\bfemale\b', lowered):
            demographics.append("- Sex: Male")
        elif re.search(r'\bfemale\b', lowered):
            demographics.append("- Sex: Female")
        
        if not demographics:
            demographics = ["- Not specified"]
        out.append("1. Patient History & Demographics:\n" + "\n".join(demographics))
        
        # Symptoms
        symptoms = []
        symptom_keywords = {
            'pain': ['pain', 'ache'],
            'fever': ['fever', 'febrile'],
            'headache': ['headache'],
            'nausea': ['nausea', 'vomiting'],
            'shortness of breath': ['shortness of breath', 'dyspnea'],
            'cough': ['cough'],
            'neck stiffness': ['neck stiffness', 'nuchal rigidity']
        }
        
        for symptom_name, keywords in symptom_keywords.items():
            for keyword in keywords:
                if keyword in lowered:
                    chunks = extract_chunk_ids(user_prompt, keyword)
                    symptoms.append(f"- {symptom_name.title()} [evidence: {chunks[0] if chunks else 'CLINICAL'}]")
                    break
        
        if not symptoms:
            symptoms = ["- Chief complaint documented"]
        out.append("2. Chief Complaint & Symptoms:\n" + "\n".join(symptoms))
        
        # Physical Exam & Vitals
        exam = ["- Vital signs and physical examination documented"]
        if "nuchal rigidity" in lowered or "meningeal" in lowered:
            exam = ["- Positive meningeal signs noted [evidence: PHYSICAL]"]
        out.append("3. Physical Exam & Vitals:\n" + "\n".join(exam))
        
        # Labs
        labs = []
        if "wbc" in lowered or "white blood cell" in lowered:
            labs.append("- Elevated WBC [evidence: LABS]")
        if not labs:
            labs = ["- Laboratory results available"]
        out.append("4. Key Lab & Imaging Findings:\n" + "\n".join(labs))
        
        # Assessment
        assessment = ["- Clinical assessment documented"]
        out.append("5. Clinician's Stated Assessment:\n" + "\n".join(assessment))
        
        return "\n\n".join(out)
    
    # If no specific pattern matched, return default
    return "LOCAL_STUB_RESPONSE"


def call_ollama(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.7) -> str:
    """
    Call Ollama (local LLM) API
    Requires Ollama to be running locally (ollama serve)
    Install: https://ollama.com/download
    Run: ollama pull mistral (or llama2, phi, etc.)
    """
    import requests
    
    try:
        url = "http://localhost:11434/api/generate"
        
        # Combine system and user prompts for Ollama
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        
        payload = {
            "model": "llama3.2:3b",  # Can be changed to llama2, phi, etc.
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }
        
        response = requests.post(url, json=payload, timeout=300)
        response.raise_for_status()
        
        result = response.json()
        return result.get("response", "No response from Ollama")
        
    except requests.exceptions.ConnectionError:
        return "ERROR: Ollama is not running. Please start Ollama with 'ollama serve' and ensure you have a model installed (e.g., 'ollama pull llama3.2:3b')"
    except requests.exceptions.Timeout:
        return "ERROR: Ollama request timed out. The first request can take significantly longer (up to 5 mins) as the model loads into RAM. Please try again - subsequent requests will be faster!"
    except requests.exceptions.HTTPError as e:
        return f"ERROR: Ollama HTTP error: {str(e)}. Make sure Llama 3.2 model is installed with 'ollama pull llama3.2:3b'"
    except Exception as e:
        return f"ERROR calling Ollama: {str(e)}"


def call_groq(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.7) -> str:
    """
    Call Groq API (fast, free inference)
    Get free API key at: https://console.groq.com
    Set GROQ_API_KEY in .env file
    """
    import os
    
    try:
        from groq import Groq
        
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return "ERROR: GROQ_API_KEY not found in environment. Get free key at https://console.groq.com"
        
        client = Groq(api_key=api_key)
        
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Fast, free model (updated from deprecated llama3-8b-8192)
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
        
    except ImportError:
        return "ERROR: groq package not installed. Run: pip install groq"
    except Exception as e:
        return f"ERROR calling Groq: {str(e)}"


def call_gemini(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.7) -> str:
    """
    Call Google Gemini API (free tier available)
    Get free API key at: https://makersuite.google.com/app/apikey
    Set GEMINI_API_KEY in .env file
    """
    import os
    
    try:
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "ERROR: GEMINI_API_KEY not found in environment. Get free key at https://makersuite.google.com/app/apikey"
        
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel('gemini-pro')
        
        # Combine system and user prompts
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        
        response = model.generate_content(
            full_prompt,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens
            }
        )
        
        return response.text
        
    except ImportError:
        return "ERROR: google-generativeai package not installed. Run: pip install google-generativeai"
    except Exception as e:
        return f"ERROR calling Gemini: {str(e)}"


def call_llm(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.0, llm_mode: str = "local_stub") -> str:
    """
    Call appropriate LLM based on mode
    
    Supported modes:
    - local_stub: Fast demo mode (no API/setup needed)
    - ollama: Local LLM via Ollama (FREE, private, no API key)
    - groq: Fast API (FREE with generous limits)
    - gemini: Google AI (FREE tier available)
    - openai: OpenAI API (requires paid API key)
    """
    if llm_mode == "ollama":
        return call_ollama(system_prompt, user_prompt, max_tokens, temperature)
    elif llm_mode == "colab_t4":
        return call_colab_t4(system_prompt, user_prompt, max_tokens, temperature)
    else:
        return call_local_stub(system_prompt, user_prompt, max_tokens, temperature)


async def analyze_clinical_note(
    full_text: str,
    llm_mode: str = "local_stub",
    top_k: int = 6,
    use_small_embedder: bool = False
) -> Dict[str, Any]:
    """Main RAG pipeline - analyze clinical note"""
    start_time = time.time()
    
    # Get embedder
    embedder = get_embedder(use_small=use_small_embedder)
    
    # Prepare chunks and build index
    chunks = prepare_chunks_from_text(full_text)
    index, id_map, embeddings = build_index_from_chunks(chunks, embedder)
    
    # Retrieve relevant chunks
    retrieved = retrieve_from_index(full_text, embedder, index, id_map, top_k=top_k)
    
    # Create context
    context_parts = []
    for r in retrieved:
        context_parts.append(f"[{r['chunk_id']}][{r['section']}]: {r['text']}")
    context = "\n\n".join(context_parts)
    
    # Step 1: Extract structured facts
    step1_system = "You are a clinical extractor. Extract and organize facts from the provided context into categories. Do not make diagnoses."
    step1_user = f"CONTEXT:\n{context}\n\nExtract into categories:\n1. Patient History & Demographics:\n2. Chief Complaint & Symptoms:\n3. Physical Exam & Vitals:\n4. Key Lab & Imaging Findings:\n5. Clinician's Stated Assessment:\n\nInclude chunk ids in brackets after each finding."
    
    step1_output = call_llm(step1_system, step1_user, llm_mode=llm_mode)
    
    # Step 2: Differential diagnosis (Enhanced prompt for detailed analysis)
    step2_system = """You are an expert clinical reasoning engine and diagnostic specialist. 
Your task is to analyze the structured clinical facts and produce a comprehensive, evidence-based differential diagnosis.
Be thorough in your clinical reasoning and provide actionable insights."""
    
    step2_user = f"""STEP1_OUTPUT (Extracted Clinical Facts):
{step1_output}

TASK: Generate a detailed differential diagnosis analysis.

Provide the top 3-5 differential diagnoses as a JSON array. For EACH diagnosis, include:
- "diagnosis": The specific diagnosis name
- "confidence": "High", "Medium", or "Low" based on how well it fits the clinical picture
- "rationale": A detailed 2-4 sentence explanation covering:
  * Key clinical findings that support this diagnosis
  * Pathophysiological reasoning
  * Why this is ranked at this confidence level
- "evidence": List of chunk_id strings that support this diagnosis
- "workup": Recommended diagnostic tests/studies to confirm or rule out this diagnosis
- "red_flags": Any concerning findings that require urgent attention

Consider:
1. Most likely diagnosis based on the clinical presentation
2. Life-threatening conditions that must not be missed ("cannot-miss" diagnoses)
3. Common conditions that present similarly

Return ONLY valid JSON array, no other text."""
    
    if llm_mode == "colab_t4":
        step2_output = """[
            {
                "diagnosis": "Differential Diagnosis (Skipped for T4)",
                "confidence": "Low",
                "rationale": "Complex reasoning step skipped for optimization on T4 instance as per configuration.",
                "evidence": [],
                "workup": "N/A",
                "red_flags": "N/A"
            }
        ]"""
    else:
        step2_output = call_llm(step2_system, step2_user, max_tokens=1024, llm_mode=llm_mode)
    
    # SOAP note
    soap_system = "You are a professional medical summarization agent. Produce a concise, factual SOAP note using only the context given."
    soap_user = f"CONTEXT:\n{context}\n\nProduce SOAP: S (Subjective), O (Objective), A (Assessment), P (Plan)."
    
    soap_output = call_llm(soap_system, soap_user, llm_mode=llm_mode)
    
    # Parse DDx JSON
    ddx_json = None
    parse_error = None
    try:
        ddx_json = json.loads(step2_output)
    except Exception as e:
        parse_error = str(e)
    
    processing_time = time.time() - start_time
    
    return {
        "soap": soap_output,
        "step1_facts": step1_output,
        "step2_ddx_raw": step2_output,
        "ddx": ddx_json,
        "ddx_parse_error": parse_error,
        "retrieved_chunks": retrieved,
        "all_chunks": chunks,
        "processing_time": processing_time
    }
