# System Check Script for Clinical Co-Pilot
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Clinical Co-Pilot - System Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "1. Checking Python..." -ForegroundColor Yellow
$pythonCheck = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCheck) {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✓ $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "   ✗ Python not found" -ForegroundColor Red
}

# Check pip
Write-Host ""
Write-Host "2. Checking pip..." -ForegroundColor Yellow
$pipCheck = Get-Command pip -ErrorAction SilentlyContinue
if ($pipCheck) {
    Write-Host "   ✓ pip found" -ForegroundColor Green
} else {
    Write-Host "   ✗ pip not found" -ForegroundColor Red
}

# Check Tesseract (optional)
Write-Host ""
Write-Host "3. Checking Tesseract OCR (optional)..." -ForegroundColor Yellow
$tesseractCheck = Get-Command tesseract -ErrorAction SilentlyContinue
if ($tesseractCheck) {
    Write-Host "   ✓ Tesseract found" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Tesseract not found - needed for image input" -ForegroundColor Yellow
}

# Check project files
Write-Host ""
Write-Host "4. Checking project files..." -ForegroundColor Yellow
if (Test-Path "requirements.txt") {
    Write-Host "   ✓ requirements.txt found" -ForegroundColor Green
} else {
    Write-Host "   ✗ requirements.txt not found" -ForegroundColor Red
}

if (Test-Path "hackathon.py") {
    Write-Host "   ✓ hackathon.py found" -ForegroundColor Green
} else {
    Write-Host "   ✗ hackathon.py not found" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ready to install and run!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. pip install -r requirements.txt" -ForegroundColor White
Write-Host "  2. streamlit run hackathon.py" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
