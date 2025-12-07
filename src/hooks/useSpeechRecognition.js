import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = (language = 'ro-RO') => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const [isSupported, setIsSupported] = useState(true);

    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setIsSupported(false);
            setError("Voice input is not supported in this browser.");
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        setIsListening(false);
    }, []);

    const startListening = useCallback(() => {
        if (!isSupported) return;

        // Abort previous instance
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false; // We handle "continuous" logic manually for better control
        recognition.interimResults = true;
        recognition.lang = language;

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
            setTranscript('');
        };

        recognition.onresult = (event) => {
            // Clear silence timer
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            const currentTranscript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');

            setTranscript(currentTranscript);

            // Auto-stop after 2 seconds of silence
            silenceTimerRef.current = setTimeout(() => {
                stopListening();
            }, 2000);
        };

        recognition.onerror = (event) => {
            console.error("Speech verification error", event.error);
            if (event.error === 'no-speech') {
                // Ignore no-speech errors in some contexts, or handle them
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
    }, [isSupported, language, stopListening]);

    return {
        isListening,
        transcript,
        error,
        isSupported,
        startListening,
        stopListening
    };
};
