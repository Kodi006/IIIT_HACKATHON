'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Loader2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInterfaceProps {
    analysisData: any;
    visible: boolean;
    llmMode: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
    timestamp: string;
}

export default function ChatInterface({ analysisData, visible, llmMode }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:8000/api/chat/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: input,
                    session_id: 'default',
                    chat_history: messages,
                    analysis_context: analysisData,
                    llm_mode: llmMode
                })
            });

            if (!response.ok) throw new Error('Chat request failed');

            const data = await response.json();

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.answer,
                sources: data.sources || [],
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please check that the backend is running and try again.`,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!visible) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl overflow-hidden border border-purple-500/20"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/20 p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                        <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chat with Analysis</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Ask questions about this clinical note</p>
                    </div>
                </div>
            </div>

            {/* Messages Container - Tall for expanded view */}
            <div className="h-[400px] lg:h-[75vh] overflow-y-auto p-4 space-y-4 bg-white/50 dark:bg-slate-900/30">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-500 italic text-center">
                            Start a conversation by asking a question<br />
                            <span className="text-xs">Try: "Why is the confidence high for diagnosis #1?"</span>
                        </p>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] rounded-xl p-4 ${msg.role === 'user'
                                ? 'bg-blue-50 border border-blue-200 text-slate-800 dark:bg-blue-500/20 dark:border-blue-400/30 dark:text-slate-200'
                                : 'bg-purple-50 border border-purple-200 text-slate-800 dark:bg-purple-500/10 dark:border-purple-400/20 dark:text-slate-200'
                                }`}>
                                <div className="flex items-start gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                        {msg.role === 'user' ? 'You' : 'AI Assistant'}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                </p>

                                {/* Display sources if available */}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                                            <span className="text-xs text-amber-600 dark:text-amber-300 font-semibold">Evidence Used:</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {msg.sources.slice(0, 3).map((source, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-400"
                                                >
                                                    {source}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-purple-50 border border-purple-200 dark:bg-purple-500/10 dark:border-purple-400/20 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-500 dark:text-slate-400">AI is typing</span>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-purple-400 typing-dot" />
                                    <div className="w-2 h-2 rounded-full bg-purple-400 typing-dot" />
                                    <div className="w-2 h-2 rounded-full bg-purple-400 typing-dot" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-purple-500/20 p-4 bg-white/80 dark:bg-slate-900/50">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask a question about the analysis..."
                        disabled={loading}
                        className="flex-1 bg-white border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500/50 dark:focus:border-purple-400/50 focus:bg-slate-50 dark:focus:bg-slate-800 transition-all disabled:opacity-50"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold text-white hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/20"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    Press Enter to send • Shift+Enter for new line
                </p>
            </div>
        </motion.div>
    );
}
