import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Cpu, Shield, FileText, Upload, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = ({ onAnalyze }) => {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState('text');
  const [text, setText] = React.useState(`HISTORY OF PRESENT ILLNESS:
68-year-old male with progressive shortness of breath over 3 days, orthopnea, bilateral leg swelling. No chest pain.

PHYSICAL EXAMINATION:
BP 168/92, HR 95, elevated JVP, bilateral basal crackles on auscultation. 3+ pitting edema in lower extremities.

PAST MEDICAL HISTORY:
Hypertension, chronic kidney disease stage 3, type 2 diabetes.

LABORATORY:
WBC 8,500, BNP 980 pg/mL, Creatinine 1.8 mg/dL.

IMAGING:
Chest X-ray shows cardiomegaly and pulmonary venous congestion.`);


  const handleAnalyze = () => {
    if (!text.trim()) {
      alert('Please enter clinical text first');
      return;
    }
    onAnalyze(text);
    navigate('/results');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0520 0%, #1a0f3a 50%, #0a1628 100%)' }}>

      {/* Background Effects - Nebula with diagonal light streaks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Purple nebula top-left */}
        <div
          className="absolute w-[1000px] h-[1000px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, rgba(99, 102, 241, 0.3) 40%, transparent 70%)',
            top: '-20%',
            left: '-20%',
            filter: 'blur(100px)',
          }}
        />

        {/* Cyan nebula bottom-right */}
        <div
          className="absolute w-[900px] h-[900px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.5) 0%, rgba(34, 211, 238, 0.3) 40%, transparent 70%)',
            bottom: '-15%',
            right: '-15%',
            filter: 'blur(120px)',
          }}
        />

        {/* Diagonal cyan light streak */}
        <div
          className="absolute w-[600px] h-[2px] opacity-40"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.8), transparent)',
            top: '20%',
            right: '0',
            transform: 'rotate(-30deg)',
            filter: 'blur(2px)',
          }}
        />

        {/* Stars */}
        <div className="absolute top-[15%] right-[10%] w-2 h-2 bg-white rounded-full opacity-60 animate-pulse" />
        <div className="absolute bottom-[60%] right-[5%] w-1 h-1 bg-cyan-300 rounded-full opacity-70" />
        <div className="absolute bottom-[20%] left-[15%] w-1.5 h-1.5 bg-purple-300 rounded-full opacity-50 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main Glass Card with Purple Glow */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-3xl"
      >
        {/* Purple border glow effect */}
        <div className="absolute -inset-[1px] bg-gradient-to-b from-purple-500/50 via-purple-600/30 to-purple-700/50 rounded-[2rem] blur-sm" />
        <div className="absolute -inset-[2px] bg-gradient-to-b from-purple-500/30 via-purple-600/20 to-transparent rounded-[2rem] blur-md" />

        {/* Glass card content */}
        <div className="relative bg-slate-900/40 backdrop-blur-2xl rounded-[2rem] p-10 border border-purple-500/30 shadow-2xl">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-2">
              Clinical Analysis <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">Powered by AI</span>
            </h1>
            <p className="text-slate-400 text-sm mt-3">
              A high-fidelity glassmorphic UI for Clinical Analysis Powered by AI.
            </p>
          </div>

          {/* Feature Icons */}
          <div className="flex justify-center gap-12 mb-8 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <BrainCircuit className="w-8 h-8" strokeWidth={1.5} />
              <span className="text-xs">DDx Generation</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Cpu className="w-8 h-8" strokeWidth={1.5} />
              <span className="text-xs">RAG Pipeline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Shield className="w-8 h-8" strokeWidth={1.5} />
              <span className="text-xs">Evidence Based</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={() => setMode('text')}
              className={`px-8 py-2.5 rounded-full font-medium transition-all ${mode === 'text'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                }`}
            >
              Type Note
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`px-8 py-2.5 rounded-full font-medium transition-all ${mode === 'upload'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                }`}
            >
              Upload Scan
            </button>
          </div>

          {/* Input Area with Cyan Glow */}
          <div className="mb-4 relative">
            {/* Cyan glow border */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500/50 via-cyan-400/60 to-cyan-500/50 rounded-2xl blur-sm" />
            <div className="absolute -inset-[2px] bg-gradient-to-r from-cyan-500/30 via-cyan-400/40 to-cyan-500/30 rounded-2xl blur-md" />

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste clinical note..."
              className="relative w-full h-32 bg-slate-800/50 backdrop-blur-sm border border-cyan-500/40 rounded-2xl p-5 text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-cyan-400/60 transition-all"
            />
          </div>

          {/* AI indicator */}
          <div className="flex justify-center items-center gap-2 text-xs text-slate-400 mb-6">
            <Sparkles className="w-3 h-3" />
            AI analyzes symptoms, history & vitals
          </div>

          {/* Analyze Button with Purple Glow */}
          <div className="mb-6 relative">
            {/* Button glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl blur-xl opacity-60" />

            <button
              onClick={handleAnalyze}
              disabled={!text.trim()}
              className="relative w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl font-semibold text-white shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              Analyze
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Footer text */}
          <p className="text-center text-xs text-slate-500">
            Paste your clinical note above or upload a document • Secure local processing
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;
