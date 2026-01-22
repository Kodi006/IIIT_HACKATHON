import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Loader2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatInterface = ({ analysisData, visible }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = {
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
                    analysis_context: analysisData
                })
            });

            if (!response.ok) throw new Error('Chat request failed');

            const data = await response.json();

            const assistantMessage = {
                role: 'assistant',
                content: data.answer,
                sources: data.sources || [],
                chunks: data.relevant_chunks || [],
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
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
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10 p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                        <MessageCircle className="w-5 h-5 text-purple-300" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Chat with Analysis</h3>
                        <p className="text-sm text-blue-200/60">Ask questions about this clinical note</p>
                    </div>
                </div>
            </div>

            {/* Messages Container */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-blue-200/40 italic text-center">
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
                                    ? 'bg-blue-500/20 border border-blue-400/30'
                                    : 'bg-purple-500/10 border border-purple-400/20'
                                }`}>
                                <div className="flex items-start gap-2 mb-1">
                                    <span className="text-xs font-bold text-white/70 uppercase">
                                        {msg.role === 'user' ? 'You' : 'AI Assistant'}
                                    </span>
                                </div>
                                <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                </p>

                                {/* Display sources if available */}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="w-3 h-3 text-amber-400" />
                                            <span className="text-xs text-amber-300 font-semibold">Evidence Used:</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {msg.sources.slice(0, 3).map((source, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-0.5 bg-white/10 border border-white/10 rounded text-xs text-blue-200/60"
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
                        <div className="bg-purple-500/10 border border-purple-400/20 rounded-xl p-4">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                                <span className="text-sm text-white/70">Thinking...</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-white/10 p-4 bg-black/20">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask a question about the analysis..."
                        disabled={loading}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400/50 focus:bg-white/10 transition-all disabled:opacity-50"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold text-white hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-blue-200/40 mt-2">
                    Press Enter to send • Shift+Enter for new line
                </p>
            </div>
        </motion.div>
    );
};

export default ChatInterface;
