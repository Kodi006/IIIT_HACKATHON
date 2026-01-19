# FastAPI Backend - Clinical Co-Pilot

Modern, async REST API built with FastAPI for clinical decision support.

## Features

- 🚀 Fast async endpoints with FastAPI
- 🤖 RAG-powered clinical analysis
- 📄 OCR for clinical note images
- 🔍 Vector search with FAISS
- 🧠 LLM integration (OpenAI + Local stub)
- 📊 Structured clinical data extraction

## Setup

### Prerequisites

- Python 3.11+
- Tesseract OCR installed on system

### Installation

```bash
# Create virtual environment
python -m venv venv

# Activate
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
OPENAI_API_KEY=your_key_here  # Optional, only for OpenAI mode
LLM_MODE=local_stub  # or "openai"
OPENAI_MODEL=gpt-4o-mini
```

## Running the Server

```bash
# Development mode with hot reload
uvicorn app.main:app --reload --port 8000

# Or use Python
python -m app.main
```

Server will start at `http://localhost:8000`

- API Docs: http://localhost:8000/api/docs
- Health Check: http://localhost:8000/api/health

## API Endpoints

### Health

- `GET /api/health` - Health check
- `GET /api/ready` - Readiness probe
- `GET /api/live` - Liveness probe

### OCR

- `POST /api/ocr/extract` - Extract text from image

### Analysis

- `POST /api/analysis/analyze` - Analyze clinical note
- `GET /api/analysis/test` - Test endpoint

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── models/
│   │   └── schemas.py       # Pydantic models
│   ├── routes/
│   │   ├── health.py        # Health endpoints
│   │   ├── ocr.py           # OCR endpoints
│   │   └── analysis.py      # Analysis endpoints
│   └── services/
│       ├── ocr_service.py   # OCR logic
│       └── rag_service.py   # RAG pipeline
└── requirements.txt
```

## Development

```bash
# Install dev dependencies
pip install pytest black flake8 mypy

# Format code
black app/

# Run tests
pytest
```

## Performance

- First request: ~30s (model loading)
- Subsequent requests: ~2-5s
- Concurrent requests supported

## Notes

- Models are cached after first load
- Use `local_stub` mode for demos (no API key needed)
- Use `openai` mode for production-quality results
