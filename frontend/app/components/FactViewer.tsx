'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FileSearch } from 'lucide-react';

interface FactViewerProps {
    text: string;
    onHover: (ids: string[] | null) => void;
}

export default function FactViewer({ text, onHover }: FactViewerProps) {
    if (!text) return null;

    // Split text by lines to handle formatting
    const lines = text.split('\n');

    const renderLine = (line: string, idx: number) => {
        // Regex to match [evidence: ID] or [ID]
        // Captures: 1. "evidence: " (optional), 2. ID
        const parts = line.split(/(\[.*?:?.*?\])/g);

        return (
            <div key={idx} className="mb-2 last:mb-0">
                {parts.map((part, i) => {
                    // Check if part matches citation format
                    const match = part.match(/^\[(?:evidence:\s*)?([^\]]+)\]$/);

                    if (match) {
                        const id = match[1];
                        // If ID is "CLINICAL" or "LABS" (metadata), just style it simply
                        const isMetadata = !id.includes('_');

                        return (
                            <span
                                key={i}
                                onMouseEnter={() => !isMetadata && onHover([id])}
                                onMouseLeave={() => onHover(null)}
                                className={cn(
                                    "inline-flex items-center px-1.5 py-0.5 mx-1 rounded text-xs font-mono border cursor-default transition-all",
                                    isMetadata
                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                                        : "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-500/40 hover:scale-105"
                                )}
                            >
                                {isMetadata ? id : "Evidence"}
                            </span>
                        );
                    }

                    // Regular text handling (headers vs body)
                    if (part.trim().startsWith('1.') || part.trim().startsWith('2.') || part.trim().startsWith('3.')) {
                        return <span key={i} className="font-bold text-slate-800 dark:text-slate-200">{part}</span>;
                    }
                    return <span key={i} className="text-slate-600 dark:text-slate-300">{part}</span>;
                })}
            </div>
        );
    };

    return (
        <div className="glass rounded-2xl p-6 border border-blue-500/30 shadow-lg shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
                <FileSearch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Extracted Clinical Facts</h3>
            </div>
            <div className="bg-slate-50/50 dark:bg-black/20 rounded-xl p-4 border border-slate-100 dark:border-white/5 text-sm leading-relaxed">
                {lines.map((line, i) => renderLine(line, i))}
            </div>
        </div>
    );
}
