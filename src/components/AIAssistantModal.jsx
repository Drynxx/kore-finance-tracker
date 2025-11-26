import React, { useState, useContext, useEffect, useRef } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { parseTransactionWithGemini } from '../services/gemini';
import { Bot, Send, X, Check, Loader2, Mic, MicOff, Undo2, Keyboard, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AIAssistantModal = ({ onClose }) => {
    const { addTransaction } = useContext(TransactionContext);
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

    // TTS Helper
    const speak = (text) => {
        if ('speechSynthesis' in window) {
            // Cancel current speech to avoid queue buildup
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            // Get voices (handling async loading if needed, though usually loaded by now)
            let voices = window.speechSynthesis.getVoices();

            // Retry getting voices if empty (Chrome quirk)
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
        // Priority: 
        // 1. "Natural" (Edge/Windows High Quality)
        // 2. "Google" (Chrome High Quality)
        // 3. Any Romanian voice
        const roVoices = voices.filter(v => v.lang.includes('ro'));

        const preferredVoice = roVoices.find(v => v.name.includes('Natural')) ||
            roVoices.find(v => v.name.includes('Google')) ||
            roVoices[0];

        if (preferredVoice) {
            utterance.voice = preferredVoice;
            // Slightly faster rate for a more "assistant" feel
            utterance.rate = 1.05;
            utterance.pitch = 1.0;
        }

        window.speechSynthesis.speak(utterance);
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setError("Voice input is not supported in this browser.");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'ro-RO';

        recognition.onstart = () => {
            setIsListening(true);
            setError('');
            setInput('');
            transcriptRef.current = '';
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            setInput(transcript);
            transcriptRef.current = transcript;
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            if (event.error === 'no-speech') {
                setError("Didn't hear anything. Try again.");
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            if (transcriptRef.current.trim()) {
                handleAnalyze(null, transcriptRef.current);
            }
        };

        recognition.start();
    };

    const handleAnalyze = async (e, overrideInput = null) => {
        if (e) e.preventDefault();
        const textToAnalyze = overrideInput || input;

        if (!textToAnalyze.trim()) return;

        setIsLoading(true);
        setError('');
        setParsedData(null);

        try {
            const result = await parseTransactionWithGemini(textToAnalyze);
            setParsedData(result);

            // Use the AI's conversational response if available, otherwise fallback
            const feedback = result.conversational_response || `Added ${result.amount} ${result.currency || 'lei'} for ${result.category}`;
            speak(feedback);

            // Clear any existing timer
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
            setError(err.message || "Could not understand. Try being more specific.");
            speak("I couldn't understand that. Please try again.");
        } finally {
            setIsLoading(false);
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
        // Auto-start listening when modal opens
        const timer = setTimeout(() => {
            startListening();
        }, 500); // Small delay for animation smoothness

        return () => {
            clearTimeout(timer);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            window.speechSynthesis.cancel();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full md:w-[480px] bg-gradient-to-b from-slate-900 to-black md:rounded-[2rem] rounded-t-[2rem] p-8 shadow-2xl shadow-blue-500/10 border border-white/10 overflow-hidden"
            >
                {/* Fintech Glow Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 blur-[80px] pointer-events-none" />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <Bot size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white tracking-tight">Kore Assistant</h2>
                            <p className="text-xs text-slate-400 font-medium">AI Financial Agent</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="relative z-10 min-h-[300px] flex flex-col justify-center">

                    {!parsedData ? (
                        <div className="flex flex-col items-center space-y-12">
                            {/* Digital Pulse Visualizer */}
                            <div className="relative h-32 flex items-center justify-center w-full">
                                {isListening ? (
                                    <div className="flex items-center justify-center gap-1 h-full">
                                        {[...Array(7)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    height: [20, 40 + Math.random() * 60, 20],
                                                    opacity: [0.5, 1, 0.5]
                                                }}
                                                transition={{
                                                    repeat: Infinity,
                                                    duration: 0.5,
                                                    delay: i * 0.05,
                                                    ease: "easeInOut"
                                                }}
                                                className="w-1.5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={startListening}
                                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] cursor-pointer group relative border border-white/10"
                                    >
                                        <div className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Mic size={32} className="text-white" />
                                    </motion.div>
                                )}
                            </div>

                            <div className="w-full space-y-8 text-center">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={isListening ? "listening" : "idle"}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-2"
                                    >
                                        <p className="text-2xl font-medium text-white tracking-tight">
                                            {isListening ? "Listening..." : (input || "How can I help?")}
                                        </p>
                                        {isListening && (
                                            <p className="text-sm text-blue-400 font-medium animate-pulse">
                                                Processing voice input
                                            </p>
                                        )}
                                    </motion.div>
                                </AnimatePresence>

                                {/* Manual Input */}
                                {!isListening && (
                                    <form onSubmit={handleAnalyze} className="relative max-w-sm mx-auto">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Type a command..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-5 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isLoading || !input.trim()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-all disabled:opacity-0 shadow-lg shadow-blue-600/20"
                                        >
                                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        </button>
                                    </form>
                                )}

                                {/* Keyboard Toggle (Only when listening) */}
                                {isListening && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => {
                                            setIsListening(false);
                                        }}
                                        className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition-colors border border-white/5 mx-auto font-medium"
                                    >
                                        <Keyboard size={16} />
                                        <span>Type instead</span>
                                    </motion.button>
                                )}
                            </div>

                            {error && <p className="text-rose-400 text-sm font-medium bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20">{error}</p>}
                        </div>
                    ) : (
                        // Result Card - Receipt Style
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6"
                        >
                            <div className="bg-white rounded-[1.5rem] p-1 overflow-hidden shadow-2xl shadow-black/50">
                                <div className="bg-slate-50 rounded-[1.3rem] p-6 space-y-6 relative overflow-hidden border border-slate-200">
                                    {/* Progress Bar */}
                                    {autoSubmitTimer && (
                                        <motion.div
                                            initial={{ width: "100%" }}
                                            animate={{ width: "0%" }}
                                            transition={{ duration: 3, ease: "linear" }}
                                            className="absolute top-0 left-0 h-1 bg-blue-600"
                                        />
                                    )}

                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Transaction</span>
                                            <p className="text-slate-900 text-lg font-semibold leading-tight">"{parsedData.note}"</p>
                                        </div>
                                        <div className={`p-2 rounded-xl ${parsedData.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            <Activity size={20} />
                                        </div>
                                    </div>

                                    <div className="py-6 border-y border-dashed border-slate-200 flex flex-col items-center justify-center space-y-1">
                                        <span className="text-slate-400 text-xs font-medium">Total Amount</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-bold text-slate-900 tracking-tight">
                                                {parsedData.amount}
                                            </span>
                                            <span className="text-lg text-slate-500 font-medium">lei</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                                <Bot size={14} />
                                            </div>
                                            <span className="font-medium">{parsedData.category}</span>
                                        </div>
                                        <span className="text-slate-400 font-medium">{parsedData.date}</span>
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
                                    className="flex-1 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors flex items-center justify-center gap-2 border border-white/5"
                                >
                                    <Undo2 size={18} />
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleConfirm()}
                                    className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                                >
                                    {autoSubmitTimer ? `Saving (${countdown})...` : (
                                        <>
                                            <Check size={18} strokeWidth={2.5} />
                                            Confirm
                                        </>
                                    )}
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
