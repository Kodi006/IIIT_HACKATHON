'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Brain, Activity, Loader2,
  AlertCircle, CheckCircle, Sparkles, TrendingUp,
  FileSearch, Stethoscope, ChevronRight, MessageCircle, Copy, Check
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { clinicalAPI, type AnalysisResponse, type DiagnosisItem } from '@/lib/api';
import { cn, formatConfidence } from '@/lib/utils';
import ChatInterface from './components/ChatInterface';
import NavBar from './components/NavBar';
import DigitalAurora from '@/app/components/DigitalAurora';
// Sample clinical note
const SAMPLE_NOTE = `CHIEF COMPLAINT: Fever, headache, and neck stiffness for 3 days.

HISTORY OF PRESENT ILLNESS:
Patient is a 35-year-old male presenting to the emergency department with a 3-day history of progressively worsening fever (up to 102.5°F), severe headache, and neck stiffness. He reports photophobia and nausea with one episode of vomiting. Denies recent head trauma, sick contacts, or travel.

PAST MEDICAL HISTORY:
- No significant past medical history
- No chronic medications
- No known drug allergies

PHYSICAL EXAMINATION:
- Vitals: Temp 101.8°F, HR 110 bpm, BP 128/82 mmHg, RR 18, O2 sat 98%
- General: Appears ill, in moderate distress
- HEENT: Pupils equal and reactive, photophobia noted
- Neck: Positive nuchal rigidity, Kernig's and Brudzinski's signs positive
- Neurological: Alert and oriented x3, no focal neurological deficits

LABORATORY:
- WBC: 15,200/μL (elevated)
- Neutrophils: 82% (elevated)
- CRP: 45 mg/L (elevated)

ASSESSMENT:
Clinical presentation highly concerning for bacterial meningitis.

PLAN:
- Urgent LP for CSF analysis
- Start empiric IV antibiotics
- CT head if LP delayed
- Admit to ICU`;

export default function Home() {
  const [noteText, setNoteText] = useState(SAMPLE_NOTE);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [llmMode, setLlmMode] = useState<string>('local_stub');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessingOCR(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const response = await clinicalAPI.extractText(base64);

        if (response.success) {
          setNoteText(response.text);
        } else {
          setError(response.error || 'OCR failed');
        }
        setIsProcessingOCR(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
      setIsProcessingOCR(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxFiles: 1,
  });

  const handleAnalyze = async () => {
    if (!noteText.trim()) {
      setError('Please provide a clinical note');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setSelectedDiagnosis(null);
    setActiveTab('diagnosis'); // Switch to results tab while analyzing

    try {
      const response = await clinicalAPI.analyze({
        text: noteText,
        llm_mode: llmMode,
        top_k: 6,
        use_small_embedder: false,
      });

      setResult(response);
    } catch (err: any) {
      let errorMessage = err.message || 'Analysis failed';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'object') {
          errorMessage = JSON.stringify(err.response.data.detail);
        } else {
          errorMessage = err.response.data.detail;
        }
      }
      setError(errorMessage);
      // If failed, maybe stay on diagnosis tab to show error, or user can switch back
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 selection:bg-fuchsia-500/40 overflow-hidden relative">
      <DigitalAurora />

      <NavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showChat={showChat}
        setShowChat={setShowChat}
      />

      {/* Spacer for fixed navbar */}
      <div className="h-24" />

      <main className="max-w-7xl mx-auto p-4 md:p-8 relative z-10">
        <AnimatePresence mode="wait">

          {/* HOME TAB */}
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center pt-12 text-center"
            >
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full glass border border-fuchsia-500/40 shadow-lg shadow-fuchsia-500/30">
                <Sparkles className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                <span className="text-sm text-fuchsia-200 font-medium">AI-Powered Clinical Intelligence</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-pink-400 animate-gradient">
                  Clinical Co-Pilot
                </span>
                <span className="block text-2xl md:text-3xl mt-4 text-slate-500 font-normal">
                  Next-Gen Decision Support
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
                Transform unstructured clinical notes into actionable insights.
                Powered by advanced RAG technology for evidence-based differential diagnoses.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('note')}
                  className="px-8 py-4 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white rounded-full font-bold hover:from-fuchsia-400 hover:to-cyan-400 transition-all flex items-center gap-2 shadow-xl shadow-fuchsia-500/40 hover:shadow-fuchsia-500/60"
                >
                  Get Started <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => window.open('https://ollama.com', '_blank')}
                  className="px-8 py-4 glass rounded-full font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  Download Ollama
                </button>
              </div>

              {/* Feature Cards */}
              <div className="grid md:grid-cols-4 gap-4 mt-16 w-full max-w-4xl">
                {[
                  { icon: Brain, title: 'RAG-Powered', desc: 'Retrieval-augmented generation', color: 'blue' },
                  { icon: MessageCircle, title: 'AI Chat', desc: 'Interactive Q&A', color: 'purple', onClick: () => setShowChat(true) },
                  { icon: FileSearch, title: 'SOAP Notes', desc: 'Auto-generated summaries', color: 'green' },
                  { icon: Activity, title: 'Evidence', desc: 'Full traceability', color: 'pink' },
                ].map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    onClick={feature.onClick}
                    className={`feature-card glass rounded-xl p-5 border border-${feature.color}-500/20 text-left ${feature.onClick ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
                  >
                    <feature.icon className={`w-8 h-8 text-${feature.color}-400 mb-3`} />
                    <h3 className="font-bold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-400">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CLINICAL NOTE TAB */}
          {activeTab === 'note' && (
            <motion.div
              key="note"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <FileText className="w-6 h-6 text-purple-400" />
                  Input Clinical Data
                </h2>

                {/* LLM Selector in Header */}
                <div className="flex items-center gap-3 bg-slate-900/50 p-1.5 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-500 font-medium px-2">Model:</span>
                  <select
                    value={llmMode}
                    onChange={(e) => setLlmMode(e.target.value as any)}
                    className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="local_stub">🎮 Local Demo</option>
                    <option value="ollama">🏠 Ollama (Llama 3.2)</option>
                    <option value="groq">⚡ Groq</option>
                    <option value="gemini">🧠 Gemini</option>
                    <option value="openai">💰 OpenAI</option>
                  </select>
                </div>
              </div>

              {/* Image Upload Card */}
              <div className="glass rounded-2xl p-6 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Upload className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Upload Handwriting/Image</h3>
                </div>

                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                    isDragActive
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-300 mb-2">
                    {isDragActive ? 'Drop image here...' : 'Drag & drop an image or click to browse'}
                  </p>
                  <p className="text-sm text-slate-500">Supports JPG, PNG (OCR)</p>
                </div>

                {isProcessingOCR && (
                  <div className="mt-4 flex items-center gap-2 text-blue-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Processing image with OCR...</span>
                  </div>
                )}
              </div>

              {/* Text Input Card */}
              <div className="glass rounded-2xl p-6 border border-fuchsia-500/30 shadow-lg shadow-fuchsia-500/10">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full h-96 bg-slate-900/50 border border-slate-700 rounded-xl p-6 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-mono text-sm leading-relaxed"
                  placeholder="Paste or type clinical note here..."
                />

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !noteText.trim()}
                    className={cn(
                      "px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg",
                      isAnalyzing || !noteText.trim()
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-pink-500 hover:from-cyan-400 hover:via-fuchsia-400 hover:to-pink-400 text-white shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50"
                    )}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5" />
                        Analyze & Generate Diagnosis
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-4 border border-red-500/50 bg-red-500/10"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-red-300 font-semibold mb-1">Error</h3>
                      <p className="text-red-200 text-sm">{error}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* DIAGNOSIS TAB */}
          {activeTab === 'diagnosis' && (
            <motion.div
              key="diagnosis"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-5xl mx-auto"
            >
              {!result && !isAnalyzing && (
                <div className="flex flex-col items-center justify-center p-12 glass rounded-3xl border border-slate-800">
                  <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center mb-6 border border-slate-800">
                    <Activity className="w-10 h-10 text-slate-700" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-300 mb-2">No Analysis Results Yet</h3>
                  <p className="text-slate-500 mb-8 max-w-sm text-center">
                    Go to the "Clinical Note" tab and submit a case to generate a differential diagnosis.
                  </p>
                  <button
                    onClick={() => setActiveTab('note')}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-medium transition-colors"
                  >
                    Go to Input
                  </button>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center p-12 glass rounded-3xl border border-fuchsia-500/30 shadow-2xl shadow-fuchsia-500/20">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-spin w-20 h-20"></div>
                    <div className="w-20 h-20 flex items-center justify-center">
                      <Brain className="w-8 h-8 text-fuchsia-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-6">Analyzing Clinical Data</h3>

                  {/* Progress Steps */}
                  <div className="w-full max-w-md space-y-3">
                    {[
                      { step: 1, label: 'Extracting clinical facts', delay: 0 },
                      { step: 2, label: 'Building evidence index', delay: 2 },
                      { step: 3, label: 'Generating differential diagnoses', delay: 5 },
                      { step: 4, label: 'Preparing SOAP summary', delay: 8 },
                    ].map((item) => (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0.3 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: item.delay, duration: 0.5 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 shimmer"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-400">{item.step}</span>
                        </div>
                        <span className="text-sm text-slate-300">{item.label}</span>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400 ml-auto" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-8">
                  {/* Results Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Analysis Results</h2>
                      <p className="text-slate-400 text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Processed in {result.processing_time.toFixed(2)}s
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-8 lg:grid-cols-2">
                    {/* Left Column: SOAP & Diagnosis */}
                    <motion.div
                      layout
                      className="lg:col-span-2 space-y-6"
                    >

                      {/* SOAP Summary - Always here */}
                      <div className="glass rounded-2xl p-6 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <FileSearch className="w-5 h-5 text-green-400" />
                            <h3 className="text-lg font-semibold text-white">SOAP Summary</h3>
                          </div>
                          <button
                            onClick={() => copyToClipboard(result.soap)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
                          >
                            {copied ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="bg-slate-950/50 rounded-xl p-5 text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed border border-slate-800">
                          {result.soap}
                        </pre>
                      </div>

                      {/* DDx List - Always Visible */}
                      <div className="glass rounded-2xl p-6 border border-pink-500/30 shadow-lg shadow-pink-500/10">
                        <div className="flex items-center gap-3 mb-6">
                          <Activity className="w-5 h-5 text-pink-400" />
                          <h3 className="text-lg font-semibold text-white">Differential Diagnosis</h3>
                        </div>

                        <div className="space-y-4">
                          {result.ddx?.map((dx: DiagnosisItem, idx: number) => {
                            const conf = formatConfidence(dx.confidence);
                            const isSelected = selectedDiagnosis === dx.diagnosis;

                            return (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setSelectedDiagnosis(isSelected ? null : dx.diagnosis)}
                                className={cn(
                                  "bg-slate-900/40 rounded-xl p-5 border cursor-pointer transition-all group",
                                  isSelected
                                    ? "border-pink-500/50 bg-pink-500/5"
                                    : "border-slate-800 hover:border-pink-500/30 hover:bg-slate-800/80"
                                )}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      {/* Confidence Meter */}
                                      <div className="relative w-10 h-10 flex-shrink-0">
                                        <svg className="confidence-ring w-10 h-10" viewBox="0 0 36 36">
                                          <circle
                                            cx="18" cy="18" r="15"
                                            fill="none"
                                            stroke="rgba(148, 163, 184, 0.2)"
                                            strokeWidth="3"
                                          />
                                          <circle
                                            cx="18" cy="18" r="15"
                                            fill="none"
                                            stroke={dx.confidence === 'High' ? '#22c55e' : dx.confidence === 'Medium' ? '#eab308' : '#ef4444'}
                                            strokeWidth="3"
                                            strokeDasharray={`${conf.percentage * 0.94} 94`}
                                            strokeLinecap="round"
                                          />
                                        </svg>
                                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                                          {conf.percentage}%
                                        </span>
                                      </div>
                                      <h3 className="text-lg font-semibold text-white group-hover:text-pink-200 transition-colors">{dx.diagnosis}</h3>
                                    </div>
                                  </div>
                                  <div className={cn("px-2 py-1 rounded text-xs font-bold bg-slate-800 border border-slate-700", conf.color)}>
                                    {dx.confidence}
                                  </div>
                                </div>

                                <p className="text-slate-400 text-sm mb-3 leading-relaxed">{dx.rationale}</p>

                                {isSelected && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-4 pt-4 border-t border-slate-800 space-y-4"
                                  >
                                    {/* Red Flags - Show first if present */}
                                    {dx.red_flags && (
                                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <span className="text-xs font-semibold text-red-400 block mb-1">⚠️ Red Flags:</span>
                                        <p className="text-sm text-red-300">{dx.red_flags}</p>
                                      </div>
                                    )}

                                    {/* Workup Recommendations */}
                                    {dx.workup && (
                                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <span className="text-xs font-semibold text-blue-400 block mb-1">🔬 Recommended Workup:</span>
                                        <p className="text-sm text-blue-300">{dx.workup}</p>
                                      </div>
                                    )}

                                    {/* Supporting Evidence */}
                                    {dx.evidence && dx.evidence.length > 0 && (
                                      <div>
                                        <span className="text-xs font-semibold text-pink-400 block mb-2">📋 Supporting Evidence:</span>
                                        <div className="flex flex-wrap gap-2">
                                          {dx.evidence.map((chunkId, i) => (
                                            <span key={i} className="px-2 py-1 bg-pink-500/10 border border-pink-500/20 rounded text-xs text-pink-300 font-mono">
                                              {chunkId}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>

                    </motion.div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
