"""
General Medical Chatbot Service
Handles general health queries independent of clinical notes
"""

import time
from typing import List, Dict, Any

from app.services.rag_service import call_llm


# System prompt with medical assistant persona and safety guardrails
MEDICAL_ASSISTANT_SYSTEM_PROMPT = """You are a friendly, knowledgeable medical assistant helping patients understand general health topics.

GUIDELINES:
1. Provide accurate, general medical information based on commonly accepted medical knowledge
2. Always recommend consulting a healthcare provider for specific concerns or symptoms
3. Never diagnose conditions or prescribe specific treatments or medications
4. If asked about emergencies (chest pain, difficulty breathing, severe bleeding, etc.), immediately advise calling emergency services (911)
5. Be empathetic, supportive, and use clear, simple language patients can understand
6. When discussing medications, only provide general information and always advise consulting a pharmacist or doctor
7. For mental health topics, be supportive and recommend professional help when appropriate

LIMITATIONS - You must decline to:
- Interpret specific lab results, imaging, or test results
- Recommend specific medications or dosages
- Provide a diagnosis for symptoms
- Give advice that contradicts a patient's healthcare provider

If you're uncertain about something, say "I'm not certain about this specific topic - please consult your healthcare provider for accurate guidance."

Always end responses about symptoms or health concerns with a reminder to consult a healthcare professional."""


async def general_medical_chat(
    question: str,
    chat_history: List[Dict[str, str]],
    llm_mode: str = "groq"
) -> Dict[str, Any]:
    """
    Handle general medical queries from patients
    
    Args:
        question: User's health-related question
        chat_history: Previous messages in conversation
        llm_mode: LLM provider to use
    
    Returns:
        Dict with answer, disclaimer, and processing_time
    """
    start_time = time.time()
    
    # Build conversation context from chat history (last 10 messages)
    history_text = ""
    if chat_history:
        history_lines = []
        for msg in chat_history[-10:]:
            role = msg.get("role", "user").upper()
            content = msg.get("content", "")
            history_lines.append(f"{role}: {content}")
        history_text = "\n".join(history_lines)
    
    # Create user prompt with history context
    user_prompt = f"""{"CONVERSATION HISTORY:" + chr(10) + history_text + chr(10) + chr(10) if history_text else ""}USER QUESTION: {question}

Please provide a helpful, accurate response following the guidelines. If this is a health concern, remind the user to consult a healthcare professional."""
    
    # Call LLM
    answer = call_llm(
        system_prompt=MEDICAL_ASSISTANT_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=600,
        temperature=0.4,
        llm_mode=llm_mode
    )
    
    processing_time = time.time() - start_time
    
    # Standard medical disclaimer
    disclaimer = "This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider."
    
    return {
        "answer": answer,
        "disclaimer": disclaimer,
        "processing_time": processing_time
    }
