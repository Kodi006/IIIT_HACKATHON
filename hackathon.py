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
import re
import json
import uuid
import base64
from io import BytesIO
from typing import List, Dict, Any

from PIL import Image
import pytesseract
import streamlit as st
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from tqdm import tqdm

import openai

#... after your other imports
import torch
import transformers
from transformers import AutoTokenizer, AutoModelForCausalLM
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
client = OpenAI()

def call_openai_chat(system_prompt, user_prompt, max_tokens=512, temperature=0.7):
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
    # Very simple heuristics for demo:
    # - If "SOAP" in system_prompt -> return short SOAP with bits of user_prompt
    # - If "Step 1" (extract facts) -> extract lines starting with '[' which contain chunk ids
    # - If "Step 2" produce fake ddx using keywords
    if "SOAP" in system_prompt.upper() or "summarizer" in system_prompt.lower():
        # try to create a tiny SOAP by picking sentences
        text = user_prompt
        s = text.strip().split(".")
        subj = s[0] if s else ""
        return f"S: {subj.strip()}\nO: N/A\nA: N/A\nP: N/A"
    if "extract" in system_prompt.lower() or "step 1" in system_prompt.lower():
        # very naive: find lines with 'fever', 'headache', 'nuchal' etc
        out = []
        lowered = user_prompt.lower()
        out.append("1. Patient History & Demographics:\n- N/A")
        symptoms = []
        if "fever" in lowered:
            symptoms.append("- Fever (from note) [evidence: CHUNK_FEVER]")
        if "headache" in lowered:
            symptoms.append("- Headache [evidence: CHUNK_HEAD]")
        if "neck stiffness" in lowered or "nuchal rigidity" in lowered:
            symptoms.append("- Nuchal rigidity / neck stiffness [evidence: CHUNK_NECK]")
        if not symptoms:
            symptoms = ["- N/A"]
        out.append("2. Chief Complaint & Symptoms:\n" + "\n".join(symptoms))
        out.append("3. Physical Exam & Vitals:\n- N/A")
        out.append("4. Key Lab & Imaging Findings:\n- N/A")
        out.append("5. Clinician's Stated Assessment:\n- N/A")
        return "\n\n".join(out)
    if "differential" in system_prompt.lower() or "step 2" in system_prompt.lower():
        # create a small JSON
        ddx = [
            {
                "diagnosis": "Meningitis",
                "confidence": "High" if "CHUNK_NECK" in user_prompt or "CHUNK_FEVER" in user_prompt else "Medium",
                "rationale": "Fever + neck stiffness/headache are classic for meningitis.",
                "evidence": ["CHUNK_FEVER", "CHUNK_NECK"]
            },
            {
                "diagnosis": "Migraine",
                "confidence": "Medium",
                "rationale": "Headache without focal neurological deficits can be migraine.",
                "evidence": ["CHUNK_HEAD"]
            },
            {
                "diagnosis": "Subarachnoid Hemorrhage",
                "confidence": "Low",
                "rationale": "Severe sudden headache could indicate SAH; further imaging required.",
                "evidence": []
            }
        ]
        return json.dumps(ddx, indent=2)
    # fallback
    return "LOCAL_STUB_RESPONSE"
def call_llm(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.0):
    if LLM_MODE == "openai":
        return call_openai_chat(system_prompt, user_prompt, max_tokens=max_tokens, temperature=temperature)
    elif LLM_MODE == "local_transformers":
        return call_local_transformers(system_prompt, user_prompt, max_tokens=max_tokens, temperature=temperature)
    else:
        # Default to the local_stub
        return call_local_stub(system_prompt, user_prompt, max_tokens=max_tokens, temperature=temperature)
@st.cache_resource(show_spinner="Loading local LLM (Llama 3.1 8B)...")
def load_local_model_pipeline():
    """
    Loads the quantized Llama 3.1 8B model and tokenizer.
    Uses 4-bit quantization to fit on consumer GPUs.
    """
    model_id = "TsinghuaC3I/Llama-3-8B-UltraMedical" #
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    
    # Load model with 4-bit quantization
    pipeline = transformers.pipeline(
        "text-generation",
        model=model_id,
        model_kwargs={
            "torch_dtype": torch.bfloat16,  #
            "quantization_config": {"load_in_4bit": True},  #
            "low_cpu_mem_usage": True,  #
        },
        device_map="auto",  #
    )
    
    # Define terminators to stop generation cleanly
    terminators = [
        pipeline.tokenizer.eos_token_id,
        pipeline.tokenizer.convert_tokens_to_ids("<|eot_id|>")
    ]
    
    return pipeline, terminators

def call_local_transformers(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.0) -> str:
    """
    Calls the locally loaded Llama 3.1 model.
    """
    try:
        pipeline, terminators = load_local_model_pipeline()
        
        messages ={"role": "user", "content": user_prompt}, 
        
        # Use a temperature slightly > 0 for stability
        temp = max(temperature, 0.01)

        outputs = pipeline(
            messages,
            max_new_tokens=max_tokens,
            eos_token_id=terminators,
            do_sample=True,
            temperature=temp,
            pad_token_id=pipeline.tokenizer.eos_token_id
        )
        
        # Extract only the newly generated text (the assistant's reply)
        response_message = outputs["generated_text"][-1]
        return response_message.get("content", "ERROR: No content generated.")

    except Exception as e:
        st.error(f"Local LLM Error: {e}")
        return f"ERROR: Could not run local model. Ensure you have a GPU and are logged in to Hugging Face (huggingface-cli login). Error: {e}"
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
    note_text = ""
    uploaded_image_bytes = None
    if input_mode == "Typed note":
        note_text = st.text_area("Paste / type the clinical note here", height=420)
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
    ["local_stub", "local_transformers", "openai"], 
    index=0  # Default to local_stub
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
