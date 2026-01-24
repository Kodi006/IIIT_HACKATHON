# LLM Setup Guide - No OpenAI Required! 🎉

This guide explains how to use **FREE alternatives** to OpenAI for your Medox application.

---

## Quick Comparison

| Option         | Cost        | Speed            | Privacy          | Setup Difficulty |
| -------------- | ----------- | ---------------- | ---------------- | ---------------- |
| **Local Demo** | 100% Free   | ⚡ Instant       | 🔒 Fully Private | ✅ None          |
| **Ollama**     | 100% Free   | 🚀 Fast          | 🔒 Fully Private | ⭐ Easy          |
| **Groq**       | 100% Free\* | ⚡⚡⚡ Very Fast | ☁️ Cloud         | ⭐⭐ Easy        |
| **Gemini**     | 100% Free\* | 🚀 Fast          | ☁️ Cloud         | ⭐⭐ Easy        |
| **OpenAI**     | 💰 Paid     | 🚀 Fast          | ☁️ Cloud         | ⭐⭐ Easy        |

\*Free tier with generous limits

---

## Option 1: Local Demo (Current Default) ✅

**Best for**: Quick testing without any setup

- ✅ No installation needed
- ✅ Works offline
- ✅ Fast responses
- ⚠️ Uses rule-based responses (not real AI)

**How to use**: Just select "🎮 Local Demo" in the dropdown - it's already working!

---

## Option 2: Ollama (RECOMMENDED for Privacy) 🏠

**Best for**: Running real AI locally without internet or API keys

### Setup Steps:

1. **Download Ollama**
   - Visit: https://ollama.com/download
   - Download for Windows and install

2. **Pull a Model**

   ```powershell
   # In your terminal:
   ollama pull mistral
   ```

   Other good models:
   - `ollama pull llama2` - Meta's Llama 2
   - `ollama pull phi` - Microsoft's small, fast model
   - `ollama pull codellama` - Code-focused model

3. **Start Ollama Server**

   ```powershell
   ollama serve
   ```

   Keep this running in a separate terminal

4. **Use in App**
   - Select "🏠 Ollama (FREE - Local AI, Private)" from dropdown
   - Click Analyze!

### Benefits:

- ✅ 100% free forever
- ✅ Runs on your machine (no internet needed)
- ✅ Private - your data never leaves your computer
- ✅ Real AI models (Mistral, Llama, etc.)

---

## Option 3: Groq (RECOMMENDED for Speed) ⚡

**Best for**: Fastest responses with real AI, minimal setup

### Setup Steps:

1. **Get Free API Key**
   - Visit: https://console.groq.com
   - Sign up (free)
   - Go to API Keys section
   - Create new API key

2. **Add to Environment**
   Edit your `.env` file in the `backend` folder:

   ```
   GROQ_API_KEY=your_key_here
   ```

3. **Install Package**

   ```powershell
   pip install groq
   ```

4. **Use in App**
   - Select "⚡ Groq (FREE API - Very Fast)" from dropdown
   - Click Analyze!

### Benefits:

- ✅ FREE with generous limits
- ✅⚡ Extremely fast inference
- ✅ Uses Llama 3 models
- ✅ Simple API

---

## Option 4: Google Gemini 🧠

**Best for**: Google's latest AI with free tier

### Setup Steps:

1. **Get Free API Key**
   - Visit: https://makersuite.google.com/app/apikey
   - Sign in with Google account
   - Create API key

2. **Add to Environment**
   Edit your `.env` file in the `backend` folder:

   ```
   GEMINI_API_KEY=your_key_here
   ```

3. **Install Package**

   ```powershell
   pip install google-generativeai
   ```

4. **Use in App**
   - Select "🧠 Google Gemini (FREE Tier)" from dropdown
   - Click Analyze!

### Benefits:

- ✅ FREE tier available
- ✅ Google's latest AI technology
- ✅ Good performance
- ✅ Multimodal capabilities

---

## Option 5: OpenAI (If You Already Have It) 💰

If you already have an OpenAI API key, you can still use it:

1. Add to `.env`: `OPENAI_API_KEY=your_key_here`
2. Select "💰 OpenAI (Paid API Key)" from dropdown
3. Click Analyze!

---

## Troubleshooting

### "ERROR: Ollama is not running"

- Make sure you ran `ollama serve` in a separate terminal
- Check that Ollama is installed

### "ERROR: GROQ_API_KEY not found"

- Make sure you added it to the `.env` file
- Restart the backend server after adding env variables

### "ERROR: groq package not installed"

- Run: `pip install groq`

### "ERROR: GEMINI_API_KEY not found"

- Make sure you added it to the `.env` file
- Restart the backend server

### "ERROR: google-generativeai package not installed"

- Run: `pip install google-generativeai`

---

## Recommended Setup

**For Best Experience:**

1. **Start with Local Demo** - Test the app immediately
2. **Set up Ollama** - For private, offline AI (takes 5 minutes)
3. **Get Groq API key** - For fastest cloud AI (takes 2 minutes)

This gives you 3 options to choose from depending on your needs!

---

## Model Customization

### Change Ollama Model

Edit `backend/app/services/rag_service.py`, line ~478:

```python
"model": "mistral",  # Change to: llama2, phi, codellama, etc.
```

### Change Groq Model

Edit `backend/app/services/rag_service.py`, line ~519:

```python
model="llama3-8b-8192",  # Change to other Groq models
```

---

## Performance Comparison

Based on typical use:

- **Local Demo**: Instant (0.1s) - but not real AI
- **Ollama**: 2-5s per request - depends on your hardware
- **Groq**: 0.3-1s per request - very fast! ⚡
- **Gemini**: 1-3s per request - reliable
- **OpenAI**: 2-4s per request - good quality

---

## Privacy Comparison

- **Local Demo**: ✅ Fully private (runs locally)
- **Ollama**: ✅ Fully private (runs locally, no internet)
- **Groq**: ☁️ Cloud-based (data sent to Groq servers)
- **Gemini**: ☁️ Cloud-based (data sent to Google servers)
- **OpenAI**: ☁️ Cloud-based (data sent to OpenAI servers)

For **medical/sensitive data**, use **Local Demo** or **Ollama**!

---

## Need Help?

Check the error messages - they include instructions on how to fix the issue!
