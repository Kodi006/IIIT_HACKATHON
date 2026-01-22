import React, { useState } from 'react';
import { FileText, Upload, Camera, ArrowRight, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClinicalInput = ({ onAnalyze }) => {
    const [mode, setMode] = useState('text');
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [ocrLoading, setOcrLoading] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreview(null);
    };

    const runOcr = async () => {
        if (!file) return;
        setOcrLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8000/api/ocr', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            setText(data.text);
            setMode('text');
        } catch (error) {
            console.error('OCR Error:', error);
            alert('Failed to extract text');
        } finally {
            setOcrLoading(false);
        }
    };

    const handleAnalyze = () => {
        if (!text.trim()) {
            alert('Please enter clinical text first');
            return;
        }
        onAnalyze(text);
    };

    return (
        <div className="space-y-10 text-center">
            {/* Mode Tabs - CENTERED */}
            <div className="flex justify-center gap-4">
                {[
                    { id: 'text', icon: FileText, label: 'Type Note' },
                    { id: 'upload', icon: Upload, label: 'Upload File' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setMode(tab.id)}
                        className="relative group"
                    >
                        {mode === tab.id && (
                            <motion.div
                                layoutId="activeModeTab"
                                className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <div className={`relative flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition-all ${mode === tab.id ? 'text-white' : 'text-slate-400 glass hover:text-white'
                            }`}>
                            <tab.icon className="w-5 h-5" strokeWidth={2.5} />
                            <span className="text-base">{tab.label}</span>
                        </div>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {mode === 'text' ? (
                    <motion.div
                        key="text"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {/* Textarea - CENTERED */}
                        <div className="relative group max-w-3xl mx-auto">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl opacity-0 group-focus-within:opacity-50 blur-xl transition-opacity duration-500" />

                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Enter patient symptoms, medical history, vitals, lab results..."
                                className="relative w-full h-56 glass rounded-3xl px-8 py-6 text-white text-base text-left leading-relaxed placeholder-slate-500 resize-none focus:outline-none transition-all"
                            />

                            <div className="absolute bottom-6 right-8 text-xs text-slate-600 font-medium">
                                {text.length} chars
                            </div>
                        </div>

                        {/* AI Badge - CENTERED */}
                        <div className="flex justify-center">
                            <div className="inline-flex items-center gap-2.5 glass px-6 py-3 rounded-2xl">
                                <Zap className="w-4 h-4 text-indigo-400" fill="currentColor" />
                                <span className="text-sm font-medium text-slate-400">AI-powered medical analysis</span>
                            </div>
                        </div>

                        {/* Analyze Button - CENTERED */}
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={handleAnalyze}
                                disabled={!text.trim()}
                                className="btn-premium px-12 py-5 rounded-2xl font-bold text-lg text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3"
                            >
                                <Zap className="w-5 h-5" fill="white" />
                                Analyze Clinical Data
                                <ArrowRight className="w-5 h-5" strokeWidth={3} />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {!preview ? (
                            <div className="max-w-3xl mx-auto">
                                <div className="relative group">
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept="image/*,.pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />

                                    <div className="glass border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-3xl p-16 transition-all group-hover:bg-white/5">
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            className="mb-6 inline-flex p-8 rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20"
                                        >
                                            <Upload className="w-16 h-16 text-indigo-400" strokeWidth={1.5} />
                                        </motion.div>

                                        <h3 className="text-2xl font-bold text-white mb-3">Upload Document</h3>
                                        <p className="text-base text-slate-400 mb-2">Drag and drop or click to browse</p>
                                        <p className="text-sm text-slate-600">JPG, PNG, PDF • Max 10MB</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 max-w-3xl mx-auto">
                                <div className="relative glass rounded-3xl overflow-hidden group h-80">
                                    <img src={preview} alt="Preview" className="w-full h-full object-contain p-6" />
                                    <button
                                        onClick={clearFile}
                                        className="absolute top-6 right-6 p-3 bg-red-500 hover:bg-red-600 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={runOcr}
                                        disabled={ocrLoading}
                                        className="btn-premium px-12 py-5 rounded-2xl font-bold text-lg text-white disabled:opacity-50 flex items-center gap-3"
                                    >
                                        {ocrLoading ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Extracting...
                                            </>
                                        ) : (
                                            <>
                                                <Camera className="w-5 h-5" />
                                                Extract Text
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClinicalInput;
