import React, { useState, useRef, useEffect, useContext } from 'react';
import { TransactionContext } from '../../context/TransactionContext';
import { parseTransactionWithGemini } from '../../services/gemini';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { VoiceVisualizer } from '../VoiceVisualizer';
import { Send, Mic, X, MoreHorizontal, ArrowUp, CreditCard, Sparkles, StopCircle, Bot, Keyboard, CheckCircle2, Zap, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { speakWithElevenLabs } from '../../services/elevenlabs';

// --- Sub-components ---

const MessageBubble = ({ message }) => {
    const isAi = message.sender === 'ai';
    return (
        <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex w-full mb-6 ${isAi ? 'justify-start' : 'justify-end'}`}
        >
            <div className={`flex flex-col ${isAi ? 'items-start' : 'items-end'} max-w-[85%]`}>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 px-2 font-semibold">
                    {isAi ? 'Kore AI' : 'You'}
                </span>
                <div className={`relative px-5 py-4 shadow-xl backdrop-blur-md overflow-hidden ${isAi
                    ? 'bg-slate-900/60 rounded-2xl rounded-tl-sm border border-white/10 text-slate-100'
                    : 'bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl rounded-tr-sm text-white border border-white/20'
                    }`}>
                    {!isAi && <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-white/5 to-white/10 pointer-events-none" />}
                    <p className="text-sm leading-relaxed relative z-10 font-light tracking-wide">{message.text}</p>
                    {message.type === 'transaction_confirmation' && (
                        <div className="mt-4 relative z-10 group overflow-hidden rounded-xl border border-white/20 bg-black/20">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 opacity-50" />
                            <div className="p-4 relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-lg backdrop-blur-sm border border-white/10 ${message.data.type === 'expense' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                        <CreditCard size={18} />
                                    </div>
                                    <span className="text-xs font-mono text-slate-400 opacity-70">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">{message.data.category}</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-white tracking-tight">{message.data.amount}</span>
                                        <span className="text-sm text-slate-300">lei</span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <p className="text-xs text-slate-400 italic flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                        {message.data.note}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const TypingIndicator = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex justify-start mb-6 center"
    >
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 border border-white/5 flex gap-1.5 items-center">
            <span className="text-[10px] text-slate-500 mr-2 font-mono">THINKING</span>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
        </div>
    </motion.div>
);

export const KoreAIContainer = ({ onClose }) => {
    const { addTransaction, transactions } = useContext(TransactionContext);
    const [language, setLanguage] = useState('ro-RO');
    const { isListening, transcript, startListening, stopListening } = useSpeechRecognition(language);

    const [viewMode, setViewMode] = useState('voice');

    // Auto-scroll logic
    const messagesEndRef = useRef(null);
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: 'Salut! Cu ce te pot ajuta astăzi?', type: 'text' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Voice Success Overlay
    const [voiceSuccess, setVoiceSuccess] = useState(null);

    // Initial Auto-Start
    useEffect(() => {
        if (viewMode === 'voice') {
            const timer = setTimeout(() => startListening(), 500);
            return () => clearTimeout(timer);
        }
    }, [viewMode]);

    // Scroll to bottom
    useEffect(() => {
        if (viewMode === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, viewMode]);

    useEffect(() => {
        if (transcript) {
            setInputText(transcript);
        }
    }, [transcript]);

    useEffect(() => {
        if (!isListening && transcript.trim() && !isProcessing) {
            handleSend(transcript);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening]);

    const handleSend = async (textOveride = null) => {
        const text = textOveride || inputText;
        if (!text.trim() || isProcessing) return;

        setIsProcessing(true);
        const userMsgId = Date.now();

        setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text }]);
        setInputText('');

        try {
            const result = await parseTransactionWithGemini(text, transactions);

            if (result.conversational_response) {
                speak(result.conversational_response);
            }

            const aiMsgId = Date.now() + 1;

            if (result.intent === 'add') {
                const newTransaction = {
                    id: Math.floor(Math.random() * 100000000),
                    type: result.type,
                    amount: result.type === 'expense' ? -Math.abs(result.amount) : Math.abs(result.amount),
                    category: result.category,
                    date: result.date,
                    note: result.note
                };

                await addTransaction(newTransaction);

                if (viewMode === 'voice') {
                    setVoiceSuccess({
                        type: 'add',
                        text: `Added ${result.amount} LEI (${result.category})`
                    });
                    setTimeout(() => setVoiceSuccess(null), 3000);
                }

                setMessages(prev => [...prev, {
                    id: aiMsgId,
                    sender: 'ai',
                    text: result.conversational_response,
                    type: 'transaction_confirmation',
                    data: result
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: aiMsgId,
                    sender: 'ai',
                    text: result.conversational_response,
                    type: 'text'
                }]);
            }

        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now(),
                sender: 'ai',
                text: "Îmi pare rău, nu am înțeles. Poți repeta?",
                type: 'error'
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const speak = async (text) => {
        await speakWithElevenLabs(text);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden relative font-sans bg-slate-950">
            {/* Background Ambience (Global) */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[100px] mix-blend-screen" />
            </div>

            {/* HEADER - Transparent & Floats over everything */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6 pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    {/* Professional Logo */}
                    <div className="w-10 h-10 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-[1px] shadow-lg flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Brain size={20} className="text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.5)]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-tight drop-shadow-md">Kore Intelligence</h3>
                        <p className="text-[10px] text-cyan-200/60 font-medium tracking-wide uppercase flex items-center gap-1">
                            {viewMode === 'voice' && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
                            {viewMode === 'voice' ? 'Voice Active' : 'Chat Mode'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                        onClick={() => setLanguage(l => l === 'ro-RO' ? 'en-US' : 'ro-RO')}
                        className="px-2.5 py-1.5 rounded-lg bg-black/20 text-[10px] font-bold text-white/70 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md"
                    >
                        {language === 'ro-RO' ? 'RO' : 'EN'}
                    </button>
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors backdrop-blur-md border border-white/5">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 relative z-10 overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                    {viewMode === 'voice' ? (
                        /* VOICE MODE UI */
                        <motion.div
                            key="voice"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-0 flex flex-col items-center justify-center"
                        >
                            {/* Confirmation Overlay - Top Center (Below Header) */}
                            <AnimatePresence>
                                {voiceSuccess && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8, y: -20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                                        className="absolute top-24 z-50 flex justify-center w-full px-6 pointer-events-none"
                                    >
                                        <div className="bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-xl text-emerald-100 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-900/20">
                                            <CheckCircle2 size={24} className="text-emerald-400" />
                                            <span className="font-semibold">{voiceSuccess.text}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Full Screen Visualizer Background */}
                            <div className="absolute inset-0 z-0 flex items-center justify-center">
                                <VoiceVisualizer isListening={isListening} mode="full" />
                            </div>

                            {/* Foreground Content */}
                            <div className="relative z-10 flex flex-col items-center justify-end h-full w-full pb-12 pointer-events-none">
                                <div className="pointer-events-auto flex flex-col items-center gap-6">
                                    <h2 className="text-3xl font-light text-white text-center tracking-tight drop-shadow-lg">
                                        {isListening ? "Listening..." : "Tap to speak"}
                                    </h2>
                                    <p className="text-slate-300/80 text-center max-w-xs text-sm h-6 font-medium">
                                        {transcript || "Try 'Add 50 lei for coffee'"}
                                    </p>

                                    <button
                                        onClick={isListening ? stopListening : startListening}
                                        className={`mt-6 p-8 rounded-full transition-all duration-500 ${isListening
                                            ? 'bg-rose-500/90 text-white shadow-[0_0_50px_rgba(244,63,94,0.5)] scale-110 border border-white/20'
                                            : 'bg-white/10 backdrop-blur-md text-white shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-105 border border-white/10 hover:bg-white/20'
                                            }`}
                                    >
                                        {isListening ? <StopCircle size={40} /> : <Mic size={40} />}
                                    </button>

                                    <button
                                        onClick={() => setViewMode('chat')}
                                        className="mt-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-6 py-3 rounded-full hover:bg-white/5 backdrop-blur-sm border border-transparent hover:border-white/10"
                                    >
                                        <Keyboard size={16} />
                                        <span>Switch to keyboard</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* CHAT MODE UI */
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="flex-1 flex flex-col w-full h-full pt-20"
                        >
                            <div className="flex-1 overflow-y-auto p-5 space-y-2 scrollbar-hide mask-image-b">
                                {messages.map(msg => (
                                    <MessageBubble key={msg.id} message={msg} />
                                ))}
                                {isProcessing && <TypingIndicator />}
                                <div ref={messagesEndRef} className="h-4" />
                            </div>

                            {/* Input Area */}
                            <div className="p-5 pb-8 relative z-20">
                                <div className="relative flex items-center gap-3 p-1.5 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl shadow-indigo-900/20">
                                    <button
                                        onClick={() => setViewMode('voice')}
                                        className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                                    >
                                        <Mic size={20} />
                                    </button>

                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-transparent border-none text-white text-sm placeholder-slate-500 focus:ring-0 px-2"
                                    />

                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!inputText.trim() || isProcessing}
                                        className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-0 disabled:scale-50"
                                    >
                                        <ArrowUp size={20} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
