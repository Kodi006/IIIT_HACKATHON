"""
Chat service for interactive RAG-based Q&A about analyzed clinical notes
"""

import time
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

from app.services.rag_service import (
    get_embedder,
    retrieve_from_index,
    call_llm,
    build_index_from_chunks
)


async def chat_with_note(
    question: str,
    analysis_context: Dict[str, Any],
    chat_history: List[Dict[str, str]],
    llm_mode: str = "local_stub",
    top_k: int = 3
) -> Dict[str, Any]:
    """
    Interactive chat about an analyzed clinical note
    
    Args:
        question: User's question
        analysis_context: Full analysis data including chunks, SOAP, DDx
        chat_history: Previous Q&A pairs
        llm_mode: LLM mode to use
        top_k: Number of chunks to retrieve
    
    Returns:
        Dict with answer, relevant_chunks, and sources
    """
    start_time = time.time()
    
    # Extract context components
    all_chunks = analysis_context.get("all_chunks", [])
    soap = analysis_context.get("soap", "")
    ddx = analysis_context.get("ddx", [])
    
    if not all_chunks:
        return {
            "answer": "No analysis context available. Please analyze a clinical note first.",
            "relevant_chunks": [],
            "sources": []
        }
    
    # Get embedder and rebuild index from stored chunks
    embedder = get_embedder(use_small=False)
    index, id_map, _ = build_index_from_chunks(all_chunks, embedder)
    
    # Retrieve relevant chunks for the question
    retrieved = retrieve_from_index(
        query=question,
        embedder=embedder,
        index=index,
        id_map=id_map,
        top_k=top_k
    )
    
    # Build context for LLM
    context_parts = []
    
    # Add SOAP summary
    context_parts.append(f"SOAP Summary:\n{soap}")
    
    # Add differential diagnoses
    if ddx:
        ddx_text = "\n".join([
            f"- {d.get('diagnosis', 'Unknown')}: {d.get('confidence', 'Unknown')} confidence - {d.get('rationale', '')}"
            for d in ddx
        ])
        context_parts.append(f"\nDifferential Diagnoses:\n{ddx_text}")
    
    # Add retrieved chunks
    chunk_context = []
    for r in retrieved:
        chunk_context.append(f"[{r['chunk_id']}] ({r['section']}): {r['text']}")
    context_parts.append(f"\nRelevant Evidence:\n" + "\n\n".join(chunk_context))
    
    full_context = "\n\n".join(context_parts)
    
    # Build chat history context
    history_text = ""
    if chat_history:
        history_lines = []
        for msg in chat_history[-5:]:  # Last 5 messages only
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_lines.append(f"{role.upper()}: {content}")
        history_text = "\n".join(history_lines)
    
    # Create LLM prompt
    system_prompt = """You are a clinical AI assistant helping users understand a clinical note analysis. 
You have access to:
1. The SOAP summary
2. Differential diagnoses with confidence levels
3. Relevant evidence chunks from the original note

Answer the user's question using ONLY the provided context. Be specific and cite chunk IDs when referencing evidence.
If the question cannot be answered from the context, say so clearly."""
    
    user_prompt = f"""CONTEXT:
{full_context}

{'CHAT HISTORY:' + chr(10) + history_text + chr(10) if history_text else ''}
USER QUESTION: {question}

Please provide a clear, evidence-based answer citing specific chunk IDs where applicable."""
    
    # Get LLM response
    answer = call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=512,
        temperature=0.3,
        llm_mode=llm_mode
    )
    
    # Extract chunk IDs mentioned in the answer
    sources = [r['chunk_id'] for r in retrieved]
    
    processing_time = time.time() - start_time
    
    return {
        "answer": answer,
        "relevant_chunks": retrieved,
        "sources": sources,
        "processing_time": processing_time
    }
