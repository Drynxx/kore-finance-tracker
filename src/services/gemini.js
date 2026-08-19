import { rateLimiter } from '../utils/rateLimiter';

// Check if API service is available
export const checkApiKey = () => true;

const callAiProxy = async (action, payload) => {
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API returned HTTP status ${response.status}`);
    }

    const data = await response.json();
    return data.result;
};

// Word-by-word streaming for chat interface
export const streamChatFromAI = async (text, history = [], onChunk, onComplete) => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'streamChat',
                payload: { text, history }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Stream failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if (dataStr === '[DONE]') {
                        break;
                    }
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.token) {
                            fullText += parsed.token;
                            if (onChunk) onChunk(parsed.token, fullText);
                        }
                    } catch (e) {
                        // ignore JSON parse error on incomplete chunks
                    }
                }
            }
        }

        if (onComplete) onComplete(fullText);
        return fullText;
    } catch (error) {
        console.error("AI Streaming Error:", error);
        throw error;
    }
};

export const parseTransactionWithGemini = async (text, history = []) => {
    try {
        return await callAiProxy('parseTransaction', { text, history });
    } catch (error) {
        console.error("AI Parsing Error:", error);
        throw new Error(`AI Error: ${error.message || "Unknown error"}`);
    }
};

export const parseVoiceShortcut = async (text) => {
    try {
        return await callAiProxy('parseVoiceShortcut', { text });
    } catch (error) {
        console.error("AI Voice Shortcut Error:", error);
        throw new Error(`AI Voice Parsing Error: ${error.message || "Unknown error"}`);
    }
};

export const generateCashFlowForecast = async (transactions, currentBalance) => {
    try {
        const data = await callAiProxy('generateForecast', { transactions, currentBalance });
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("AI Forecast Error:", error);
        return [];
    }
};

export const suggestCategory = async (note, existingCategories) => {
    if (!rateLimiter.check('gemini_suggest', 5, 10000)) {
        console.warn("Rate limit exceeded for Category Suggestion");
        return null;
    }

    if (!note || !note.trim()) return null;

    try {
        return await callAiProxy('suggestCategory', { note, existingCategories });
    } catch (error) {
        console.error("AI Categorization Error:", error);
        return null;
    }
};
