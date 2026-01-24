'use client';

import React, { useState } from 'react';
import { Home, FileText, Activity, MessageCircle, Bot, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import GeneralChatInterface from './GeneralChatInterface';
import Link from 'next/link';

interface NavBarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    showChat: boolean;
    setShowChat: (show: boolean) => void;
}


export default function NavBar({ activeTab, setActiveTab, showChat, setShowChat }: NavBarProps) {

    const tabs = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'note', label: 'Clinical Note', icon: FileText },
        { id: 'diagnosis', label: 'Differential Diagnosis', icon: Activity },
    ];

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 bg-gradient-to-b from-slate-950/80 to-transparent backdrop-blur-sm pointer-events-none">
                <div className="flex bg-slate-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-full shadow-2xl shadow-black/50 pointer-events-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative px-6 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium transition-all duration-300",
                                activeTab === tab.id
                                    ? "text-white"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
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

                {/* Right-aligned Buttons */}
                <div className="absolute right-6 top-5 pointer-events-auto flex items-center gap-2">
                    {/* Dashboard Link */}
                    <Link
                        href="/dashboard"
                        className="px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/20 bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10"
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                    </Link>

                    {/* Chat Button */}
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={cn(
                            "relative px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/20",
                            showChat
                                ? "bg-slate-800 text-white border border-white/20"
                                : "bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10"
                        )}
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">AI Assistant</span>
                    </button>
                </div>
            </div>

            {/* Global Chat Overlay */}
            {showChat && (
                <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] shadow-2xl glass rounded-2xl border border-white/10 overflow-hidden flex flex-col animate-in slide-in-from-bottom-20 fade-in duration-200 bg-slate-900/95 backdrop-blur-xl">
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
                </div>
            )}
        </>
    );
}
