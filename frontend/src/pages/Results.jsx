import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Share2, Activity, CheckCircle2, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnalysisResult from '../components/AnalysisResult';
import ChatInterface from '../components/ChatInterface';

const Results = ({ data, loading, error }) => {
    const navigate = useNavigate();
    const [showChat, setShowChat] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2439] to-[#1a3a52] relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
            </div>

            {/* Grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)
          `,
                    backgroundSize: '50px 50px'
                }}
            />

            {/* Header */}
            <div className="relative z-10 border-b border-white/10 bg-[#0f2439]/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-medium">Back to Input</span>
                    </button>

                    <h1 className="text-xl font-bold text-white">Analysis Results</h1>

                    <div className="flex items-center gap-2">
                        <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all">
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center min-h-[60vh]"
                    >
                        <div className="relative mb-8">
                            <div className="w-20 h-20 border-4 border-blue-500/20 rounded-full" />
                            <div className="absolute inset-0 w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <Activity className="absolute inset-0 m-auto w-8 h-8 text-blue-400 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Processing Clinical Data</h2>
                        <p className="text-blue-200/60 mb-8">Analyzing with AI engine...</p>
                        <div className="flex gap-3">
                            {['Parsing', 'Reasoning', 'Retrieving'].map((step, i) => (
                                <div key={step} className="px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-sm text-blue-200/70">
                                    {step}...
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : error ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md mx-auto"
                    >
                        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Activity className="w-8 h-8 text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
                            <p className="text-red-200/70 mb-6">{error}</p>
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white font-medium hover:shadow-lg transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    </motion.div>
                ) : data ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Success Banner */}
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 mb-8 flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl">
                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Analysis Complete</h3>
                                <p className="text-sm text-emerald-200/70">Generated at {new Date().toLocaleTimeString()}</p>
                            </div>
                        </div>

                        {/* Chat Toggle Button */}
                        <div className="mb-6">
                            <button
                                onClick={() => setShowChat(!showChat)}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all flex items-center gap-2 shadow-lg"
                            >
                                <MessageCircle className="w-5 h-5" />
                                {showChat ? 'Hide Chat' : 'Ask Questions About This Analysis'}
                            </button>
                        </div>

                        {/* Chat Interface */}
                        {showChat && (
                            <div className="mb-8">
                                <ChatInterface analysisData={data} visible={showChat} />
                            </div>
                        )}

                        <AnalysisResult data={data} />
                    </motion.div>
                ) : (
                    <div className="max-w-md mx-auto text-center py-20">
                        <p className="text-blue-200/60 mb-4">No analysis data available</p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white font-medium hover:shadow-lg transition-all"
                        >
                            Start New Analysis
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Results;
