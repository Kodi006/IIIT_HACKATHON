#!/usr/bin/env pwsh
# Clinical Co-Pilot - Development Startup Script

Write-Host "🚀 Starting Clinical Co-Pilot v2.0..." -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Function to start backend
function Start-Backend {
    Write-Host "🔧 Starting FastAPI Backend..." -ForegroundColor Yellow
    Set-Location backend
    .\venv\Scripts\Activate.ps1
    $env:USE_TF = "0"
    $env:USE_TORCH = "1"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m app.main" -WindowStyle Normal
    Set-Location ..
}

# Function to start frontend
function Start-Frontend {
    Write-Host "🎨 Starting Next.js Frontend..." -ForegroundColor Yellow
    Set-Location frontend
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
    Set-Location ..
}

# Start both services
Start-Backend
Start-Sleep -Seconds 3
Start-Frontend

Write-Host "`n✅ Services are starting up!" -ForegroundColor Green
Write-Host "`n🌐 Access Points:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8000/api/docs" -ForegroundColor White
Write-Host "`n⚠️  Both services are running in separate windows." -ForegroundColor Yellow
Write-Host "   Close those windows to stop the services." -ForegroundColor Yellow
Write-Host "`n💡 Press Ctrl+C to exit this script (services will continue running)" -ForegroundColor Cyan

# Keep script running
Read-Host "`nPress Enter to exit"
