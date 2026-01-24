# Medox v2.0 🏥✨

> **Modern, AI-Powered Clinical Decision Support System**

A stunning, production-ready web application built with **Next.js 14**, **FastAPI**, and **RAG technology** for intelligent clinical note analysis and differential diagnosis generation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11%2B-brightgreen)
![Next.js](https://img.shields.io/badge/next.js-15-black)

---

## 🌟 Key Features

### 🤖 **AI-Powered Analysis**

- **Retrieval-Augmented Generation (RAG)** for evidence-based insights
- **Sentence Transformers** for semantic understanding
- **FAISS** vector search for chunk retrieval
- Support for **OpenAI** and local LLM modes

### 📊 **Clinical Intelligence**

- **SOAP Note Generation** - Automated clinical documentation
- **Differential Diagnoses** - Evidence-based diagnostic suggestions with confidence levels
- **Evidence Traceability** - Direct links to supporting clinical data
- **Hierarchical Chunking** - Section-aware document processing

### 🎨 **Modern UI/UX**

- **Glassmorphism** design with smooth animations
- **Drag & Drop** file upload with OCR support
- **Real-time** processing indicators
- **Responsive** design for all devices
- **Dark mode** optimized interface

### 🔬 **Advanced Technology**

- **FastAPI** async backend with automatic OpenAPI docs
- **Next.js 14** App Router with React Server Components
- **Framer Motion** for fluid animations
- **Tailwind CSS** with custom design system
- **TypeScript** for type safety

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│           Next.js 14 Frontend (Port 3000)       │
│  • React 18 with App Router                     │
│  • Tailwind CSS + Framer Motion                 │
│  • TypeScript for type safety                   │
└─────────────────┬───────────────────────────────┘
                  │ REST API (Axios)
                  │
┌─────────────────▼───────────────────────────────┐
│           FastAPI Backend (Port 8000)           │
│  • Async endpoints with Pydantic validation     │
│  • CORS-enabled for cross-origin requests       │
│  • Structured error handling                    │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        │                   │
┌───────▼────┐    ┌─────────▼────────┐
│ OCR Service│    │   RAG Pipeline   │
│            │    │                  │
│ Pytesseract│    │ • Embeddings     │
│            │    │ • FAISS Index    │
│            │    │ • LLM Reasoning  │
└────────────┘    └──────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

**Backend:**

- Python 3.11+
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) installed on system

**Frontend:**

- Node.js 18+ and npm/yarn/pnpm

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd IIIT_HACKATHON
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Edit .env with your OpenAI API key (optional for local_stub mode)

# Start backend server
python -m app.main
```

Backend will start at: **http://localhost:8000**

- API Docs: http://localhost:8000/api/docs

#### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

Frontend will start at: **http://localhost:3000**

---

## 📖 Usage Guide

### Basic Workflow

1. **Input Clinical Note**
   - Type or paste clinical note directly
   - Or upload an image (JPG/PNG) for OCR extraction

2. **Configure Analysis**
   - Choose LLM mode: `local_stub` (free, demo) or `openai` (requires API key)
   - Adjust retrieval parameters if needed

3. **Analyze**
   - Click "Analyze Note" button
   - Wait 2-30 seconds (first run may be slower due to model loading)

4. **Review Results**
   - **SOAP Summary** - Structured clinical documentation
   - **Differential Diagnoses** - Top 3 diagnoses with confidence levels
   - **Evidence Chunks** - Traceable supporting documentation

### OCR Feature

Upload images of:

- Handwritten clinical notes
- Scanned documents
- Photos of whiteboard notes
- Printed clinical records

The system will extract text using Tesseract OCR, which you can then edit before analysis.

---

## 🔑 Environment Variables

### Backend (.env)

```env
OPENAI_API_KEY=sk-...              # Optional, only for OpenAI mode
LLM_MODE=local_stub                # or "openai"
OPENAI_MODEL=gpt-4o-mini           # GPT model to use
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📁 Project Structure

```
IIIT_HACKATHON/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── main.py            # Application entry point
│   │   ├── models/            # Pydantic schemas
│   │   ├── routes/            # API endpoints
│   │   │   ├── health.py      # Health checks
│   │   │   ├── ocr.py         # OCR endpoints
│   │   │   └── analysis.py    # Analysis endpoints
│   │   └── services/          # Business logic
│   │       ├── ocr_service.py # OCR processing
│   │       └── rag_service.py # RAG pipeline
│   ├── requirements.txt
│   └── README.md
│
├── frontend/                   # Next.js Frontend
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Main page
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   ├── lib/                   # Utilities
│   │   ├── api.ts             # API client
│   │   └── utils.ts           # Helper functions
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.js
│
├── hackathon.py               # Original Streamlit app (legacy)
└── README.md                  # This file
```

---

## 🎨 UI Features

### Design Elements

- **Glassmorphism** - Frosted glass effect with backdrop blur
- **Gradient Text** - Multi-color animated gradients
- **Smooth Animations** - Framer Motion powered transitions
- **Confidence Meters** - Visual progress bars for diagnoses
- **Evidence Highlighting** - Interactive chunk traceability
- **Responsive Grid** - Adapts to all screen sizes

### Color Scheme

- **Primary**: Blue (Clinical trust and professionalism)
- **Secondary**: Purple (Innovation and technology)
- **Accent**: Pink (Diagnostic highlights)
- **Success**: Green (High confidence indicators)
- **Warning**: Yellow (Medium confidence)
- **Error**: Red (Low confidence and errors)

---

## 🔧 API Endpoints

### Health

```http
GET /api/health          # System health check
GET /api/ready           # Kubernetes readiness probe
GET /api/live            # Kubernetes liveness probe
```

### OCR

```http
POST /api/ocr/extract
Content-Type: application/json

{
  "image_base64": "data:image/png;base64,..."
}
```

### Analysis

```http
POST /api/analysis/analyze
Content-Type: application/json

{
  "text": "Clinical note text...",
  "llm_mode": "local_stub",
  "top_k": 6,
  "use_small_embedder": false
}
```

Full API documentation available at: **http://localhost:8000/api/docs**

---

## 🧪 Development

### Backend Development

```bash
# Run with hot reload
uvicorn app.main:app --reload --port 8000

# Format code
black app/

# Type checking
mypy app/

# Run tests
pytest
```

### Frontend Development

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

---

## 🚢 Deployment

### Backend (Docker)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install Tesseract
RUN apt-get update && apt-get install -y tesseract-ocr

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend (Vercel/Netlify)

```bash
# Build command
npm run build

# Output directory
.next

# Environment variables
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

---

## 🎯 Hackathon Winning Features

### Innovation

- **RAG-Powered Intelligence** - Cutting-edge retrieval augmented generation
- **Evidence Traceability** - Transparent AI reasoning with source attribution
- **Hybrid LLM Support** - Works offline or with cloud APIs

### User Experience

- **Stunning Modern UI** - Glassmorphism and smooth animations
- **Instant Feedback** - Real-time processing indicators
- **Accessibility** - Works on mobile, tablet, and desktop

### Technical Excellence

- **Clean Architecture** - Separated concerns, modular design
- **Type Safety** - Full TypeScript and Pydantic validation
- **Production Ready** - Error handling, logging, health checks
- **Well Documented** - Comprehensive README and inline comments

### Clinical Value

- **SOAP Automation** - Saves clinician time
- **Evidence-Based** - All suggestions tied to clinical data
- **Educational Tool** - Perfect for medical students and residents

---

## ⚠️ Disclaimer

**This is an educational prototype and demonstration tool.**

- Not intended for clinical use
- Not FDA approved or clinically validated
- Should not replace professional medical judgment
- For educational and research purposes only

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **Sentence Transformers** - Semantic embeddings
- **FAISS** - Efficient vector search
- **FastAPI** - Modern Python web framework
- **Next.js** - React framework
- **Framer Motion** - Animation library
- **shadcn/ui** - UI component inspiration

---

## 📞 Support

For questions or issues:

- Open a GitHub Issue
- Check API documentation at `/api/docs`
- Review inline code comments

---

**Built with ❤️ for IIIT Hackathon**

_Transform clinical notes into intelligent insights_
