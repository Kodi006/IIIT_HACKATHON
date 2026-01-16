import uuid
import json
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from src.utils import split_into_sections, chunk_text
from src.vector_store import build_index_from_chunks, retrieve_from_index
from src.llm_service import call_llm

def prepare_chunks_from_text(full_text: str, doc_id: int = 0) -> List[Dict[str, Any]]:
    sections = split_into_sections(full_text)
    chunks = []
    chunk_seq = 0
    for sec in sections:
        header = sec["section"] if sec["section"] else "UNLABELED"
        body = sec["body"] if sec["body"] else ""
        sec_chunks = chunk_text(body, max_chars=1500)
        for c in sec_chunks:
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

def generate_summary_and_ddx(full_text: str, embedder: SentenceTransformer, top_k: int = 8):
    # Step A: chunk and index
    chunks = prepare_chunks_from_text(full_text)
    index, id_map, embeddings = build_index_from_chunks(chunks, embedder)

    # retrieve
    retrieved = retrieve_from_index(full_text, embedder, index, id_map, top_k=top_k)

    # context
    context_parts = []
    for r in retrieved:
        context_parts.append(f"[{r['chunk_id']}][{r['section']}]: {r['text']}")
    context = "\n\n".join(context_parts)

    # Step 1: Extract facts
    step1_system = "You are a clinical extractor. Extract and organize facts from the provided context into categories. Do not make diagnoses."
    step1_user = f"CONTEXT:\n{context}\n\nExtract into categories:\n1. Patient History & Demographics:\n2. Chief Complaint & Symptoms:\n3. Physical Exam & Vitals:\n4. Key Lab & Imaging Findings:\n5. Clinician's Stated Assessment:\n\nInclude chunk ids in brackets after each finding."
    step1_output = call_llm(step1_system, step1_user)

    # Step 2: DDx
    step2_system = "You are a clinical reasoning engine. Use ONLY the structured facts provided from Step 1 to produce a prioritized differential diagnosis."
    step2_user = f"STEP1_OUTPUT:\n{step1_output}\n\nTask: Provide the top 3 differential diagnoses as a JSON array."
    step2_output = call_llm(step2_system, step2_user)

    # SOAP
    soap_system = "You are a professional medical summarization agent. Produce a concise, factual SOAP note using only the context given below."
    soap_user = f"CONTEXT:\n{context}\n\nProduce SOAP: S (Subjective), O (Objective), A (Assessment), P (Plan)."
    soap_output = call_llm(soap_system, soap_user)

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
