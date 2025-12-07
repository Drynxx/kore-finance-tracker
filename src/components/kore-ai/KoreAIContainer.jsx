import React, { useState, useRef, useEffect, useContext } from 'react';
import { TransactionContext } from '../../context/TransactionContext';
import { parseTransactionWithGemini } from '../../services/gemini';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { VoiceVisualizer } from '../VoiceVisualizer';
import { Send, Mic, X, MoreHorizontal, ArrowUp, CreditCard, Sparkles, StopCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Sub-components (Internal for now, can extract later) ---

const MessageBubble = ({ message }) => {
    const isAi = message.sender === 'ai';
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex w-full mb-4 ${isAi ? 'justify-start' : 'justify-end'}`}
        >
            <div className={`max-w-[85%] rounded-2xl p-4 ${isAi
                    ? 'bg-slate-800/80 backdrop-blur-md text-slate-200 rounded-tl-sm border border-white/5'
                    : 'bg-indigo-600/90 text-white rounded-tr-sm shadow-lg shadow-indigo-500/20'
                }`}>
                <p className="text-sm leading-relaxed">{message.text}</p>
                {message.type === 'transaction_confirmation' && (
                    <div className="mt-3 bg-slate-950/50 rounded-xl p-3 border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${message.data.type === 'expense' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                <CreditCard size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">{message.data.category}</p>
                                <p className="text-lg font-semibold text-white">{message.data.amount} lei</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 italic">"{message.data.note}"</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const TypingIndicator = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex justify-start mb-4"
    >
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl rounded-tl-sm p-4 flex gap-1.5 border border-white/5">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
        </div>
    </motion.div>
);

export const KoreAIContainer = ({ onClose }) => {
    const { addTransaction, transactions } = useContext(TransactionContext);
    const [language, setLanguage] = useState('ro-RO');
    const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition(language);

    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: 'Salut! Cu ce te pot ajuta astăzi?', type: 'text' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Auto-scroll to bottom
    const messagesEndRef = useRef(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle Voice Transcript
    useEffect(() => {
        if (transcript) {
            setInputText(transcript);
        }
    }, [transcript]);

    // When voice stops, auto-send if we have text
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
        // Add User Message
        const userMsgId = Date.now();
        setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text }]);
        setInputText('');

        try {
            // AI Processing
            const result = await parseTransactionWithGemini(text, transactions);

            // TTS
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

                setMessages(prev => [...prev, {
                    id: aiMsgId,
                    sender: 'ai',
                    text: result.conversational_response,
                    type: 'transaction_confirmation',
                    data: result
                }]);

            } else {
                // Query
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

    // TTS Helper
    const speak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.lang.includes(language === 'ro-RO' ? 'ro' : 'en')) || voices[0];
            if (voice) utterance.voice = voice;
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden relative">

            {/* Listening Visualizer Overlay */}
            <AnimatePresence>
                {isListening && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
                    >
                        <div className="w-full h-64 relative">
                            <VoiceVisualizer isListening={isListening} />
                        </div>
                        <p className="text-2xl font-light text-white mt-8 tracking-tight">Ascult...</p>
                        <p className="text-slate-400 mt-2 text-sm text-center max-w-xs">{transcript || "Vorbește acum"}</p>

                        <button
                            onClick={stopListening}
                            className="mt-12 p-4 rounded-full bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors border border-white/5"
                        >
                            <X size={24} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles size={16} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Kore Agent</h3>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setLanguage(l => l === 'ro-RO' ? 'en-US' : 'ro-RO')}
                        className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-bold text-slate-300 border border-white/5 hover:bg-white/10"
                    >
                        {language === 'ro-RO' ? 'RO' : 'EN'}
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                {isProcessing && <TypingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900/80 backdrop-blur-lg border-t border-white/5 z-20">
                <div className="flex items-center gap-2">
                    <button className="p-3 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        <MoreHorizontal size={20} />
                    </button>

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isListening ? "Ascult..." : "Scrie un mesaj..."}
                            disabled={isListening}
                            className={`w-full bg-slate-800/50 border ${isListening ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/10'} rounded-full py-3.5 pl-5 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all`}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!inputText.trim() || isProcessing}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-full text-white shadow-lg shadow-indigo-600/20 disabled:opacity-0 transition-opacity"
                        >
                            <ArrowUp size={16} />
                        </button>
                    </div>

                    <button
                        onClick={startListening}
                        className={`p-3.5 rounded-full transition-all duration-300 ${isListening
                                ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500'
                            }`}
                    >
                        <Mic size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
