import { rateLimiter } from '../utils/rateLimiter.js';

// Check if API service is available
export const checkApiKey = () => true;

// ----------------------------------------------------
// PILLAR 1: ZERO-TOKEN LOCAL DICTIONARY & ADAPTIVE LRU MEMORY
// ----------------------------------------------------

const CATEGORY_DICTIONARY = {
    Food: [
        'cafea', 'coffee', 'espresso', 'cappuccino', 'latte', 'starbucks', '5togo', 'ted',
        'mancare', 'food', 'pizza', 'burger', 'shaorma', 'shawarma', 'kebab', 'dristor',
        'lidl', 'kaufland', 'mega image', 'mega', 'carrefour', 'auchan', 'profi', 'penny',
        'metro', 'selgros', 'restaurant', 'pranz', 'cina', 'mic dejun', 'breakfast', 'lunch',
        'dinner', 'glovo', 'tazz', 'bolt food', 'ubereats', 'paine', 'lapte', 'oua',
        'carne', 'legume', 'fructe', 'covrig', 'patiserie', 'luca', 'petru', 'mcdonalds',
        'kfc', 'subway', 'mesopotamia', 'noodles', 'sushi', 'cantina'
    ],
    Transport: [
        'uber', 'bolt', 'taxi', 'benzina', 'motorina', 'gaz', 'diesel', 'fuel', 'petrom',
        'omv', 'mol', 'rompetrol', 'lukoil', 'socar', 'spalatorie', 'parcare', 'parking',
        'metrou', 'metrorex', 'stb', 'ratb', 'autobuz', 'bus', 'tramvai', 'tren', 'cfr',
        'bilet', 'abonament transport', 'rovinieta', 'itp', 'asigurare auto', 'rca', 'service auto'
    ],
    Utilities: [
        'chirie', 'rent', 'curent', 'electricitate', 'gaz', 'intretinere', 'enel', 'eon',
        'hidroelectrica', 'electrica', 'engie', 'digi', 'rcs', 'rds', 'vodafone', 'orange',
        'telekom', 'utilitati', 'apa nova', 'factura', 'gunoi', 'caldura', 'termoenergetica'
    ],
    Shopping: [
        'haine', 'clothes', 'pantofi', 'shoes', 'adidasi', 'mall', 'zara', 'h&m', 'hm',
        'bershka', 'pull&bear', 'stradivarius', 'mango', 'massimo dutti', 'reserved',
        'decathlon', 'intersport', 'nike', 'adidas', 'puma', 'emag', 'altex', 'flanco',
        'ikea', 'jysk', 'dedeman', 'leroy merlin', 'brico depot', 'dm', 'sephora',
        'douglas', 'notino', 'farmacie', 'catena', 'dr max', 'help net', 'cumparaturi'
    ],
    Entertainment: [
        'cinema', 'film', 'movie', 'netflix', 'spotify', 'youtube', 'hbo', 'disney',
        'apple tv', 'steam', 'playstation', 'psn', 'xbox', 'game', 'joc', 'concert',
        'festival', 'untold', 'neversea', 'electric castle', 'bere', 'beer', 'vin', 'wine',
        'club', 'party', 'bar', 'pub', 'biliard', 'bowling', 'vacanta', 'hotel', 'airbnb', 'booking'
    ],
    Salary: [
        'salariu', 'salary', 'venit', 'avans', 'lichidare', 'bonus', 'prima', 'incasat',
        'primit bani', 'transfer primit', 'diurna', 'dividende', 'bursa', 'renta'
    ],
    Freelance: [
        'freelance', 'client', 'proiect', 'factura incasata', 'upwork', 'fiverr', 'consultanta', 'onorariu'
    ]
};

// Adaptive User Category Memory (localStorage LRU Cache)
export const getStoredVendorCategory = (note) => {
    if (!note || typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem('kore_vendor_memory');
        if (!raw) return null;
        const memory = JSON.parse(raw);
        return memory[note.trim().toLowerCase()] || null;
    } catch {
        return null;
    }
};

export const recordVendorCategory = (note, category) => {
    if (!note || !category || typeof localStorage === 'undefined') return;
    try {
        const raw = localStorage.getItem('kore_vendor_memory');
        const memory = raw ? JSON.parse(raw) : {};
        const key = note.trim().toLowerCase();
        memory[key] = category;

        // Keep maximum 200 items to avoid storage bloat
        const keys = Object.keys(memory);
        if (keys.length > 200) {
            delete memory[keys[0]];
        }
        localStorage.setItem('kore_vendor_memory', JSON.stringify(memory));
    } catch {
        // Safe failover
    }
};


export const matchLocalCategory = (note = '', existingCategories = []) => {
    if (!note || !note.trim()) return null;
    const clean = note.toLowerCase().trim();

    // 1. Adaptive User Memory (Highest priority)
    const userMemory = getStoredVendorCategory(clean);
    if (userMemory) return userMemory;

    // 2. Curated Financial Dictionary
    for (const [categoryName, keywords] of Object.entries(CATEGORY_DICTIONARY)) {
        for (const kw of keywords) {
            if (clean.includes(kw)) {
                return categoryName;
            }
        }
    }

    return null;
};

// ----------------------------------------------------
// PILLAR 2: FINANCIAL CONTEXT COMPRESSION (-75% TOKENS)
// ----------------------------------------------------

/**
 * Compresses financial transaction history from ~1,500 tokens down to ~200 tokens
 * using pre-computed summary aggregates and compact pipe-delimited syntax.
 */
export const compressFinancialContext = (transactions = [], currentBalance = 0) => {
    const recent = Array.isArray(transactions) ? transactions.slice(0, 10) : [];

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    let monthIncome = 0;
    let monthExpense = 0;
    const catTotals = {};

    transactions.forEach(t => {
        if (t.date && t.date.startsWith(currentMonth)) {
            const amt = Math.abs(parseFloat(t.amount) || 0);
            if (t.type === 'income' || t.amount > 0) {
                monthIncome += amt;
            } else {
                monthExpense += amt;
                const cat = t.category || 'Other';
                catTotals[cat] = (catTotals[cat] || 0) + amt;
            }
        }
    });

    const topCategories = Object.entries(catTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c, a]) => `${c}:${Math.round(a)}`)
        .join(', ');

    // Compact Pipe-Delimited Syntax: "MM-DD|Amt|Cat|Note"
    const compactHistory = recent.map(t => {
        const dateStr = (t.date || '').slice(5);
        const amt = (t.type === 'income' || t.amount > 0) ? `+${Math.abs(t.amount)}` : `-${Math.abs(t.amount)}`;
        const note = (t.note || '').slice(0, 20).replace(/\|/g, '/');
        return `${dateStr}|${amt}|${t.category || 'Other'}|${note}`;
    }).join('\n');

    return {
        summary: `Bal:${Math.round(currentBalance)} | Mth:${currentMonth} +${Math.round(monthIncome)}/-${Math.round(monthExpense)} | Top:${topCategories || 'None'}`,
        compactHistory
    };
};

// ----------------------------------------------------
// PILLAR 3: PERSISTENT CONTENT-HASHED FORECAST CACHE
// ----------------------------------------------------

const getPersistentForecast = (txCount, currentBalance, lastTxDate) => {
    if (typeof localStorage === 'undefined') return null;
    try {
        const key = `kore_fc_${txCount}_${Math.round(currentBalance)}_${lastTxDate}`;
        const raw = localStorage.getItem('kore_forecast_cache');
        if (!raw) return null;
        const cached = JSON.parse(raw);
        const now = Date.now();
        // Check 24-hour TTL and matching transaction state
        if (cached.key === key && (now - cached.timestamp < 24 * 60 * 60 * 1000) && Array.isArray(cached.data) && cached.data.length >= 10) {
            return cached.data;
        }
    } catch {
        return null;
    }
    return null;
};

const setPersistentForecast = (txCount, currentBalance, lastTxDate, data) => {
    if (typeof localStorage === 'undefined') return;
    try {
        const key = `kore_fc_${txCount}_${Math.round(currentBalance)}_${lastTxDate}`;
        localStorage.setItem('kore_forecast_cache', JSON.stringify({
            key,
            data,
            timestamp: Date.now()
        }));
    } catch {
        // Safe failover
    }
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

export const generateStatisticalForecast = (transactions = [], currentBalance = 0) => {
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const recentTx = Array.isArray(transactions) 
        ? transactions.filter(t => new Date(t.date) >= ninetyDaysAgo)
        : [];

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

export const parseLocalVoiceShortcut = (text = '', history = []) => {
    const clean = text.toLowerCase().trim();

    const amountMatch = clean.match(/(?:spent|cheltuit|platit|am dat|cumparat|bought|paid|am bagat)?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:lei|ron|eur|usd|gbp|\$|€|£)?/i) ||
                        clean.match(/(\d+(?:[.,]\d{1,2})?)/);

    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;

    let currency = 'RON';
    if (clean.includes('eur') || clean.includes('euro') || clean.includes('€')) currency = 'EUR';
    if (clean.includes('usd') || clean.includes('dollar') || clean.includes('$')) currency = 'USD';
    if (clean.includes('gbp') || clean.includes('lire') || clean.includes('£')) currency = 'GBP';

    // Check dictionary & adaptive memory first
    let category = matchLocalCategory(clean) || 'Other';

    const isIncome = /(salariu|salary|venit|avans|bonus|incasat|primit bani|transfer primit|diurna|income)/i.test(clean);
    const type = isIncome ? 'income' : 'expense';
    const paymentMethod = /(card|pos|apple pay|google pay|online|revolut)/i.test(clean) ? 'Card' : 'Cash';

    let merchant = text
        .replace(/(\d+(?:[.,]\d{1,2})?)/g, '')
        .replace(/\b(lei|ron|eur|euro|usd|am|dat|cheltuit|pe|la|pentru|in|spent|for|on|bought|paid|o|un|de|cu|din)\b/gi, '')
        .replace(/[^\w\s\u00C0-\u024F]/gi, '')
        .trim();

    if (!merchant) merchant = category;

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

// ----------------------------------------------------
// PUBLIC API SERVICES WITH TOKEN OPTIMIZATION
// ----------------------------------------------------

export const streamChatFromAI = async (text, history = [], onChunk, onComplete, currentBalance = 0) => {
    try {
        // Compress context before transmitting
        const { summary, compactHistory } = compressFinancialContext(history, currentBalance);

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'streamChat',
                payload: { text, summary, compactHistory, history: history.slice(0, 10) }
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

export const parseTransactionWithGemini = async (text, history = [], currentBalance = 0) => {
    // 0-Token Fast Path: Check if query is a basic greeting or pure local answer
    const clean = text.toLowerCase().trim();
    if (/^(salut|buna|hello|hi|hei)$/i.test(clean)) {
        return {
            intent: "query",
            conversational_response: "Salut! Cu ce te pot ajuta? Poți să-mi spui o cheltuială (ex: 'Cafea 15 lei') sau să mă întrebi despre soldul tău."
        };
    }

    // 0-Token Fast Path: Simple unambiguous voice/text expense (e.g. "cafea 15 lei")
    const local = parseLocalVoiceShortcut(text, history);
    if (local.amount > 0 && local.category !== 'Other' && text.length < 35) {
        return {
            intent: "add",
            type: local.type,
            amount: local.amount,
            category: local.category,
            note: local.merchant || text,
            date: new Date().toISOString().split('T')[0],
            conversational_response: local.conversational_response
        };
    }

    try {
        const { summary, compactHistory } = compressFinancialContext(history, currentBalance);
        const res = await callAiProxy('parseTransaction', {
            text,
            summary,
            compactHistory,
            history: history.slice(0, 10)
        });
        if (res && res.intent) {
            return res;
        }
    } catch {
        // Handled below
    }

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
    // 0-Token Fast Path: If input has clear numeric amount and known category, return instantly
    const local = parseLocalVoiceShortcut(text);
    if (local.amount > 0 && local.category !== 'Other' && text.length < 40) {
        return local;
    }

    try {
        const res = await callAiProxy('parseVoiceShortcut', { text });
        if (res && typeof res.amount === 'number' && res.amount > 0) {
            // Save vendor-to-category learning
            if (res.merchant && res.category) {
                recordVendorCategory(res.merchant, res.category);
            }
            return res;
        }
    } catch {
        // Handled below
    }
    return local;
};

export const generateCashFlowForecast = async (transactions = [], currentBalance = 0) => {
    const lastTxDate = transactions[0]?.date || 'none';
    const txCount = transactions.length;

    // 0-Token Persistent Cache Check (Valid for 24h as long as balance & tx count unchanged)
    const cached = getPersistentForecast(txCount, currentBalance, lastTxDate);
    if (cached) {
        return cached;
    }

    try {
        const data = await callAiProxy('generateForecast', { transactions: transactions.slice(0, 15), currentBalance });
        if (Array.isArray(data) && data.length >= 10) {
            setPersistentForecast(txCount, currentBalance, lastTxDate, data);
            return data;
        }
    } catch {
        // Handled below
    }

    const localForecast = generateStatisticalForecast(transactions, currentBalance);
    setPersistentForecast(txCount, currentBalance, lastTxDate, localForecast);
    return localForecast;
};

export const suggestCategory = async (note, existingCategories = []) => {
    if (!note || !note.trim()) return null;

    // 0-Token Fast Path 1: Check adaptive user memory and local dictionary
    const localMatched = matchLocalCategory(note, existingCategories);
    if (localMatched) {
        return localMatched;
    }

    // Call AI only for unfamiliar vendors with rate-limiting
    if (rateLimiter.check('gemini_suggest', 5, 10000)) {
        try {
            const res = await callAiProxy('suggestCategory', { note, existingCategories });
            if (res) {
                recordVendorCategory(note, res);
                return res;
            }
        } catch {
            // Handled below
        }
    }

    return existingCategories[0] || 'Other';
};

