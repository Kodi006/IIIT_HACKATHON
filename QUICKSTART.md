# ⚡ Quick Start Guide

## 🚀 Get Running in 5 Minutes!

### Prerequisites Check

```powershell
python --version  # Need 3.11+
node --version    # Need 18+
tesseract --version  # Optional, for OCR
```

### 1️⃣ Run Automated Setup

```powershell
.\setup.ps1
```

This installs all dependencies for both backend and frontend.

### 2️⃣ Start Development Servers

```powershell
.\start-dev.ps1
```

This opens two new windows running:

- Backend at http://localhost:8000
- Frontend at http://localhost:3000

### 3️⃣ Access the Application

Open your browser to: **http://localhost:3000**

---

## 💡 First Use

1. The sample clinical note is pre-loaded
2. Click **"Analyze Note"** button
3. Wait 2-5 seconds (first run may take longer)
4. See results:
   - SOAP summary
   - Differential diagnoses
   - Evidence traceability

---

## 🎯 Try These Features

### Upload an Image

1. Drag & drop any clinical note image
2. Wait for OCR processing
3. Edit extracted text if needed
4. Click Analyze

### Explore Diagnoses

1. Click on any diagnosis card
2. See evidence chunks
3. View confidence levels
4. Check color-coded severity

### Switch LLM Mode

- **Local (Demo)** - Free, no API key needed
- **OpenAI** - Better results, requires API key in `backend/.env`

---

## 📚 Key Files to Know

### Configuration

- `backend/.env` - Backend settings (API keys)
- `frontend/.env.local` - Frontend API URL

### Documentation

- `README_NEW.md` - Complete guide
- `PROJECT_SUMMARY.md` - Full project overview
- `backend/README.md` - Backend details
- `frontend/README.md` - Frontend details

### Scripts

- `setup.ps1` - Initial setup
- `start-dev.ps1` - Start both servers

---

## 🐛 Troubleshooting

### Backend won't start

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend won't start

```powershell
cd frontend
rm -rf node_modules
npm install
```

### OCR not working

Install Tesseract OCR:
https://github.com/tesseract-ocr/tesseract

### Port already in use

```powershell
# Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 🎨 Customization Ideas

### Change Colors

Edit `frontend/tailwind.config.js` - modify color definitions

### Add Your Logo

Place in `frontend/public/` and import in `layout.tsx`

### Modify Sample Note

Edit `SAMPLE_NOTE` constant in `frontend/app/page.tsx`

### Adjust AI Parameters

In `frontend/app/page.tsx`:

- Change `top_k` for more/fewer chunks
- Toggle `use_small_embedder` for speed/accuracy

---

## 📊 API Endpoints

Visit http://localhost:8000/api/docs for interactive documentation

### Key Endpoints

- `POST /api/ocr/extract` - Extract text from image
- `POST /api/analysis/analyze` - Analyze clinical note
- `GET /api/health` - Check system health

---

## ✅ Success Checklist

- [ ] Both servers running without errors
- [ ] Frontend loads at localhost:3000
- [ ] Can click "Analyze Note" button
- [ ] Results appear with SOAP and diagnoses
- [ ] Animations are smooth
- [ ] No console errors

---

## 🆘 Need Help?

1. Check `README_NEW.md` for detailed docs
2. Review `PROJECT_SUMMARY.md` for architecture
3. Check browser console for errors (F12)
4. Check backend terminal for Python errors
5. Verify all dependencies installed

---

## 🎉 You're Ready!

**The application is fully functional and ready to demo!**

Key highlights to show:

- ✨ Stunning glassmorphism UI
- 🎨 Smooth animations
- 🧠 AI-powered analysis
- 📊 Evidence-based diagnoses
- 🔍 Interactive results

**Go impress those judges! 🏆**
