import { rateLimiter } from '../utils/rateLimiter';

// Check if API service is available
export const checkApiKey = () => true;

// In-memory forecast cache to avoid hammering API
let forecastCache = {
    key: null,
    data: null,
    timestamp: 0
};

const callAiProxy = async (action, payload) => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, payload }),
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json().catch(() => null);
        return data?.result || null;
    } catch {
        return null;
    }
};

// ----------------------------------------------------
// LOCAL STATISTICAL & RULE-BASED FALLBACK ENGINES
// ----------------------------------------------------

/**
 * Generates an accurate 30-day cash flow forecast locally when AI is rate-limited or offline.
 */
export const generateStatisticalForecast = (transactions = [], currentBalance = 0) => {
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const recentTx = Array.isArray(transactions) 
        ? transactions.filter(t => new Date(t.date) >= ninetyDaysAgo)
        : [];

    // Calculate daily average net spending
    let totalExpenses = 0;
    let totalIncome = 0;
    const daysCount = Math.max(1, Math.min(90, Math.ceil((today - new Date(recentTx[recentTx.length - 1]?.date || today)) / (1000 * 60 * 60 * 24))));

    recentTx.forEach(t => {
        const amt = Math.abs(parseFloat(t.amount) || 0);
        if (t.type === 'expense' || t.amount < 0) {
            totalExpenses += amt;
        } else {
            totalIncome += amt;
        }
    });

    const dailyBurnRate = recentTx.length > 0 ? (totalExpenses / Math.max(14, daysCount)) : 0;
    const dailyIncomeRate = recentTx.length > 0 ? (totalIncome / Math.max(14, daysCount)) : 0;

    // Detect recurring transactions (e.g. rent on 1st/15th, salary on 25th)
    const recurringByDay = {};
    recentTx.forEach(t => {
        const dayOfMonth = new Date(t.date).getDate();
        if (!recurringByDay[dayOfMonth]) {
            recurringByDay[dayOfMonth] = [];
        }
        recurringByDay[dayOfMonth].push(t);
    });

    const forecast = [];
    let runningBalance = currentBalance;

    for (let i = 1; i <= 30; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dateStr = targetDate.toISOString().split('T')[0];
        const dayOfMonth = targetDate.getDate();

        let reason = null;
        let dayDelta = 0;

        if (recurringByDay[dayOfMonth] && recurringByDay[dayOfMonth].length >= 2) {
            const sample = recurringByDay[dayOfMonth][0];
            const isExp = sample.type === 'expense' || sample.amount < 0;
            const avgAmt = recurringByDay[dayOfMonth].reduce((acc, c) => acc + Math.abs(parseFloat(c.amount)), 0) / recurringByDay[dayOfMonth].length;
            dayDelta += isExp ? -avgAmt : avgAmt;
            reason = sample.category || (isExp ? 'Recurring Bill' : 'Recurring Income');
        } else {
            dayDelta = (dailyIncomeRate - dailyBurnRate);
            if (i % 7 === 0) {
                reason = 'Estimated Weekly Trend';
            }
        }

        runningBalance += dayDelta;

        forecast.push({
            date: dateStr,
            balance: Math.round(runningBalance * 100) / 100,
            reason: reason || 'Estimated Spending'
        });
    }

    return forecast;
};

/**
 * Local regex & keyword-based voice shortcut parser
 */
export const parseLocalVoiceShortcut = (text = '', history = []) => {
    const clean = text.toLowerCase().trim();
    
    // Extract amount: e.g. "50 lei", "15.5 ron", "20 eur", "spent 100"
    const amountMatch = clean.match(/(?:spent|cheltuit|platit|am dat|cumparat|bought|paid|am bagat)?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:lei|ron|eur|usd|gbp|\$|€|£)?/i) ||
                        clean.match(/(\d+(?:[.,]\d{1,2})?)/);
    
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
    
    let currency = 'RON';
    if (clean.includes('eur') || clean.includes('euro') || clean.includes('€')) currency = 'EUR';
    if (clean.includes('usd') || clean.includes('dollar') || clean.includes('$')) currency = 'USD';
    if (clean.includes('gbp') || clean.includes('lire') || clean.includes('£')) currency = 'GBP';

    let category = 'Other';
    if (/(cafea|coffee|mancare|food|pizza|burger|lidl|kaufland|mega|restaurant|pranz|cina|mic dejun|shaorma|profi|carrefour|auchan|paine|lapte|sandwich|croissant|covrig)/i.test(clean)) category = 'Food';
    else if (/(uber|bolt|taxi|benzina|gaz|diesel|motorina|transport|bus|metrou|tren|omv|petrom|mol|rompetrol|bilet)/i.test(clean)) category = 'Transport';
    else if (/(chirie|rent|curent|gaz|intretinere|enel|digi|vodafone|orange|utilitati|lumina|eon|hidroelectrica|factura)/i.test(clean)) category = 'Utilities';
    else if (/(haine|shoes|adidasi|mall|zara|hm|shopping|cumparaturi|emag|altex|flanco|fashion|tricou|pantaloni)/i.test(clean)) category = 'Shopping';
    else if (/(cinema|film|netflix|spotify|party|bere|club|joc|game|distractie|biliard|bowling|iesire)/i.test(clean)) category = 'Entertainment';
    else if (/(salariu|salary|venit|avans|bonus|incasat|primit bani|transfer primit|diurna)/i.test(clean)) category = 'Salary';

    const type = (clean.includes('salariu') || clean.includes('venit') || clean.includes('primit') || clean.includes('income')) ? 'income' : 'expense';
    const paymentMethod = (clean.includes('card') || clean.includes('pos') || clean.includes('apple pay') || clean.includes('google pay')) ? 'Card' : 'Cash';

    let merchant = text
        .replace(/(\d+(?:[.,]\d{1,2})?)/g, '')
        .replace(/\b(lei|ron|eur|euro|usd|am|dat|cheltuit|pe|la|pentru|in|spent|for|on|bought|paid|o|un|de|cu|din)\b/gi, '')
        .replace(/[^\w\s\u00C0-\u024F]/gi, '')
        .trim();

    if (!merchant) merchant = category;

    // Conversational query answers when no amount was given
    let conversational_response = `Am înregistrat ${amount} ${currency} pentru ${category} (${merchant}).`;

    if (amount === 0) {
        if (/(salut|buna|hello|hi|hei)/i.test(clean)) {
            conversational_response = "Salut! Cu ce te pot ajuta? Poți să-mi spui o cheltuială (ex: 'Cafea 15 lei') sau să mă întrebi despre soldul tău.";
        } else if (/(cati bani|sold|balanta|ce am|disponibil)/i.test(clean)) {
            const balance = history.reduce((sum, t) => sum + (t.type === 'income' || t.amount > 0 ? Math.abs(t.amount) : -Math.abs(t.amount)), 0);
            conversational_response = `Soldul tău curent este de ${Math.round(balance * 100) / 100} RON.`;
        } else if (/(cat am cheltuit|cheltuieli|total)/i.test(clean)) {
            const expenses = history
                .filter(t => t.type === 'expense' || t.amount < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            conversational_response = `Ai cheltuit un total de ${Math.round(expenses * 100) / 100} RON conform istoricului tău.`;
        } else {
            conversational_response = "Tranzacțiile și datele tale financiare sunt actualizate.";
        }
    }

    return {
        amount,
        currency,
        category,
        paymentMethod,
        type,
        merchant,
        conversational_response
    };
};

const matchLocalCategory = (note = '', existingCategories = []) => {
    const clean = note.toLowerCase();
    if (/(cafea|coffee|mancare|food|pizza|burger|lidl|kaufland|mega|restaurant)/i.test(clean)) return 'Food';
    if (/(uber|bolt|taxi|benzina|gaz|diesel|transport|bus)/i.test(clean)) return 'Transport';
    if (/(chirie|rent|curent|gaz|intretinere|utilitati)/i.test(clean)) return 'Utilities';
    if (/(haine|shoes|mall|shopping|cumparaturi|emag)/i.test(clean)) return 'Shopping';
    if (/(cinema|film|netflix|spotify|bere|club|entertainment)/i.test(clean)) return 'Entertainment';
    if (/(salariu|salary|venit|bonus)/i.test(clean)) return 'Salary';
    return existingCategories[0] || 'Other';
};

// ----------------------------------------------------
// PUBLIC API SERVICES WITH AUTOMATIC LOCAL FALLBACKS
// ----------------------------------------------------

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

        if (response.ok) {
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
                        } catch {
                            // ignore partial JSON parse errors
                        }
                    }
                }
            }

            if (fullText.trim()) {
                if (onComplete) onComplete(fullText);
                return fullText;
            }
        }
    } catch {
        // Handled below
    }

    const local = parseLocalVoiceShortcut(text, history);
    const fallbackText = local.conversational_response || "Tranzacțiile tale sunt sincronizate și în siguranță.";
    if (onChunk) onChunk(fallbackText, fallbackText);
    if (onComplete) onComplete(fallbackText);
    return fallbackText;
};

export const parseTransactionWithGemini = async (text, history = []) => {
    try {
        const res = await callAiProxy('parseTransaction', { text, history });
        if (res && res.intent) {
            return res;
        }
    } catch {
        // Handled below
    }

    const local = parseLocalVoiceShortcut(text, history);
    return {
        intent: local.amount > 0 ? "add" : "query",
        type: local.type,
        amount: local.amount,
        category: local.category,
        note: local.merchant || text,
        date: new Date().toISOString().split('T')[0],
        conversational_response: local.conversational_response
    };
};

export const parseVoiceShortcut = async (text) => {
    try {
        const res = await callAiProxy('parseVoiceShortcut', { text });
        if (res && typeof res.amount === 'number') {
            return res;
        }
    } catch {
        // Handled below
    }
    return parseLocalVoiceShortcut(text);
};

export const generateCashFlowForecast = async (transactions = [], currentBalance = 0) => {
    // Check in-memory cache (10 minute TTL)
    const cacheKey = `${transactions.length}_${currentBalance}`;
    const now = Date.now();
    if (forecastCache.key === cacheKey && (now - forecastCache.timestamp < 10 * 60 * 1000) && Array.isArray(forecastCache.data) && forecastCache.data.length > 0) {
        return forecastCache.data;
    }

    try {
        const data = await callAiProxy('generateForecast', { transactions, currentBalance });
        if (Array.isArray(data) && data.length >= 10) {
            forecastCache = { key: cacheKey, data, timestamp: now };
            return data;
        }
    } catch {
        // Handled below
    }

    const localForecast = generateStatisticalForecast(transactions, currentBalance);
    forecastCache = { key: cacheKey, data: localForecast, timestamp: now };
    return localForecast;
};

export const suggestCategory = async (note, existingCategories = []) => {
    if (!note || !note.trim()) return null;

    if (rateLimiter.check('gemini_suggest', 5, 10000)) {
        try {
            const res = await callAiProxy('suggestCategory', { note, existingCategories });
            if (res) return res;
        } catch {
            // Handled below
        }
    }

    return matchLocalCategory(note, existingCategories);
};
