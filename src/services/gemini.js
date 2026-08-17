import { rateLimiter } from '../utils/rateLimiter';

// Check if API service is available (client-side check for proxy configuration)
export const checkApiKey = () => true;

const callGeminiProxy = async (action, payload) => {
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Proxy returned HTTP status ${response.status}`);
    }

    const data = await response.json();
    return data.result;
};

export const parseTransactionWithGemini = async (text, history = []) => {
    try {
        return await callGeminiProxy('parseTransaction', { text, history });
    } catch (error) {
        console.error("Gemini Error:", error);
        throw new Error(`AI Error: ${error.message || "Unknown error"}`);
    }
};

export const generateCashFlowForecast = async (transactions, currentBalance) => {
    try {
        const data = await callGeminiProxy('generateForecast', { transactions, currentBalance });
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Gemini Forecast Error:", error);
        return [];
    }
};

export const suggestCategory = async (note, existingCategories) => {
    // Rate Limit: 5 requests per 10 seconds
    if (!rateLimiter.check('gemini_suggest', 5, 10000)) {
        console.warn("Rate limit exceeded for Gemini Category Suggestion");
        return null;
    }

    if (!note || !note.trim()) return null;

    try {
        return await callGeminiProxy('suggestCategory', { note, existingCategories });
    } catch (error) {
        console.error("Gemini Categorization Error:", error);
        return null;
    }
};
