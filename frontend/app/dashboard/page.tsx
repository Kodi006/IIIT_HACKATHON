'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, Clock, TrendingUp, FileText, Trash2, Eye,
    ArrowLeft, Loader2, BarChart3, Calendar
} from 'lucide-react';
import Link from 'next/link';
import { clinicalAPI, type HistoryRecord, type DashboardStats } from '@/lib/api';

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsData, historyData] = await Promise.all([
                clinicalAPI.getStats(),
                clinicalAPI.getHistory(0, 50)
            ]);
            setStats(statsData);
            setHistory(historyData.records);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this analysis?')) return;

        try {
            await clinicalAPI.deleteAnalysis(id);
            setHistory(prev => prev.filter(r => r.id !== id));
            // Reload stats after delete
            const newStats = await clinicalAPI.getStats();
            setStats(newStats);
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    const handleView = async (id: number) => {
        try {
            const record = await clinicalAPI.getAnalysisById(id);
            setSelectedRecord(record);
            setViewModalOpen(true);
        } catch (error) {
            console.error('Failed to load analysis:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getConfidenceColor = (confidence: string | null) => {
        switch (confidence?.toLowerCase()) {
            case 'high': return 'text-green-400 bg-green-500/20';
            case 'medium': return 'text-yellow-400 bg-yellow-500/20';
            case 'low': return 'text-red-400 bg-red-500/20';
            default: return 'text-gray-400 bg-gray-500/20';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
                <div className="flex items-center gap-3 text-white">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading dashboard...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <BarChart3 className="w-8 h-8 text-blue-400" />
                                Analysis Dashboard
                            </h1>
                            <p className="text-slate-400 mt-1">View your clinical analysis history</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Total Analyses</span>
                    </div>
                    <p className="text-4xl font-bold text-white">{stats?.total_analyses || 0}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <Clock className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Avg. Processing Time</span>
                    </div>
                    <p className="text-4xl font-bold text-white">{stats?.avg_processing_time || 0}s</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-green-500/20">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Top Diagnosis</span>
                    </div>
                    <p className="text-2xl font-bold text-white truncate">
                        {stats?.most_common_diagnosis || 'N/A'}
                    </p>
                    {stats?.most_common_count ? (
                        <p className="text-sm text-slate-400">{stats.most_common_count} occurrences</p>
                    ) : null}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <Activity className="w-5 h-5 text-amber-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Confidence Distribution</span>
                    </div>
                    <div className="flex gap-2 flex-wrap mt-2">
                        {stats?.confidence_distribution && Object.entries(stats.confidence_distribution).map(([conf, count]) => (
                            <span key={conf} className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(conf)}`}>
                                {conf}: {count}
                            </span>
                        ))}
                        {(!stats?.confidence_distribution || Object.keys(stats.confidence_distribution).length === 0) && (
                            <span className="text-slate-500 text-sm">No data</span>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* History Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="max-w-7xl mx-auto bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-400" />
                        Recent Analyses
                    </h2>
                </div>

                {history.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">No analyses yet. Go analyze a clinical note!</p>
                        <Link href="/" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
                            Start Analysis
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Date</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Preview</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Diagnosis</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Confidence</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Time</th>
                                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {history.map((record) => (
                                    <tr key={record.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-300">
                                            {formatDate(record.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate">
                                            {record.note_preview}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white font-medium">
                                            {record.primary_diagnosis || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(record.confidence)}`}>
                                                {record.confidence || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {record.processing_time?.toFixed(1)}s
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleView(record.id)}
                                                    className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record.id)}
                                                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>

            {/* View Modal */}
            {viewModalOpen && selectedRecord && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900">
                            <h3 className="text-xl font-bold text-white">Analysis Details</h3>
                            <button
                                onClick={() => setViewModalOpen(false)}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="text-sm font-medium text-slate-400 mb-2">Primary Diagnosis</h4>
                                <p className="text-2xl font-bold text-white">{selectedRecord.primary_diagnosis || 'N/A'}</p>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(selectedRecord.confidence)}`}>
                                    {selectedRecord.confidence || 'N/A'} Confidence
                                </span>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-slate-400 mb-2">SOAP Note</h4>
                                <pre className="bg-slate-800/50 rounded-lg p-4 text-slate-300 text-sm whitespace-pre-wrap overflow-x-auto">
                                    {selectedRecord.soap}
                                </pre>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-slate-400 mb-2">Clinical Note</h4>
                                <pre className="bg-slate-800/50 rounded-lg p-4 text-slate-300 text-sm whitespace-pre-wrap overflow-x-auto max-h-60">
                                    {selectedRecord.full_note}
                                </pre>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
