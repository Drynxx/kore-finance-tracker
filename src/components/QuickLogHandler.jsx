import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useVoiceParser } from '../hooks/useVoiceParser';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { databases, DATABASE_ID, COLLECTION_ID } from '../lib/appwrite';
import { ID } from 'appwrite';
import { CheckCircle2, AlertCircle, Sparkles, CreditCard, Banknote, ArrowRight, RefreshCw, Mic, MicOff, Globe, StopCircle } from 'lucide-react';

/**
 * Extracts voice text from URL parameters or protocol handler payloads.
 * Handles standard ?text=..., share target ?text=...&title=..., and web+kore:// protocols.
 */
const extractVoiceText = () => {
    try {
        const searchParams = new URLSearchParams(window.location.search);
        let rawParam = searchParams.get('text') || searchParams.get('title') || searchParams.get('url') || searchParams.get('q') || '';

        if (!rawParam && window.location.hash) {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            rawParam = hashParams.get('text') || hashParams.get('title') || '';
        }

        if (!rawParam) return '';

        let decoded = decodeURIComponent(rawParam).trim();

        // If the browser passed a full protocol handler URI, e.g. "web+kore://log?text=Spent%2015..."
        if (decoded.startsWith('web+kore:') || decoded.startsWith('kore:')) {
            try {
                const cleanedUri = decoded.replace(/^web\+kore:\/?\/?/, 'http://dummy.local/');
                const parsedUri = new URL(cleanedUri);
                const uriText = parsedUri.searchParams.get('text') || parsedUri.pathname.replace(/^\//, '');
                if (uriText && uriText !== 'log') {
                    return decodeURIComponent(uriText).trim();
                }
            } catch {
                // Regex fallback for custom URI schemes
                const match = decoded.match(/text=([^&]+)/i);
                if (match && match[1]) {
                    return decodeURIComponent(match[1]).trim();
                }
            }
        }

        return decoded;
    } catch (e) {
        console.error("Error extracting voice text from URL:", e);
        return '';
    }
};

export const QuickLogHandler = () => {
    const { user, loading: authLoading } = useAuth();
    const { parseVoiceInput, isParsing, error: parseError } = useVoiceParser();

    const [language, setLanguage] = useState('ro-RO');
    const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition(language);

    const [status, setStatus] = useState('idle'); // 'idle' | 'processing' | 'saving' | 'success' | 'error' | 'no-input'
    const [extractedText, setExtractedText] = useState('');
    const [manualInput, setManualInput] = useState('');
    const [parsedResult, setParsedResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const hasProcessedRef = useRef(false);
    const autoStartedRef = useRef(false);

    // Initial Mount: Trigger light haptic feedback and extract query text
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate([50]);
            } catch (e) {
                console.debug("Haptics not supported or blocked", e);
            }
        }

        const text = extractVoiceText();
        setExtractedText(text);

        if (!text) {
            setStatus('no-input');
        }
    }, []);

    // Auto-start microphone if no URL text was supplied (e.g. from Android Home Screen 1-tap shortcut)
    useEffect(() => {
        if (status === 'no-input' && isSupported && !autoStartedRef.current && !authLoading && user) {
            autoStartedRef.current = true;
            try {
                startListening();
            } catch (e) {
                console.debug("Auto-start microphone prevented by browser autoplay policy:", e);
            }
        }
    }, [status, isSupported, authLoading, user, startListening]);

    // When speech transcript stops and has text, process automatically
    useEffect(() => {
        if (status === 'no-input' && !isListening && transcript && transcript.trim().length > 3 && !hasProcessedRef.current) {
            hasProcessedRef.current = true;
            setExtractedText(transcript.trim());
            processVoiceText(transcript.trim());
        }
    }, [status, isListening, transcript]);

    // Process ingestion once auth is confirmed and URL text is available
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setStatus('error');
            setErrorMessage('You must be logged in to Kore to use OS Voice Shortcuts.');
            return;
        }

        if (extractedText && !hasProcessedRef.current && status !== 'success' && status !== 'error' && status !== 'no-input') {
            hasProcessedRef.current = true;
            processVoiceText(extractedText);
        }
    }, [authLoading, user, extractedText, status]);

    const processVoiceText = async (textToProcess) => {
        try {
            stopListening();
            setStatus('processing');
            setErrorMessage('');

            // Step 1: Parse with Gemini API
            const structuredData = await parseVoiceInput(textToProcess);
            setParsedResult(structuredData);

            // Step 2: Save to Appwrite Database
            setStatus('saving');
            const finalAmount = structuredData.type === 'expense'
                ? -Math.abs(structuredData.amount)
                : Math.abs(structuredData.amount);

            const docData = {
                userId: user.$id,
                type: structuredData.type,
                amount: finalAmount,
                category: structuredData.category || 'Other',
                date: new Date().toISOString(),
                note: `${structuredData.merchant ? structuredData.merchant + ' ' : ''}[${structuredData.paymentMethod}] ${textToProcess}`.trim()
            };

            await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID,
                ID.unique(),
                docData
            );

            // Step 3: Success state & Haptics
            setStatus('success');
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                    navigator.vibrate([100, 50, 100]);
                } catch (e) {
                    console.debug("Haptics not supported or blocked", e);
                }
            }

            // Step 4: Auto-close after 1.2 seconds or redirect to dashboard
            setTimeout(() => {
                try {
                    window.close();
                } catch (e) {
                    console.debug("window.close() blocked by browser security:", e);
                }
                // Fallback redirect if window.close() is blocked
                setTimeout(() => {
                    window.location.href = '/';
                }, 400);
            }, 1200);

        } catch (err) {
            console.error("Quick log processing failed:", err);
            setStatus('error');
            setErrorMessage(err.message || 'Failed to process voice command.');
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        setExtractedText(manualInput.trim());
        processVoiceText(manualInput.trim());
    };

    const handleRedirectDashboard = () => {
        window.location.href = '/';
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
            if (transcript && transcript.trim().length > 2) {
                setExtractedText(transcript.trim());
                processVoiceText(transcript.trim());
            }
        } else {
            startListening();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden bg-slate-950/85 backdrop-blur-2xl selection:bg-indigo-500/30">
            {/* Ambient Background Aura */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                <motion.div
                    animate={{
                        scale: [1, 1.25, 1],
                        opacity: [0.35, 0.65, 0.35],
                        rotate: [0, 90, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-96 h-96 rounded-full bg-gradient-to-tr from-indigo-600/30 via-violet-600/30 to-cyan-500/30 blur-3xl"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-md rounded-3xl bg-slate-900/90 border border-white/15 p-7 shadow-2xl shadow-indigo-950/50 backdrop-blur-3xl text-slate-100 flex flex-col items-center text-center"
            >
                {/* Status Indicator Bar */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    <span className="text-[11px] font-medium tracking-wider uppercase text-indigo-300">
                        Kore Voice Ingestion
                    </span>
                </div>

                <AnimatePresence mode="wait">
                    {/* STATE 1: PROCESSING / SAVING */}
                    {(status === 'processing' || status === 'saving' || authLoading) && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col items-center space-y-5 my-2"
                        >
                            <div className="relative flex items-center justify-center">
                                {/* Glowing Pulsing Rings */}
                                <motion.div
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.8, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute w-20 h-20 rounded-full bg-indigo-500/20 blur-md"
                                />
                                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                    <Sparkles className="w-8 h-8 text-white animate-pulse" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <h3 className="text-xl font-semibold tracking-tight text-white">
                                    {status === 'saving' ? 'Saving Transaction...' : 'Kore Agent processing...'}
                                </h3>
                                <p className="text-xs text-slate-400 max-w-xs line-clamp-2 px-2 font-mono">
                                    "{extractedText || transcript || 'Extracting parameters...'}"
                                </p>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-indigo-300/80 font-medium">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                                <span>Powered by Fast AI Flash Engine</span>
                            </div>
                        </motion.div>
                    )}

                    {/* STATE 2: SUCCESS STATE (1s Display before auto-close) */}
                    {status === 'success' && parsedResult && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9, y: 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="flex flex-col items-center space-y-5 w-full my-2"
                        >
                            {/* Animated Success Checkmark */}
                            <div className="relative">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                    className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20"
                                >
                                    <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                                </motion.div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-bold text-white tracking-tight">
                                    {parsedResult.type === 'income' ? 'Income Logged!' : 'Expense Logged!'}
                                </h3>
                                <p className="text-xs text-emerald-400 font-medium">
                                    Auto-closing in 1s...
                                </p>
                            </div>

                            {/* Summary Card */}
                            <div className="w-full rounded-2xl bg-slate-800/80 border border-white/10 p-4 text-left space-y-3 shadow-inner">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                        {parsedResult.category}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/10 text-slate-200">
                                        {parsedResult.paymentMethod === 'Card' ? (
                                            <CreditCard className="w-3 h-3 text-indigo-400" />
                                        ) : (
                                            <Banknote className="w-3 h-3 text-emerald-400" />
                                        )}
                                        {parsedResult.paymentMethod}
                                    </span>
                                </div>

                                <div className="flex items-baseline justify-between">
                                    <span className="text-2xl font-extrabold text-white tracking-tight">
                                        {parsedResult.type === 'expense' ? '-' : '+'}
                                        {parsedResult.amount.toFixed(2)}
                                        <span className="text-sm font-semibold text-slate-400 ml-1.5">
                                            {parsedResult.currency}
                                        </span>
                                    </span>
                                    {parsedResult.merchant && (
                                        <span className="text-xs font-medium text-slate-300 bg-indigo-950/60 border border-indigo-500/20 px-2 py-1 rounded-lg">
                                            {parsedResult.merchant}
                                        </span>
                                    )}
                                </div>

                                <p className="text-xs text-slate-400 italic truncate border-t border-white/5 pt-2">
                                    "{extractedText || transcript}"
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* STATE 3: LIVE SPEECH RECORDING & 1-TAP ACTION (Instant Android & Web Voice) */}
                    {status === 'no-input' && (
                        <motion.div
                            key="no-input"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col items-center space-y-4 w-full my-1"
                        >
                            {/* Animated Glowing Microphone Button */}
                            <div className="relative flex items-center justify-center my-2">
                                {isListening && (
                                    <>
                                        <motion.div
                                            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.7, 0.3] }}
                                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute w-24 h-24 rounded-full bg-indigo-500/30 blur-md"
                                        />
                                        <motion.div
                                            animate={{ scale: [1, 1.8, 1], opacity: [0.15, 0.4, 0.15] }}
                                            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                                            className="absolute w-32 h-32 rounded-full bg-cyan-500/20 blur-lg"
                                        />
                                    </>
                                )}

                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                                        isListening
                                            ? 'bg-gradient-to-tr from-rose-500 to-indigo-600 shadow-rose-500/30 scale-105'
                                            : 'bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/30'
                                    }`}
                                >
                                    {isListening ? (
                                        <Mic className="w-9 h-9 text-white animate-pulse" />
                                    ) : (
                                        <Mic className="w-9 h-9 text-white" />
                                    )}
                                </button>
                            </div>

                            {/* Voice Status & Live Transcript */}
                            <div className="space-y-1 w-full">
                                <h3 className="text-lg font-semibold text-white">
                                    {isListening ? "Listening... Speak your expense" : "Tap to Speak"}
                                </h3>
                                <div className="min-h-[38px] px-3 py-1.5 rounded-xl bg-black/20 border border-white/5 flex items-center justify-center">
                                    <p className="text-xs text-indigo-200 font-mono italic truncate">
                                        {transcript ? `"${transcript}"` : "e.g. Spent 25 lei on coffee at Starbucks with card"}
                                    </p>
                                </div>
                            </div>

                            {/* Language Switcher */}
                            <div className="flex items-center justify-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setLanguage(l => l === 'ro-RO' ? 'en-US' : 'ro-RO')}
                                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 flex items-center gap-1.5 transition-colors"
                                >
                                    <Globe className="w-3 h-3 text-indigo-400" />
                                    <span>Language: {language === 'ro-RO' ? '🇷🇴 RO' : '🇺🇸 EN'}</span>
                                </button>
                            </div>

                            {/* Or Type Manually */}
                            <form onSubmit={handleManualSubmit} className="w-full pt-2 space-y-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={manualInput}
                                        onChange={(e) => setManualInput(e.target.value)}
                                        placeholder="Or type expense here..."
                                        className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    {manualInput.trim() && (
                                        <button
                                            type="submit"
                                            className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-xs flex items-center justify-center"
                                        >
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {/* STATE 4: ERROR / RETRY */}
                    {status === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col items-center space-y-4 w-full my-2"
                        >
                            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                                <AlertCircle className="w-8 h-8" />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-semibold text-white">Processing Failed</h3>
                                <p className="text-xs text-rose-300/90 max-w-xs font-mono bg-rose-950/40 border border-rose-800/30 p-2.5 rounded-lg">
                                    {errorMessage || parseError || 'Unknown error occurred.'}
                                </p>
                            </div>

                            <div className="flex gap-2.5 w-full pt-2">
                                {(extractedText || transcript) && (
                                    <button
                                        onClick={() => processVoiceText(extractedText || transcript)}
                                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Retry</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleRedirectDashboard}
                                    className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <span>Go to Dashboard</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
export default QuickLogHandler;
