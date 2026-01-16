import faiss
import streamlit as st
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
from src.config import EMBED_MODEL

@st.cache_resource(show_spinner=False)
def load_embedder(model_name: str = EMBED_MODEL):
    return SentenceTransformer(model_name)

def build_index_from_chunks(chunks: List[Dict[str, Any]], embedder: SentenceTransformer):
    """Build a FAISS index from a list of chunk dicts."""
    texts = [c["text"] for c in chunks]
    embeddings = embedder.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    dim = embeddings.shape[1]
    
    index = faiss.IndexFlatIP(dim)
    faiss.normalize_L2(embeddings)
    index.add(embeddings)
    
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
