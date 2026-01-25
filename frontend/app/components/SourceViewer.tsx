'use client';

import React, { useRef, useEffect } from 'react';
import { ChunkInfo } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FileText, Search } from 'lucide-react';

interface SourceViewerProps {
    chunks: ChunkInfo[];
    highlightedIds: string[] | null;
}

export default function SourceViewer({ chunks, highlightedIds }: SourceViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const highlightedRef = useRef<HTMLSpanElement>(null);

    // Filter out duplicate or unlabeled chunks if needed, but usually we show all for context
    // Ideally we reconstruct the full text or show chunks in order
    // Since chunks are sequential, we can just map them.
    const sortedChunks = [...(chunks || [])].sort((a, b) => (a.chunk_num || 0) - (b.chunk_num || 0));

    // Scroll to highlight
    useEffect(() => {
        if (highlightedIds && highlightedIds.length > 0 && highlightedRef.current) {
            highlightedRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [highlightedIds]);

    if (!chunks || chunks.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <FileText className="w-12 h-12 mb-3 opacity-20" />
                <p>No source text available</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white/50 dark:bg-slate-900/50 rounded-xl overflow-hidden backdrop-blur-sm border border-slate-200 dark:border-white/5">
            <div className="p-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">Source Document</span>
                </div>
                <span className="text-xs text-slate-400">{chunks.length} segments</span>
            </div>

            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm leading-relaxed"
            >
                {sortedChunks.map((chunk, idx) => {
                    const isHighlighted = highlightedIds?.includes(chunk.chunk_id);
                    // Add newline if section changes or usually just render text with whitespace preserved
                    return (
                        <span
                            key={chunk.chunk_id}
                            ref={isHighlighted ? highlightedRef : null}
                            className={cn(
                                "transition-colors duration-300 rounded px-0.5 box-decoration-clone",
                                isHighlighted
                                    ? "bg-yellow-200 dark:bg-yellow-500/40 text-slate-900 dark:text-white font-medium ring-2 ring-yellow-400/50"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                            )}
                            title={`ID: ${chunk.chunk_id} | Section: ${chunk.section}`}
                        >
                            {chunk.text}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
