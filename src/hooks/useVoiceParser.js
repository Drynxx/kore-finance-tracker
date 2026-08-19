import { useState, useCallback } from 'react';
import { parseVoiceShortcut } from '../services/gemini';

export const useVoiceParser = () => {
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const parseVoiceInput = useCallback(async (rawText) => {
        if (!rawText || !rawText.trim()) {
            throw new Error("Empty voice or text payload received.");
        }

        setIsParsing(true);
        setError(null);

        try {
            // Strictly route through the server-side API proxy where OPENROUTER_API_KEY is kept private
            const parsedData = await parseVoiceShortcut(rawText.trim());

            // Normalization & Validation safeguards
            const normalized = {
                amount: Math.abs(parseFloat(parsedData.amount)) || 0,
                currency: (parsedData.currency || 'RON').toUpperCase(),
                category: parsedData.category || 'Other',
                paymentMethod: parsedData.paymentMethod === 'Card' ? 'Card' : 'Cash',
                type: parsedData.type === 'income' ? 'income' : 'expense',
                merchant: (parsedData.merchant || '').trim()
            };

            if (normalized.amount <= 0) {
                throw new Error("Could not extract a valid transaction amount from input.");
            }

            setResult(normalized);
            setIsParsing(false);
            return normalized;
        } catch (err) {
            const errorMsg = err.message || "Failed to parse voice command with AI.";
            console.error("useVoiceParser error:", err);
            setError(errorMsg);
            setIsParsing(false);
            throw err;
        }
    }, []);

    return {
        parseVoiceInput,
        isParsing,
        error,
        result
    };
};
