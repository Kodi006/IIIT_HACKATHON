import os
import json
import re
from openai import OpenAI
from src.config import LLM_MODE, OPENAI_MODEL

client = None

def call_openai_chat(system_prompt, user_prompt, max_tokens=512, temperature=0.7):
    global client
    if client is None:
        client = OpenAI()
    
    # Use config model
    model = OPENAI_MODEL
    
    response = client.chat.completions.create(
        model=model,
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
    Deterministic local stub for offline demo.
    """
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

    # Step 2: DDx
    if ("differential diagnoses" in lowered or "json array" in lowered or 
        "step1_output" in lowered or "reasoning engine" in system_prompt.lower()):
        
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
                "rationale": "Chest pain with elevated troponin or associated symptoms concerning for acute MI.",
                "evidence": evidence_chunks if evidence_chunks else ["CLINICAL"]
            })
            
        if has_fever and has_elevated_wbc and (has_confusion or "hypotension" in lowered):
            evidence_chunks = []
            for keyword in ["fever", "wbc", "confusion", "pressure"]:
                chunks = extract_chunk_ids(user_prompt, keyword)
                evidence_chunks.extend(chunks)
            evidence_chunks = list(set(evidence_chunks))[:3]
            ddx.append({
                "diagnosis": "Sepsis",
                "confidence": "High",
                "rationale": "Fever with leukocytosis and altered mental status concerning for sepsis.",
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
        return "S: Symptoms...\nO: Vitals...\nA: Assessment...\nP: Plan..."
        
    # Step 1: Extract Facts (simplified for brevity, original logic was extensive)
    if "extract" in system_prompt.lower():
        return "1. Demographics: ...\n2. Symptoms: ...\n3. Vitals: ...\n4. Labs: ...\n5. Assessment: ..."
        
    return "LOCAL_STUB_RESPONSE"

def call_llm(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.0):
    if LLM_MODE == "openai":
        return call_openai_chat(system_prompt, user_prompt, max_tokens, temperature)
    else:
        return call_local_stub(system_prompt, user_prompt, max_tokens, temperature)
