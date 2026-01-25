#!/usr/bin/env pwsh
# NeuroMed - Complete Setup Script

Write-Host "NeuroMed v2.0 - Setup Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check Tesseract
try {
    $tesseractVersion = tesseract --version 2>&1 | Select-Object -First 1
    Write-Host "[OK] Tesseract: $tesseractVersion" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Tesseract not found. OCR features will not work." -ForegroundColor Yellow
    Write-Host "       Download from: https://github.com/tesseract-ocr/tesseract" -ForegroundColor Yellow
}

Write-Host "`nSetting up Backend..." -ForegroundColor Yellow

# Backend setup
Set-Location backend

# Create virtual environment
if (-Not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
}

# Activate virtual environment and install dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

# Create .env if not exists
if (-Not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit backend\.env with your OpenAI API key (optional)" -ForegroundColor Yellow
}

deactivate

Write-Host "`n🎨 Setting up Frontend..." -ForegroundColor Yellow

# Frontend setup
Set-Location ..\frontend

# Install dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Cyan
npm install

# Create .env.local if not exists
if (-Not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local file..." -ForegroundColor Cyan
    "NEXT_PUBLIC_API_URL=http://localhost:8000" | Out-File -FilePath .env.local -Encoding UTF8
}

Set-Location ..

Write-Host "`nSetup Complete!" -ForegroundColor Green
Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "   1. Start Backend:  cd backend; .\venv\Scripts\Activate.ps1; python -m app.main" -ForegroundColor White
Write-Host "   2. Start Frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "`n   Or use the start script: .\start-dev.ps1" -ForegroundColor White
Write-Host "`nAccess Points:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8000/api/docs" -ForegroundColor White
Write-Host "`nTip: Review README_NEW.md for detailed documentation" -ForegroundColor Yellow
