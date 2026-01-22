# 🔧 Ollama Troubleshooting Guide

## You Got "Sorry, I encountered an error" in Chat - Here's How to Fix It

### ✅ Quick Fixes (Try These In Order):

---

## Fix #1: Wait Longer (Most Common!)

**The first Ollama request takes 10-30 seconds** because it's loading the 4GB+ model into RAM.

**What to do:**
1. Click "Chat with Note" button
2. Type your question
3. Press Enter
4. **Wait patiently for 15-30 seconds** (especially the first time!)
5. You should see "Thinking..." then get a response

**Why:** I've increased the timeout to 120 seconds, but Next.js frontend might also have its own timeout. Just give it time!

---

## Fix #2: Verify Ollama Is Actually Running

Run this in PowerShell to check:

```powershell
# Check if Ollama process is running
Get-Process | Where-Object {$_.ProcessName -like "*ollama*"}

# Test Ollama directly
curl http://localhost:11434/api/generate -Method POST -Body '{"model":"mistral","prompt":"Hello","stream":false}' -ContentType "application/json"
```

**If Ollama is NOT running:**
- Look for the Ollama icon in your system tray (bottom-right corner)
- If not there, start Ollama from the Windows Start menu
- Or open a NEW PowerShell and run: `ollama serve`

---

## Fix #3: Check Mistral Model is Installed

```powershell
ollama list
```

You should see `mistral` in the list. If not:

```powershell
ollama pull mistral
```

Wait for it to download (it's ~4GB).

---

## Fix #4: Restart Backend Server

The backend might need to reload after the code changes:

1. Go to the terminal running `start-dev.ps1`
2. Press `Ctrl+C` to stop it
3. Run again: `.\start-dev.ps1`
4. Wait for "Uvicorn running on http://0.0.0.0:8000"
5. Try the chat again

---

## Fix #5: Use the Analysis Feature First (Not Chat)

Make sure Ollama works for analysis before trying chat:

1. Go to http://localhost:3000
2. Select **"🏠 Ollama"** in the LLM Mode dropdown
3. Click **"Analyze Note"** (NOT chat yet)
4. Wait 15-30 seconds
5. Do you see analysis results?

**If YES** → Ollama is working! Now try chat.  
**If NO** → Check fixes above.

---

## Current Status Check

Let me check what's happening right now:

### Is Ollama Running?
Run: `Get-Process | Where-Object {$_.ProcessName -like "*ollama*"}`
- ✅ If you see output → Ollama is running
- ❌ If empty → Start Ollama

### Is Ollama Responding?
Run: `curl http://localhost:11434/api/tags`
- ✅ If you get JSON → Ollama API is working
- ❌ If error → Ollama server is not responding

### Are Both Servers Running?
- Backend (FastAPI): http://localhost:8000/health
- Frontend (Next.js): http://localhost:3000

---

## What I Changed to Help:

1. ✅ Increased Ollama timeout from 60s to 120s
2. ✅ Added better error messages (timeout, connection, HTTP errors)
3. ✅ Frontend now shows actual error details instead of generic message

---

## Still Not Working?

### Try Local Demo First

While we troubleshoot Ollama:

1. Select **"🎮 Local Demo"** from LLM Mode dropdown
2. Click "Analyze Note"
3. This works instantly (no Ollama needed)
4. Once you see results, try the chat
5. The demo mode works for chat too!

This proves the app itself is working - it's just Ollama that needs setup.

---

## Common Error Messages & What They Mean:

| Error Message | What It Means | Fix |
|---------------|---------------|-----|
| "Ollama is not running" | Ollama service not started | Start Ollama from system tray or run `ollama serve` |
| "Request timed out" | Ollama is loading model (first time is slow) | Wait longer! Try again after 30 seconds |
| "HTTP error" | Model not found | Run `ollama pull mistral` |
| "Chat request failed" | Backend not responding | Check backend is running on port 8000 |

---

## Debug: See Actual Error Message

1. Open browser DevTools (F12)
2. Go to "Console" tab
3. Try the chat again
4. Look for error messages - they'll show the REAL error
5. Share that with me if you need more help!

---

## My Recommendation:

**For now, use "🎮 Local Demo" mode** - it works perfectly and requires zero setup!

Then when you have time:
1. Make sure Ollama service is running
2. Test with the simple curl command above
3. Once that works, the app will work too!
