'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Brain, Activity, Loader2, 
  AlertCircle, CheckCircle, Sparkles, TrendingUp,
  FileSearch, Stethoscope, ChevronRight
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { clinicalAPI, type AnalysisResponse, type DiagnosisItem } from '@/lib/api';
import { cn, formatConfidence } from '@/lib/utils';

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
  const [llmMode, setLlmMode] = useState<'local_stub' | 'openai'>('local_stub');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);

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

    try {
      const response = await clinicalAPI.analyze({
        text: noteText,
        llm_mode: llmMode,
        top_k: 6,
        use_small_embedder: false,
      });
      
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full glass">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-300">AI-Powered Clinical Intelligence</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-4">
          <span className="gradient-text">Clinical Co-Pilot</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">
          Advanced clinical decision support powered by RAG technology.
          Transform clinical notes into actionable insights with evidence-based differential diagnoses.
        </p>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
        {/* Left Panel - Input */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Image Upload Card */}
          <div className="glass rounded-2xl p-6 border border-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Upload className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Upload Clinical Note</h2>
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
              <p className="text-sm text-slate-500">Supports JPG, PNG</p>
            </div>

            {isProcessingOCR && (
              <div className="mt-4 flex items-center gap-2 text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processing image...</span>
              </div>
            )}
          </div>

          {/* Text Input Card */}
          <div className="glass rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Clinical Note</h2>
            </div>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full h-96 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-mono text-sm"
              placeholder="Paste or type clinical note here..."
            />

            {/* Settings */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">LLM Mode:</span>
                <select
                  value={llmMode}
                  onChange={(e) => setLlmMode(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="local_stub">Local (Demo)</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !noteText.trim()}
                className={cn(
                  "px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2",
                  isAnalyzing || !noteText.trim()
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70"
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
                    Analyze Note
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

        {/* Right Panel - Results */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {!result && !isAnalyzing && (
            <div className="glass rounded-2xl p-12 border border-slate-700 text-center">
              <Stethoscope className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-400 mb-2">Ready to Analyze</h3>
              <p className="text-slate-500">
                Upload or paste a clinical note, then click "Analyze Note" to get started
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="glass rounded-2xl p-12 border border-blue-500/30 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <Brain className="w-16 h-16 text-blue-400 mx-auto mb-4 relative z-10" />
              </div>
              <h3 className="text-xl font-semibold text-blue-300 mb-2 mt-8">Analyzing Clinical Note</h3>
              <p className="text-slate-400">
                Processing with AI models... This may take a few seconds
              </p>
            </div>
          )}

          {result && (
            <AnimatePresence>
              {/* SOAP Note */}
              <motion.div
                key="soap-summary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass rounded-2xl p-6 border border-green-500/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <FileSearch className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">SOAP Summary</h2>
                </div>
                <pre className="bg-slate-900/50 rounded-lg p-4 text-sm text-slate-200 whitespace-pre-wrap font-mono border border-slate-700">
                  {result.soap}
                </pre>
              </motion.div>

              {/* Differential Diagnoses */}
              {result.ddx && result.ddx.length > 0 && (
                <motion.div
                  key="differential-diagnoses"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass rounded-2xl p-6 border border-pink-500/20"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-pink-500/20">
                      <Activity className="w-5 h-5 text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-white">Differential Diagnoses</h2>
                      <p className="text-sm text-slate-400">Evidence-based clinical insights</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {result.ddx.map((dx: DiagnosisItem, idx: number) => {
                      const conf = formatConfidence(dx.confidence);
                      const isSelected = selectedDiagnosis === dx.diagnosis;
                      
                      return (
                        <motion.div
                          key={`diagnosis-${idx}-${dx.diagnosis || 'unknown'}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => setSelectedDiagnosis(isSelected ? null : dx.diagnosis)}
                          className={cn(
                            "bg-slate-900/50 rounded-xl p-5 border cursor-pointer transition-all",
                            isSelected 
                              ? "border-pink-500/50 bg-pink-500/10" 
                              : "border-slate-700 hover:border-pink-500/30 hover:bg-slate-800/50"
                          )}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <CheckCircle className="w-5 h-5 text-pink-400" />
                                <h3 className="text-lg font-semibold text-white">{dx.diagnosis}</h3>
                              </div>
                              
                              {/* Confidence Bar */}
                              <div className="flex items-center gap-3 mb-2">
                                <span className={cn("text-xs font-semibold px-2 py-1 rounded", conf.bgColor, conf.color)}>
                                  {dx.confidence} Confidence
                                </span>
                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${conf.percentage}%` }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    className={cn(
                                      "h-full rounded-full",
                                      dx.confidence === 'High' ? 'bg-green-500' : 
                                      dx.confidence === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <ChevronRight 
                              className={cn(
                                "w-5 h-5 text-slate-400 transition-transform",
                                isSelected && "rotate-90"
                              )} 
                            />
                          </div>

                          <p className="text-slate-300 text-sm mb-3">{dx.rationale}</p>

                          {isSelected && dx.evidence && dx.evidence.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t border-slate-700"
                            >
                              <h4 className="text-sm font-semibold text-pink-300 mb-2">Evidence Chunks:</h4>
                              <div className="flex flex-wrap gap-2">
                                {dx.evidence.map((chunkId, i) => (
                                  <span 
                                    key={`evidence-${idx}-${i}-${chunkId || 'empty'}`}
                                    className="px-2 py-1 bg-pink-500/20 border border-pink-500/30 rounded text-xs text-pink-200 font-mono"
                                  >
                                    {chunkId}
                                  </span>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Processing Time */}
              <motion.div
                key="processing-time"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center text-sm text-slate-500"
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Processed in {result.processing_time.toFixed(2)}s
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-16 text-slate-500 text-sm"
      >
        <p>Clinical Co-Pilot v2.0 • Powered by RAG & Modern AI</p>
        <p className="mt-2">⚠️ For educational purposes only • Not for clinical use</p>
      </motion.footer>
    </div>
  );
}
