import { rateLimiter } from '../utils/rateLimiter';

// Helper for API calls
const callGeminiApi = async (action, payload) => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API Request Failed');
        }

        return await response.json();
    } catch (error) {
        console.error("Gemini API Error:", error.message);
        throw error;
    }
};

export const checkApiKey = () => true; // Server handles this now

export const parseTransactionWithGemini = async (text, history = []) => {
    return callGeminiApi('parse', { text, history });
};

export const generateCashFlowForecast = async (transactions, currentBalance) => {
    return callGeminiApi('forecast', { history: transactions, currentBalance });
};

export const suggestCategory = async (note, existingCategories) => {
    // Client-side rate limiting still useful to prevent spamming our own API
    if (!rateLimiter.check('gemini_suggest', 5, 10000)) {
        console.warn("Rate limit exceeded for Gemini Category Suggestion");
        return null;
    }

    if (!note.trim()) return null;

    try {
        const result = await callGeminiApi('suggest_category', { note, existingCategories });
        return result.category;
    } catch (error) {
        return null; // Fail silently for suggestions
    }
};
