'use client';

import React from 'react';
import { Home, FileText, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NavBarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export default function NavBar({ activeTab, setActiveTab }: NavBarProps) {
    const tabs = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'note', label: 'Clinical Note', icon: FileText },
        { id: 'diagnosis', label: 'Differential Diagnosis', icon: Activity },
    ];

    return (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 bg-gradient-to-b from-slate-950/80 to-transparent backdrop-blur-sm">
            <div className="flex bg-slate-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-full shadow-2xl shadow-black/50">
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
        </div>
    );
}
