# Clinical Co-Pilot - AI-Powered Clinical Decision Support Demo

A Generative AI-powered Clinical Co-Pilot application that processes unstructured clinical notes to generate SOAP summaries and differential diagnoses with explainable evidence tracing.

## Features

- ✅ **Multi-Input Support**: Accept typed text or image input (OCR via Tesseract)
- ✅ **Section-Aware Processing**: Automatically detects and chunks clinical sections (HPI, PMH, Labs, etc.)
- ✅ **Vector Retrieval**: Uses sentence-transformers + FAISS for semantic chunk retrieval
- ✅ **Two-Step Reasoning**:
  - **Step 1**: Extract structured facts with evidence references
  - **Step 2**: Generate prioritized differential diagnoses (DDx) with confidence levels
- ✅ **SOAP Note Generation**: Produces concise, factual SOAP summaries
- ✅ **Evidence Traceability**: Trace each diagnosis back to specific chunks of the clinical note
- ✅ **Multiple LLM Options**:
  - `local_stub` - Deterministic demo mode (no API/GPU required)
  - `local_transformers` - Local medical LLM (requires GPU)
  - `openai` - OpenAI GPT models (requires API key)

## Prerequisites

### System Requirements

1. **Python 3.8+** installed
2. **Tesseract OCR** for image processing:

   - **Windows**: Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)
   - **macOS**: `brew install tesseract`
   - **Linux**: `sudo apt-get install tesseract-ocr`

3. **GPU (Optional)**: Required only for `local_transformers` mode
   - CUDA-capable GPU with 8GB+ VRAM
   - CUDA Toolkit installed

### API Keys (Optional)

- **OpenAI API Key**: Required only if using `LLM_MODE=openai`
  - Get your key from [OpenAI Platform](https://platform.openai.com/)

## Installation

### Step 1: Clone or Download the Repository

```bash
cd d:\Documents\Web Development\IIIT_HACKATHON
```

### Step 2: Create a Virtual Environment (Recommended)

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Step 3: Install Dependencies

```powershell
pip install -r requirements.txt
```

This will install:

- `streamlit` - Web framework
- `sentence-transformers` - Embedding models
- `faiss-cpu` - Vector similarity search
- `pytesseract` + `pillow` - OCR capabilities
- `openai` - OpenAI API client (optional)
- `transformers`, `torch`, `accelerate`, `bitsandbytes` - Local LLM support (optional)
- `python-dotenv` - Environment variable management

### Step 4: Configure Environment Variables

Copy `.env.example` to `.env`:

```powershell
cp .env.example .env
```

Edit `.env` to set your LLM mode:

```env
# For demo mode (no API/GPU needed):
LLM_MODE=local_stub

# For OpenAI (requires API key):
LLM_MODE=openai
OPENAI_API_KEY=sk-your-actual-key-here

# For local medical LLM (requires GPU):
LLM_MODE=local_transformers
```

### Step 5: Configure Tesseract Path (Windows Only)

If Tesseract is not in your PATH, you may need to specify its location. Add to `hackathon.py` after imports:

```python
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

## Running the Application

### Start the Streamlit App

```powershell
streamlit run hackathon.py
```

The app will open automatically in your default browser at `http://localhost:8501`

### Using the App

1. **Choose Input Mode**:

   - **Typed note**: A sample clinical note is pre-loaded for testing
   - **Upload image**: Upload a photo or scan of handwritten/printed notes

2. **Configure Options** (bottom of left panel):

   - **LLM mode**: Select `local_stub` (demo), `local_transformers` (GPU), or `openai`
   - **Embedder**: Check "Use smaller embedder" for faster processing
   - **Top-k**: Number of chunks to retrieve (default: 6)

3. **Click "Analyze patient note"**

4. **View Results** (right panel):
   - **SOAP Summary**: Structured clinical summary
   - **Step 1 Output**: Extracted structured facts
   - **Step 2 Output**: Differential diagnoses in JSON format
   - **Traceability Explorer**: Select a diagnosis to see evidence chunks

## Sample Clinical Note

The app includes a pre-loaded sample note:

```
35-year-old male presents with fever (102.5°F), severe headache,
and neck stiffness for 3 days. Positive nuchal rigidity and
meningeal signs. WBC elevated at 15,200/μL. Clinical presentation
concerning for bacterial meningitis.
```

You can modify this or paste your own clinical notes.

## Architecture

### Data Flow

```
Clinical Note (Text/Image)
    ↓
OCR (if image) → Tesseract
    ↓
Section Detection → HPI, PMH, Labs, etc.
    ↓
Hierarchical Chunking → Max 1500 chars per chunk
    ↓
Embedding → sentence-transformers (all-mpnet-base-v2)
    ↓
Vector Store → FAISS (Inner Product)
    ↓
Retrieval → Top-K chunks for query
    ↓
LLM Reasoning:
  Step 1: Extract structured facts
  Step 2: Generate DDx with evidence IDs
  Step 3: SOAP note generation
    ↓
UI Display with Traceability
```

### LLM Modes

| Mode                 | Description          | Requirements    | Best For                |
| -------------------- | -------------------- | --------------- | ----------------------- |
| `local_stub`         | Deterministic demo   | None            | Quick testing, demos    |
| `local_transformers` | Llama 3.1 8B Medical | GPU (8GB+ VRAM) | Production, offline use |
| `openai`             | GPT-4/GPT-3.5        | API key         | High accuracy, cloud    |

## Project Structure

```
IIIT_HACKATHON/
├── hackathon.py          # Main Streamlit application
├── requirements.txt      # Python dependencies
├── .env                  # Environment configuration (create from .env.example)
├── .env.example         # Template for environment variables
└── README.md            # This file
```

## Troubleshooting

### Tesseract Not Found

**Error**: `TesseractNotFoundError`

**Solution**: Install Tesseract OCR and add to PATH, or set path in code:

```python
pytesseract.pytesseract.tesseract_cmd = r'C:\Path\To\tesseract.exe'
```

### OpenAI API Errors

**Error**: `AuthenticationError` or `RateLimitError`

**Solution**:

- Verify `OPENAI_API_KEY` in `.env`
- Check API quota at [OpenAI Dashboard](https://platform.openai.com/usage)
- Switch to `local_stub` mode for testing

### GPU/CUDA Issues (local_transformers)

**Error**: `CUDA out of memory` or `No GPU detected`

**Solution**:

- Ensure CUDA is installed: `nvidia-smi`
- Free up GPU memory (close other applications)
- Switch to `local_stub` or `openai` mode
- Reduce `top_k` value

### First Run is Slow

The first run downloads embedding models (~400MB) and caches them. Subsequent runs are much faster.

## Customization

### Change Embedding Model

Edit in `hackathon.py`:

```python
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"  # Smaller, faster
# or
EMBED_MODEL = "pritamdeka/BioBERT-mnli-snli-scinli-scitail-mednli-stsb"  # Medical domain
```

### Add More Clinical Sections

Edit in `hackathon.py`:

```python
SECTION_HEADERS = [
    r"CHIEF COMPLAINT[:\s]*",
    r"DIFFERENTIAL[:\s]*",
    r"DISCHARGE SUMMARY[:\s]*",
    # ... add more
]
```

### Adjust Chunk Size

```python
def chunk_text(text: str, max_chars: int = 1500):  # Increase/decrease
```

## Development Notes

- **Production Ready**: Replace `local_stub` with `local_transformers` or `openai`
- **Medical Model**: Consider using BioBERT or medical-specific embedders
- **Security**: Never commit `.env` with real API keys
- **Performance**: Use GPU for embeddings and local LLM inference
- **Compliance**: Ensure HIPAA compliance for real patient data

## License

This is a hackathon demo project. Adapt and extend as needed for your use case.

## Support

For issues or questions:

1. Check Troubleshooting section above
2. Review logs in the terminal
3. Verify all dependencies are installed correctly

## Disclaimer

⚠️ **This is a demo application for educational/hackathon purposes only.**

- Not validated for clinical use
- Not FDA approved
- Do not use for actual patient care decisions
- Always consult qualified healthcare professionals

---

**Built with**: Streamlit • Sentence Transformers • FAISS • OpenAI • PyTesseract
