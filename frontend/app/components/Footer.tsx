'use client';

import { motion } from 'framer-motion';
import { Sparkles, Heart } from 'lucide-react';

export default function Footer() {
    return (
        <motion.footer
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 100, damping: 20 }}
            className="relative z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-950/60 border-t border-slate-200/50 dark:border-slate-800/50"
        >
            <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Left: Hackathon */}
                <div className="flex items-center gap-3 group">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/10 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 transition-colors">
                        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">Udbhav Hackathon</span>
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">2026 Edition</span>
                    </div>
                </div>

                {/* Center: Team */}
                <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-900/50 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Built by</span>
                    <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 animate-gradient hover:scale-105 transition-transform cursor-default">
                        Team Hawkings 🦅
                    </span>
                </div>

                {/* Right: Credit */}
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span>Made with</span>
                    <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
                    <span className="hidden sm:inline">for Healthcare</span>
                </div>
            </div>
        </motion.footer>
    );
}
