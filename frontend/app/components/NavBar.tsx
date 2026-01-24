'use client';

import React, { useEffect, useState } from 'react';
import { Home, FileText, Activity, MessageCircle, Bot, Sun, Moon, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from './ThemeProvider';
import GeneralChatInterface from './GeneralChatInterface';
import Link from 'next/link';

interface NavBarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    showChat: boolean;
    setShowChat: (show: boolean) => void;
}


export default function NavBar({ activeTab, setActiveTab, showChat, setShowChat }: NavBarProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const tabs = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'note', label: 'Clinical Note', icon: FileText },
        { id: 'diagnosis', label: 'Differential Diagnosis', icon: Activity },
    ];

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 bg-gradient-to-b from-white/80 via-white/50 to-transparent dark:from-slate-950/80 dark:via-slate-950/50 dark:to-transparent backdrop-blur-sm pointer-events-none">
                <div className="flex bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-white/10 p-1.5 rounded-full shadow-2xl shadow-slate-200/50 dark:shadow-black/50 pointer-events-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative px-6 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium transition-all duration-300",
                                activeTab === tab.id
                                    ? "text-white"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                            )}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Right-aligned Controls */}
                <div className="absolute right-6 top-5 pointer-events-auto flex items-center gap-2">
                    {/* Theme Toggle */}
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="p-2.5 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all backdrop-blur-md shadow-lg shadow-black/5"
                        aria-label="Toggle Theme"
                    >
                        {mounted ? (theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <Sun className="w-4 h-4 opacity-0" />}
                    </button>

                    {/* Dashboard Link */}
                    <Link
                        href="/dashboard"
                        className="px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/5 bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                    </Link>

                </div>
            </div>

            {/* Floating Chat Button (FAB) */}
            <AnimatePresence>
                {!showChat && (
                    <motion.button
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        onClick={() => setShowChat(true)}
                        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:scale-110 active:scale-95"
                    >
                        <MessageCircle className="w-6 h-6" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Global Chat Overlay */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] shadow-2xl glass rounded-2xl border border-white/10 overflow-hidden flex flex-col bg-slate-900/95 backdrop-blur-xl"
                    >
                        <div className="bg-slate-900/50 p-3 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/5">
                                        <Bot className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <span className="font-semibold text-white text-sm">
                                        General Health Q&A
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowChat(false)}
                                    className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-full"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            <GeneralChatInterface visible={true} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
