import os
from dotenv import load_dotenv

load_dotenv()

########################
# Configuration
########################

EMBED_MODEL = "sentence-transformers/all-mpnet-base-v2"
EMBED_DIM = 768
LLM_MODE = os.getenv("LLM_MODE", "openai")  # "openai" or "local_stub"
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", None)

# Section headers to detect in clinical notes
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
