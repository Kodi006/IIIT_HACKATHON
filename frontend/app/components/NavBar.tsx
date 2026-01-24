'use client';

import React, { useEffect, useState } from 'react';
import { Home, FileText, Activity, MessageCircle, Bot, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from './ThemeProvider';

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
                <div className="absolute right-6 top-5 pointer-events-auto flex items-center gap-3">
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="p-2.5 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all backdrop-blur-md shadow-lg shadow-black/5"
                        aria-label="Toggle Theme"
                    >
                        {mounted ? (theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <Sun className="w-4 h-4 opacity-0" />}
                    </button>

                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={cn(
                            "relative px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/20",
                            showChat
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-white/20"
                                : "bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                        )}
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">AI Assistant</span>
                    </button>
                </div>
            </div>
        </>
    );
}
