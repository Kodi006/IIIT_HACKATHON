import React from 'react';
import { ClipboardList, Brain, Search, AlertCircle, FileText, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const AnalysisResult = ({ data }) => {
    if (!data) return null;

    const { soap, step1, ddx, step2_raw, retrieved } = data;

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const Section = ({ icon: Icon, title, children, gradient }) => (
        <motion.div
            variants={item}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-blue-400/30 transition-all"
        >
            <div className="flex items-center gap-3 mb-5">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
            </div>
            {children}
        </motion.div>
    );

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            {/* SOAP Summary */}
            <Section icon={ClipboardList} title="SOAP Summary" gradient="from-blue-500 to-cyan-500">
                <div className="bg-black/20 rounded-xl p-5 border border-white/5">
                    <pre className="text-sm text-blue-100/90 whitespace-pre-wrap font-mono leading-relaxed">
                        {soap || 'No SOAP summary generated'}
                    </pre>
                </div>
            </Section>

            {/* Differential Diagnosis */}
            <Section icon={Brain} title="Differential Diagnosis" gradient="from-purple-500 to-pink-500">
                {ddx && Array.isArray(ddx) ? (
                    <div className="space-y-4">
                        {ddx.map((dx, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-purple-400/30 transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-white">{dx.diagnosis}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${dx.confidence === 'High' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                            dx.confidence === 'Medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                                        }`}>
                                        {dx.confidence}
                                    </span>
                                </div>
                                <p className="text-sm text-blue-200/70 mb-3 leading-relaxed">{dx.rationale}</p>
                                {dx.evidence && dx.evidence.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {dx.evidence.map((ref, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-blue-200/60">
                                                {ref}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/5 rounded-xl p-4 text-blue-200/60 italic">
                        <p>Could not parse structured differential diagnosis.</p>
                        {step2_raw && <pre className="mt-2 text-xs opacity-50">{step2_raw}</pre>}
                    </div>
                )}
            </Section>

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Clinical Facts */}
                <Section icon={Search} title="Extracted Facts" gradient="from-emerald-500 to-teal-500">
                    <div className="bg-black/20 rounded-xl p-5 border border-white/5 max-h-96 overflow-y-auto">
                        <div className="text-sm text-blue-100/80 whitespace-pre-wrap leading-relaxed">
                            {step1 || 'No facts extracted'}
                        </div>
                    </div>
                </Section>

                {/* Evidence Sources */}
                <Section icon={AlertCircle} title="Evidence Sources" gradient="from-amber-500 to-orange-500">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {retrieved && retrieved.map((r, i) => (
                            <div
                                key={i}
                                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-amber-400/30 transition-all"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <code className="text-xs bg-white/10 px-2 py-1 rounded text-blue-300/70">{r.chunk_id}</code>
                                    <span className="text-xs text-amber-400 font-mono">Score: {r.score?.toFixed(3)}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-amber-400" />
                                    <span className="text-sm font-semibold text-white">{r.section}</span>
                                </div>
                                <p className="text-xs text-blue-200/60 leading-relaxed line-clamp-3">{r.text}</p>
                            </div>
                        ))}
                    </div>
                </Section>
            </div>
        </motion.div>
    );
};

export default AnalysisResult;
