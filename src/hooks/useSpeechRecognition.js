import { useState, useEffect, useRef, useCallback } from 'react';
import { registerPlugin, Capacitor } from '@capacitor/core';

const NativeSpeech = registerPlugin('NativeSpeech');
const isNative = Capacitor.isNativePlatform();

export const useSpeechRecognition = (language = 'ro-RO') => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const [isSupported, setIsSupported] = useState(true);

    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);

    useEffect(() => {
        if (isNative) {
            // Android / Native Platform: check native speech recognizer availability
            NativeSpeech.isAvailable()
                .then((res) => {
                    setIsSupported(res?.available !== false);
                })
                .catch(() => {
                    setIsSupported(true);
                });

            // Register native speech event listeners
            let resultListener, stateListener, errorListener;

            const setupListeners = async () => {
                resultListener = await NativeSpeech.addListener('speechResult', (data) => {
                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

                    if (data?.transcript) {
                        setTranscript(data.transcript);
                    }

                    if (data?.isFinal) {
                        setIsListening(false);
                    } else {
                        silenceTimerRef.current = setTimeout(() => {
                            stopListening();
                        }, 2000);
                    }
                });

                stateListener = await NativeSpeech.addListener('listeningState', (data) => {
                    setIsListening(!!data?.isListening);
                });

                errorListener = await NativeSpeech.addListener('speechError', (data) => {
                    if (data?.error && !data.error.includes("No speech")) {
                        setError(data.error);
                    }
                    setIsListening(false);
                });
            };

            setupListeners();

            return () => {
                if (resultListener && typeof resultListener.remove === 'function') resultListener.remove();
                if (stateListener && typeof stateListener.remove === 'function') stateListener.remove();
                if (errorListener && typeof errorListener.remove === 'function') errorListener.remove();
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };
        } else {
            // Web browser fallback
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                setIsSupported(false);
                setError("Voice input is not supported in this browser.");
            }
        }
    }, [isNative]);

    const stopListening = useCallback(() => {
        if (isNative) {
            NativeSpeech.stopListening().catch(() => {});
        } else {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        setIsListening(false);
    }, [isNative]);

    const startListening = useCallback(() => {
        if (!isSupported) return;

        setError(null);
        setTranscript('');

        if (isNative) {
            NativeSpeech.startListening({ language })
                .then(() => {
                    setIsListening(true);
                })
                .catch((err) => {
                    console.error("Native speech start failed:", err);
                    setError(err?.message || "Failed to start microphone.");
                    setIsListening(false);
                });
        } else {
            // Web Speech API
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) return;

            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = language;

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
                setTranscript('');
            };

            recognition.onresult = (event) => {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

                const currentTranscript = Array.from(event.results)
                    .map((result) => result[0])
                    .map((result) => result.transcript)
                    .join('');

                setTranscript(currentTranscript);

                silenceTimerRef.current = setTimeout(() => {
                    stopListening();
                }, 2000);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                if (event.error === 'no-speech') {
                    setError("No speech detected.");
                } else if (event.error === 'not-allowed') {
                    setError("Microphone access denied.");
                } else {
                    setError(event.error);
                }
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };

            recognitionRef.current = recognition;

            try {
                recognition.start();
            } catch (err) {
                console.error("Failed to start recognition:", err);
                setError("Could not start microphone.");
            }
        }
    }, [isSupported, language, stopListening, isNative]);

    return {
        isListening,
        transcript,
        error,
        isSupported,
        startListening,
        stopListening
    };
};
