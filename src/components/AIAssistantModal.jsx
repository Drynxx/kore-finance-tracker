import React, { useState, useContext, useEffect, useRef } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { parseTransactionWithGemini } from '../services/gemini';
import { Bot, Send, X, Check, Loader2, Mic, Keyboard, Activity, Sparkles } from 'lucide-react';
import { VoiceVisualizer } from './VoiceVisualizer';
import { motion, AnimatePresence } from 'framer-motion';

const AIAssistantModal = ({ onClose }) => {
    const { addTransaction, transactions } = useContext(TransactionContext);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [error, setError] = useState('');
    const [autoSubmitTimer, setAutoSubmitTimer] = useState(null);
    const [countdown, setCountdown] = useState(3);
    const transcriptRef = useRef('');
    const timerRef = useRef(null);
    const isSubmittingRef = useRef(false);

    const [language, setLanguage] = useState('ro-RO'); // Default to Romanian as per user context

    // TTS Helper
    const speak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            let voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) {
                window.speechSynthesis.onvoiceschanged = () => {
                    voices = window.speechSynthesis.getVoices();
                    selectVoiceAndSpeak(utterance, voices, text);
                };
            } else {
                selectVoiceAndSpeak(utterance, voices, text);
            }
        }
    };

    const selectVoiceAndSpeak = (utterance, voices, text) => {
        let preferredVoice;

        if (language === 'ro-RO') {
            preferredVoice = voices.find(v => v.lang.includes('ro')) || voices[0];
        } else {
            preferredVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) ||
                voices.find(v => v.lang.includes('en')) ||
                voices[0];
        }

        if (preferredVoice) {
            utterance.voice = preferredVoice;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
        }
        window.speechSynthesis.speak(utterance);
    };

    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        setIsListening(false);
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setError("Voice input is not supported.");
            return;
        }

        // Stop any existing instance
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false; // Mobile prefers false for short commands
        recognition.interimResults = true;
        recognition.lang = language; // Dynamic language selection

        recognition.onstart = () => {
            setIsListening(true);
            setError('');
            setInput('');
            transcriptRef.current = '';
            isSubmittingRef.current = false;

            // Safety timeout: Stop if no speech detected after 8 seconds
            silenceTimerRef.current = setTimeout(() => {
                if (!transcriptRef.current) {
                    setError("No speech detected.");
                    stopListening();
                }
            }, 8000);
        };

        recognition.onresult = (event) => {
            // Clear silence timer on every result
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');

            setInput(transcript);
            transcriptRef.current = transcript;

            // Set new silence timer: PROCESS IMMEDIATELY after 2 seconds of silence
            silenceTimerRef.current = setTimeout(() => {
                stopListening();
                if (transcriptRef.current.trim() && !isSubmittingRef.current) {
                    handleAnalyze(null, transcriptRef.current);
                }
            }, 2000);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            if (event.error === 'no-speech') {
                setError("Didn't hear anything.");
            } else if (event.error === 'not-allowed') {
                setError("Microphone denied. Check permissions.");
            } else if (event.error === 'service-not-allowed') {
                setError("Voice service unavailable.");
            } else {
                setError(`Error: ${event.error}`);
            }
            stopListening();
        };

        recognition.onend = () => {
            setIsListening(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            // Only trigger if we haven't already submitted (e.g. via silence timer)
            if (transcriptRef.current.trim() && !isSubmittingRef.current && !isLoading) {
                handleAnalyze(null, transcriptRef.current);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const handleAnalyze = async (e, overrideInput = null) => {
        if (e) e.preventDefault();
        const textToAnalyze = overrideInput || input;

        if (!textToAnalyze.trim()) return;

        // Prevent double submission
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        setIsLoading(true);
        setError('');
        setParsedData(null);

        try {
            const result = await parseTransactionWithGemini(textToAnalyze, transactions);

            if (result.conversational_response) {
                speak(result.conversational_response);
            }

            if (result.intent === 'query') {
                setParsedData({ ...result, isQuery: true });
                setIsLoading(false);
                return;
            }

            setParsedData(result);

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            isSubmittingRef.current = false;
            setCountdown(3);

            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleConfirm(result);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            timerRef.current = timer;
            setAutoSubmitTimer(timer);

        } catch (err) {
            setError(err.message || "Could not understand.");
            speak("I couldn't understand that.");
            isSubmittingRef.current = false; // Reset on error
        } finally {
            setIsLoading(false);
            // Note: We don't reset isSubmittingRef here if successful, 
            // because handleConfirm will use it. It gets reset in handleConfirm or if we start listening again.
        }
    };

    const handleConfirm = async (dataToSave = parsedData) => {
        if (!dataToSave || isSubmittingRef.current) return;

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setAutoSubmitTimer(null);
        isSubmittingRef.current = true;

        try {
            const newTransaction = {
                id: Math.floor(Math.random() * 100000000),
                type: dataToSave.type,
                amount: dataToSave.type === 'expense' ? -Math.abs(dataToSave.amount) : Math.abs(dataToSave.amount),
                category: dataToSave.category,
                date: dataToSave.date,
                note: dataToSave.note
            };

            await addTransaction(newTransaction);
            onClose();
        } catch (err) {
            isSubmittingRef.current = false;
            setError("Failed to save transaction.");
        }
    };

    const cancelAutoSubmit = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setAutoSubmitTimer(null);
        setCountdown(0);
    };

    useEffect(() => {
        // Check for API Key
        const hasKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!hasKey) {
            setError("Gemini API Key is missing. Please configure VITE_GEMINI_API_KEY in your .env file.");
        } else {
            // Auto-start listening on open
            startListening();
        }

        return () => {
            stopListening();
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            window.speechSynthesis.cancel();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            {/* Minimalist Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                className="relative w-full md:w-[500px] overflow-hidden bg-slate-900/80 backdrop-blur-2xl md:rounded-[2rem] rounded-t-[2rem] shadow-2xl border border-white/10"
            >
                {/* Header */}
                <div className="relative z-20 flex items-center justify-between p-6 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/20 blur-md group-hover:bg-white/30 transition-colors" />
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 text-white">
                                <circle cx="12" cy="12" r="4" fill="currentColor" />
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
                                <path d="M12 2V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M12 19V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M2 12H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M19 12H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white tracking-tight">Kore Agent</h2>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-400 font-medium">Financial Intelligence</p>
                                <button
                                    onClick={() => setLanguage(prev => prev === 'ro-RO' ? 'en-US' : 'ro-RO')}
                                    className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-indigo-300 border border-white/10 hover:bg-white/20 transition-colors"
                                >
                                    {language === 'ro-RO' ? 'RO' : 'EN'}
                                </button>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="relative z-10 p-6 pt-4 min-h-[350px] flex flex-col">

                    {error && error.includes("API Key") ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                                <Activity size={32} className="text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Configuration Required</h3>
                            <p className="text-slate-400 max-w-xs mx-auto">
                                The AI Assistant needs a Gemini API Key to function.
                            </p>
                            <div className="bg-slate-950 p-3 rounded-lg border border-white/10 mt-4">
                                <code className="text-xs text-indigo-300 font-mono">VITE_GEMINI_API_KEY=...</code>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Add this to your .env file</p>
                        </div>
                    ) : !parsedData ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-8">

                            {/* Visualizer Container - No Background, Just Clouds */}
                            <div className="relative w-full h-48 flex items-center justify-center">
                                {isListening ? (
                                    <div className="absolute inset-0 scale-150 opacity-80">
                                        <VoiceVisualizer isListening={isListening} />
                                    </div>
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={startListening}
                                        className="relative z-10 w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group shadow-xl shadow-black/20"
                                    >
                                        <Mic size={32} className="text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                                    </motion.button>
                                )}
                            </div>

                            {/* Status Text */}
                            <div className="text-center space-y-6 relative z-20">
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={isListening ? "listening" : "idle"}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-2xl font-light text-white tracking-tight"
                                    >
                                        {isListening ? "Listening..." : (input || "How can I help?")}
                                    </motion.p>
                                </AnimatePresence>

                                {/* Keyboard Toggle - Always visible when listening to allow switching */}
                                {isListening && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => setIsListening(false)}
                                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/10 mx-auto backdrop-blur-md"
                                    >
                                        <Keyboard size={16} />
                                        <span>Type instead</span>
                                    </motion.button>
                                )}
                            </div>

                            {/* Manual Input */}
                            {!isListening && (
                                <form onSubmit={handleAnalyze} className="w-full relative z-20">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Ask anything..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all shadow-inner"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isLoading || !input.trim()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all disabled:opacity-0"
                                        >
                                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    ) : parsedData.isQuery ? (
                        // Query Result - Glass Card
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 flex flex-col items-center justify-center space-y-6"
                        >
                            <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 text-center shadow-xl">
                                <p className="text-xl text-white font-light leading-relaxed">
                                    "{parsedData.conversational_response}"
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setParsedData(null);
                                    setInput('');
                                }}
                                className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                            >
                                Ask Another Question
                            </button>
                        </motion.div>
                    ) : (
                        // Transaction Confirmation - MacOS Widget Style
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 flex flex-col justify-center space-y-6"
                        >
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-1 shadow-2xl">
                                <div className="bg-slate-900/50 rounded-[1.8rem] p-6 space-y-6 relative overflow-hidden">
                                    {/* Progress Bar */}
                                    {autoSubmitTimer && (
                                        <motion.div
                                            initial={{ width: "100%" }}
                                            animate={{ width: "0%" }}
                                            transition={{ duration: 3, ease: "linear" }}
                                            className="absolute top-0 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"
                                        />
                                    )}

                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">New Transaction</span>
                                            <p className="text-white text-xl font-medium mt-1">{parsedData.note}</p>
                                        </div>
                                        <div className={`p-2.5 rounded-2xl ${parsedData.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            <Activity size={24} />
                                        </div>
                                    </div>

                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-light text-white tracking-tight">
                                            {parsedData.amount}
                                        </span>
                                        <span className="text-xl text-slate-400 font-light">lei</span>
                                    </div>

                                    <div className="flex items-center gap-3 text-sm text-slate-300 bg-white/5 p-3 rounded-xl">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                            <Bot size={16} />
                                        </div>
                                        <span className="font-medium">{parsedData.category}</span>
                                        <span className="text-slate-500 mx-1">•</span>
                                        <span className="text-slate-400">{parsedData.date}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        cancelAutoSubmit();
                                        setParsedData(null);
                                        setInput('');
                                    }}
                                    className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleConfirm()}
                                    className="flex-1 py-4 rounded-2xl bg-white text-black font-semibold hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
                                >
                                    {autoSubmitTimer ? `Saving (${countdown})...` : "Confirm"}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export { AIAssistantModal };

