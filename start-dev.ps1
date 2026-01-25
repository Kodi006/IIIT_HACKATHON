#!/usr/bin/env pwsh
# NeuroMed - Development Startup Script

Write-Host "Starting NeuroMed v2.0..." -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Get workspace path
$workspacePath = $PSScriptRoot

# Create backend startup script
$backendScript = @"
Write-Host '========================================' -ForegroundColor Yellow
Write-Host 'BACKEND SERVER (FastAPI)' -ForegroundColor Yellow
Write-Host '========================================' -ForegroundColor Yellow
Write-Host ''
Set-Location '$workspacePath\backend'
if (Test-Path '.\venv\Scripts\Activate.ps1') {
    .\venv\Scripts\Activate.ps1
    `$env:USE_TF = '0'
    `$env:USE_TORCH = '1'
    Write-Host 'Starting Backend on http://localhost:8000' -ForegroundColor Green
    Write-Host ''
    python -m app.main
} else {
    Write-Host 'ERROR: Virtual environment not found!' -ForegroundColor Red
    Write-Host 'Please run setup.ps1 first' -ForegroundColor Yellow
    Read-Host 'Press Enter to exit'
}
"@

# Create frontend startup script
$frontendScript = @"
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'FRONTEND SERVER (Next.js)' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Set-Location '$workspacePath\frontend'
if (Test-Path 'package.json') {
    Write-Host 'Starting Frontend on http://localhost:3000' -ForegroundColor Green
    Write-Host ''
    npm run dev
} else {
    Write-Host 'ERROR: package.json not found!' -ForegroundColor Red
    Write-Host 'Please run: npm install' -ForegroundColor Yellow
    Read-Host 'Press Enter to exit'
}
"@

# Save to temp files
$backendScriptPath = Join-Path $env:TEMP "clinical-copilot-backend.ps1"
$frontendScriptPath = Join-Path $env:TEMP "clinical-copilot-frontend.ps1"
$backendScript | Out-File -FilePath $backendScriptPath -Encoding UTF8 -Force
$frontendScript | Out-File -FilePath $frontendScriptPath -Encoding UTF8 -Force

Write-Host "Opening Backend terminal..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$backendScriptPath`""

Start-Sleep -Seconds 2

Write-Host "Opening Frontend terminal..." -ForegroundColor Cyan  
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$frontendScriptPath`""

Write-Host ""
Write-Host "Both terminal windows are now opening!" -ForegroundColor Green
Write-Host ""
Write-Host "Access Points:" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "  API Docs: http://localhost:8000/api/docs" -ForegroundColor Magenta
Write-Host ""
Write-Host "Note: Services are running in separate PowerShell windows." -ForegroundColor Gray
Write-Host "      Close those windows to stop the servers." -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit this script"
