import React, { useState, useContext, useEffect, useRef } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { parseTransactionWithGemini } from '../services/gemini';
import { Sparkles, Send, X, Check, Loader2, Mic, MicOff, Undo2, Keyboard } from 'lucide-react';
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

    // TTS Helper
    const speak = (text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            const roVoice = voices.find(v => v.lang.includes('ro'));
            if (roVoice) utterance.voice = roVoice;
            window.speechSynthesis.speak(utterance);
        }
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

            const feedback = `Added ${result.amount} ${result.currency || 'lei'} for ${result.category}`;
            speak(feedback);

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
            setAutoSubmitTimer(timer);

        } catch (err) {
            setError(err.message || "Could not understand. Try being more specific.");
            speak("I couldn't understand that. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async (dataToSave = parsedData) => {
        if (!dataToSave) return;
        if (autoSubmitTimer) clearInterval(autoSubmitTimer);

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
            setError("Failed to save transaction.");
        }
    };

    const cancelAutoSubmit = () => {
        if (autoSubmitTimer) {
            clearInterval(autoSubmitTimer);
            setAutoSubmitTimer(null);
            setCountdown(0);
        }
    };

    useEffect(() => {
        // Auto-start listening when modal opens
        const timer = setTimeout(() => {
            startListening();
        }, 500); // Small delay for animation smoothness

        return () => {
            clearTimeout(timer);
            if (autoSubmitTimer) clearInterval(autoSubmitTimer);
            window.speechSynthesis.cancel();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in" onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full md:w-[480px] bg-[#0a0a0a] md:rounded-[2.5rem] rounded-t-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 border border-white/5 overflow-hidden"
            >
                {/* Cosmic Glow Background */}
                <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none blur-3xl" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-900/10 blur-[100px] pointer-events-none" />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Sparkles size={18} className="text-indigo-400 animate-pulse" />
                        <h2 className="text-lg font-medium text-slate-200 tracking-wide">Kore Assistant</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="relative z-10 min-h-[300px] flex flex-col justify-center">

                    {!parsedData ? (
                        <div className="flex flex-col items-center space-y-10">
                            {/* Gemini Live Style Visualizer */}
                            <div className="relative h-32 flex items-center justify-center w-full">
                                {isListening ? (
                                    <div className="flex items-center justify-center gap-1.5 h-full">
                                        {[...Array(5)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    height: [30, 80 + Math.random() * 40, 30],
                                                    backgroundColor: ["#6366f1", "#a855f7", "#6366f1"]
                                                }}
                                                transition={{
                                                    repeat: Infinity,
                                                    duration: 0.8,
                                                    delay: i * 0.15,
                                                    ease: "easeInOut"
                                                }}
                                                className="w-4 rounded-full blur-[2px]"
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={startListening}
                                        className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.3)] cursor-pointer group relative"
                                    >
                                        <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20" />
                                        <Mic size={36} className="text-white drop-shadow-md" />
                                    </motion.div>
                                )}
                            </div>

                            <div className="w-full space-y-6 text-center">
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

                                {/* Manual Input */}
                                {!isListening && (
                                    <form onSubmit={handleAnalyze} className="relative max-w-xs mx-auto">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Type a command..."
                                            className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-5 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-center"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isLoading || !input.trim()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500 rounded-full text-white hover:bg-indigo-400 transition-all disabled:opacity-0"
                                        >
                                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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
                                        className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 text-sm transition-colors backdrop-blur-md border border-white/5 mx-auto"
                                    >
                                        <Keyboard size={14} />
                                        <span className="text-xs font-medium">Type instead</span>
                                    </motion.button>
                                )}
                            </div>

                            {error && <p className="text-rose-400 text-sm animate-shake">{error}</p>}
                        </div>
                    ) : (
                        // Result Card
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6"
                        >
                            <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 space-y-6 relative overflow-hidden backdrop-blur-md">
                                {/* Progress Bar */}
                                {autoSubmitTimer && (
                                    <motion.div
                                        initial={{ width: "100%" }}
                                        animate={{ width: "0%" }}
                                        transition={{ duration: 3, ease: "linear" }}
                                        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"
                                    />
                                )}

                                <div className="space-y-1">
                                    <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">I heard</span>
                                    <p className="text-white text-xl font-light leading-relaxed">"{parsedData.note}"</p>
                                </div>

                                <div className="flex items-end justify-between">
                                    <div className="space-y-1">
                                        <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Amount</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                                                {parsedData.amount}
                                            </span>
                                            <span className="text-lg text-slate-500">lei</span>
                                        </div>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${parsedData.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                        {parsedData.type}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-slate-400 text-sm bg-black/20 p-3 rounded-xl border border-white/5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <span className="font-medium text-slate-200">{parsedData.category}</span>
                                    <span className="text-slate-600">•</span>
                                    <span>{parsedData.date}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        cancelAutoSubmit();
                                        setParsedData(null);
                                        setInput('');
                                    }}
                                    className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Undo2 size={18} />
                                    Undo
                                </button>
                                <button
                                    onClick={() => handleConfirm()}
                                    className="flex-1 py-4 rounded-2xl bg-white text-black font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                >
                                    {autoSubmitTimer ? `Saving in ${countdown}...` : (
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
