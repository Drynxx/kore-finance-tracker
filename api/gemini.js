import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// Robust JSON extraction from LLM response text
const extractAndParseJson = (text) => {
    try {
        if (!text || typeof text !== 'string') {
            throw new Error("Empty response from AI");
        }

        const arrayStart = text.indexOf('[');
        const arrayEnd = text.lastIndexOf(']');

        if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
            const jsonStr = text.substring(arrayStart, arrayEnd + 1);
            return JSON.parse(jsonStr);
        }

        const objectStart = text.indexOf('{');
        const objectEnd = text.lastIndexOf('}');

        if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
            const jsonStr = text.substring(objectStart, objectEnd + 1);
            return JSON.parse(jsonStr);
        }

        const cleanStr = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanStr);
    } catch (error) {
        console.error("JSON Extraction Failed on output:", text, error);
        throw new Error("Failed to extract valid JSON from AI response");
    }
};

// ----------------------------------------------------
// LOCAL DETERMINISTIC NLP & STATISTICAL ENGINES
// (Executed only if both Gemini and OpenRouter fail)
// ----------------------------------------------------

const fallbackParseTransaction = (text = '', history = []) => {
    const clean = text.toLowerCase().trim();

    // Number extraction (supports Romanian comma decimal like 12,50 or 12.50 or plain 15)
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

    const isIncome = /(salariu|salary|venit|avans|bonus|incasat|primit bani|transfer primit|diurna|income)/i.test(clean);
    const type = isIncome ? 'income' : 'expense';
    const paymentMethod = /(card|pos|apple pay|google pay|online|revolut)/i.test(clean) ? 'Card' : 'Cash';

    // Note extraction
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

const fallbackGenerateForecast = (transactions = [], currentBalance = 0) => {
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

    const forecast = [];
    let runningBalance = currentBalance;

    for (let i = 1; i <= 30; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dateStr = targetDate.toISOString().split('T')[0];

        const dayDelta = (dailyIncomeRate - dailyBurnRate);
        runningBalance += dayDelta;

        forecast.push({
            date: dateStr,
            balance: Math.round(runningBalance * 100) / 100,
            reason: i % 7 === 0 ? 'Weekly Trend' : 'Estimated Spending'
        });
    }

    return forecast;
};

// ----------------------------------------------------
// TIER 1: GOOGLE GEMINI EXECUTION (PRIMARY PRIORITY)
// ----------------------------------------------------
const GEMINI_MODELS = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

async function callGemini(apiKey, prompt, systemInstruction = null, isJson = true) {
    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError = null;

    for (const modelName of GEMINI_MODELS) {
        try {
            const config = { model: modelName };
            if (isJson) {
                config.generationConfig = { responseMimeType: "application/json" };
            }
            if (systemInstruction) {
                config.systemInstruction = systemInstruction;
            }

            const model = genAI.getGenerativeModel(config);
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (err) {
            lastError = err;
            console.warn(`[Gemini Primary] Model ${modelName} error:`, err.message);

            // If rate limited, quota exhausted, or invalid key, immediately proceed to OpenRouter fallback
            if (
                err.status === 429 ||
                err.message?.includes('429') ||
                err.message?.includes('quota') ||
                err.message?.includes('exhausted') ||
                err.message?.includes('API key not valid') ||
                err.message?.includes('API_KEY_INVALID')
            ) {
                break;
            }
        }
    }
    throw lastError || new Error("Gemini execution failed");
}

// ----------------------------------------------------
// TIER 2: OPENROUTER EXECUTION (FALLBACK)
// ----------------------------------------------------
const PRIMARY_OPENROUTER_MODEL = "openrouter/free";
const FALLBACK_OPENROUTER_MODELS = [
    "google/gemma-4-31b-it:free",
    "liquid/lfm-2.5-2.6b:free"
];

async function callOpenRouter(apiKey, messages) {
    const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
        defaultHeaders: {
            "HTTP-Referer": "https://kore-finance.vercel.app",
            "X-Title": "Kore Finance Tracker"
        }
    });

    const completion = await client.chat.completions.create({
        model: PRIMARY_OPENROUTER_MODEL,
        messages: messages,
        temperature: 0.1,
        extra_body: {
            models: FALLBACK_OPENROUTER_MODELS
        }
    });

    return completion.choices[0]?.message?.content || "";
}

// ----------------------------------------------------
// MAIN ROUTER HANDLER
// ----------------------------------------------------

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { action, payload } = req.body || {};

    if (!action) {
        return res.status(400).json({ error: 'Missing action parameter.' });
    }

    const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();
    const openrouterApiKey = (process.env.OPENROUTER_API_KEY || "").trim();

    // 1. STREAMING CHAT
    if (action === 'streamChat') {
        const { text, history = [] } = payload || {};
        if (!text) {
            return res.status(400).json({ error: 'Missing text in payload.' });
        }

        const recentHistory = history.slice(0, 30).map(t => ({
            date: t.date,
            amount: t.amount,
            category: t.category,
            note: t.note,
            type: t.type
        }));

        const systemPrompt = `You are Kore AI, an ultra-fast, intelligent personal finance assistant.
Today's Date: ${new Date().toISOString().split('T')[0]}
User's Recent Financial Activity: ${JSON.stringify(recentHistory)}

Rules:
1. Detect user's language (Romanian or English) and reply concisely in the same language.
2. Be helpful, direct, and conversational. Give clear monetary calculations if asked.
3. Keep responses under 2-3 short paragraphs for fast delivery.`;

        // Set SSE Streaming Headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        let streamedSuccessfully = false;

        // Priority 1: Gemini Streaming
        if (geminiApiKey) {
            try {
                const genAI = new GoogleGenerativeAI(geminiApiKey);
                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash",
                    systemInstruction: systemPrompt
                });

                const result = await model.generateContentStream(text);
                for await (const chunk of result.stream) {
                    const token = chunk.text();
                    if (token) {
                        res.write(`data: ${JSON.stringify({ token })}\n\n`);
                        streamedSuccessfully = true;
                    }
                }
            } catch (geminiErr) {
                console.warn("[Gemini Primary] streamChat error, falling back to OpenRouter:", geminiErr.message);
            }
        }

        // Priority 2: OpenRouter Streaming (Fallback)
        if (!streamedSuccessfully && openrouterApiKey) {
            try {
                const client = new OpenAI({
                    baseURL: "https://openrouter.ai/api/v1",
                    apiKey: openrouterApiKey,
                    defaultHeaders: {
                        "HTTP-Referer": "https://kore-finance.vercel.app",
                        "X-Title": "Kore Finance Tracker"
                    }
                });

                const stream = await client.chat.completions.create({
                    model: PRIMARY_OPENROUTER_MODEL,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: text }
                    ],
                    temperature: 0.3,
                    stream: true,
                    extra_body: {
                        models: FALLBACK_OPENROUTER_MODELS
                    }
                });

                for await (const chunk of stream) {
                    const token = chunk.choices[0]?.delta?.content || "";
                    if (token) {
                        res.write(`data: ${JSON.stringify({ token })}\n\n`);
                        streamedSuccessfully = true;
                    }
                }
            } catch (openrouterErr) {
                console.warn("[OpenRouter Fallback] streamChat error, falling back to local:", openrouterErr.message);
            }
        }

        // Priority 3: Local Deterministic Response (Safeguard)
        if (!streamedSuccessfully) {
            const local = fallbackParseTransaction(text, history);
            const localMsg = local.conversational_response || "Tranzacțiile tale sunt sincronizate și în siguranță.";
            res.write(`data: ${JSON.stringify({ token: localMsg })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        return res.end();
    }

    // 2. QUICK VOICE SHORTCUT
    if (action === 'parseVoiceShortcut') {
        const { text } = payload || {};
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Missing text in payload.' });
        }

        const prompt = `Extract transaction details into strict JSON:
Current Date: ${new Date().toISOString().split('T')[0]}
User Input: "${text}"

Schema:
{
  "amount": number,
  "currency": string,
  "category": "Food" | "Rent" | "Salary" | "Freelance" | "Transport" | "Entertainment" | "Shopping" | "Utilities" | "Other",
  "paymentMethod": "Cash" | "Card",
  "type": "expense" | "income",
  "merchant": string
}

Rules:
1. amount: strictly positive number (e.g. 15 or 45.5).
2. currency: "RON" (default), "EUR", "USD", "GBP". Map "lei"/"leu" -> "RON".
3. category: select best fit from schema.
4. paymentMethod: "Card" if digital/taxi/delivery/card mentioned; default "Cash".
5. type: "income" for salary/received money; default "expense".
6. merchant: clean store/vendor name or "".
7. Output pure raw JSON only.`;

        // Priority 1: Gemini
        if (geminiApiKey) {
            try {
                const rawText = await callGemini(geminiApiKey, prompt, "You are a fast JSON financial extraction engine. Output only valid JSON.", true);
                const parsed = extractAndParseJson(rawText);
                return res.status(200).json({ result: parsed, provider: 'gemini' });
            } catch (err) {
                console.warn("[Gemini Primary] parseVoiceShortcut error, cascading to OpenRouter:", err.message);
            }
        }

        // Priority 2: OpenRouter
        if (openrouterApiKey) {
            try {
                const rawText = await callOpenRouter(openrouterApiKey, [
                    { role: "system", content: "You are a fast JSON financial extraction engine. Output only valid JSON." },
                    { role: "user", content: prompt }
                ]);
                const parsed = extractAndParseJson(rawText);
                return res.status(200).json({ result: parsed, provider: 'openrouter' });
            } catch (err) {
                console.warn("[OpenRouter Fallback] parseVoiceShortcut error, cascading to local:", err.message);
            }
        }

        // Priority 3: Local Engine
        const localData = fallbackParseTransaction(text);
        return res.status(200).json({ result: localData, provider: 'local', fallback: true });
    }

    // 3. PARSE TRANSACTION & INTENT DETECTION
    if (action === 'parseTransaction') {
        const { text, history = [] } = payload || {};
        if (!text) {
            return res.status(400).json({ error: 'Missing text in payload.' });
        }

        const recentHistory = history.slice(0, 40).map(t => ({
            date: t.date,
            amount: t.amount,
            category: t.category,
            note: t.note,
            type: t.type
        }));

        const prompt = `
Current Date: ${new Date().toISOString().split('T')[0]}
Transaction History: ${JSON.stringify(recentHistory)}
User Input: "${text}"

Analyze User Input and determine INTENT.
If input is in Romanian, "conversational_response" MUST be in Romanian.
If input is in English, "conversational_response" MUST be in English.

---
INTENT 1: ADD_TRANSACTION
Trigger: User logs expense/income (e.g. "Spent 50 on pizza", "Am cheltuit 50 lei pe pizza", "Cafea 15 lei").
Output JSON:
{
    "intent": "add",
    "type": "expense" | "income",
    "amount": number,
    "category": "Food" | "Rent" | "Salary" | "Transport" | "Shopping" | "Utilities" | "Entertainment" | "Other",
    "note": "short description",
    "date": "YYYY-MM-DD",
    "conversational_response": "Am adăugat 50 lei pentru pizza."
}

---
INTENT 2: QUERY
Trigger: User asks about their finances or greets.
Output JSON:
{
    "intent": "query",
    "conversational_response": "Answer based on history."
}

---
INTENT 3: FORECAST
Trigger: User asks about future spending prediction.
Output JSON:
{
    "intent": "forecast",
    "conversational_response": "Prediction based on history."
}

Rules: Output pure valid JSON only.
`;

        // Priority 1: Gemini
        if (geminiApiKey) {
            try {
                const rawText = await callGemini(geminiApiKey, prompt, "You are a financial AI assistant. Output strictly valid JSON.", true);
                const parsed = extractAndParseJson(rawText);
                return res.status(200).json({ result: parsed, provider: 'gemini' });
            } catch (err) {
                console.warn("[Gemini Primary] parseTransaction error, cascading to OpenRouter:", err.message);
            }
        }

        // Priority 2: OpenRouter
        if (openrouterApiKey) {
            try {
                const rawText = await callOpenRouter(openrouterApiKey, [
                    { role: "system", content: "You are a financial AI assistant. Output strictly valid JSON." },
                    { role: "user", content: prompt }
                ]);
                const parsed = extractAndParseJson(rawText);
                return res.status(200).json({ result: parsed, provider: 'openrouter' });
            } catch (err) {
                console.warn("[OpenRouter Fallback] parseTransaction error, cascading to local:", err.message);
            }
        }

        // Priority 3: Local Engine
        const local = fallbackParseTransaction(text, history);
        const isAdd = local.amount > 0;
        return res.status(200).json({
            result: {
                intent: isAdd ? "add" : "query",
                type: local.type,
                amount: local.amount,
                category: local.category,
                note: local.merchant || text,
                date: new Date().toISOString().split('T')[0],
                conversational_response: local.conversational_response
            },
            provider: 'local',
            fallback: true
        });
    }

    // 4. GENERATE FORECAST
    if (action === 'generateForecast') {
        const { transactions = [], currentBalance = 0 } = payload || {};

        const today = new Date();
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);

        const history = transactions
            .filter(t => new Date(t.date) >= ninetyDaysAgo)
            .map(t => ({
                date: t.date,
                amount: t.amount,
                category: t.category,
                note: t.note
            }));

        const prompt = `
Current Date: ${today.toISOString().split('T')[0]}
Current Balance: ${currentBalance}
Recent History: ${JSON.stringify(history.slice(-30))}

Forecast daily balance for NEXT 30 DAYS based on recurring bills and average spending.
Return STRICT JSON array:
[
    { "date": "YYYY-MM-DD", "balance": number, "reason": "Salary" | "Rent" | "Estimated Spending" | null }
]
`;

        // Priority 1: Gemini
        if (geminiApiKey) {
            try {
                const rawText = await callGemini(geminiApiKey, prompt, "You are a cash flow forecasting assistant. Output only a strict JSON array.", true);
                const data = extractAndParseJson(rawText);
                if (Array.isArray(data) && data.length >= 10) {
                    return res.status(200).json({ result: data, provider: 'gemini' });
                }
            } catch (err) {
                console.warn("[Gemini Primary] generateForecast error, cascading to OpenRouter:", err.message);
            }
        }

        // Priority 2: OpenRouter
        if (openrouterApiKey) {
            try {
                const rawText = await callOpenRouter(openrouterApiKey, [
                    { role: "system", content: "You are a cash flow forecasting assistant. Output only a strict JSON array." },
                    { role: "user", content: prompt }
                ]);
                const data = extractAndParseJson(rawText);
                if (Array.isArray(data) && data.length >= 10) {
                    return res.status(200).json({ result: data, provider: 'openrouter' });
                }
            } catch (err) {
                console.warn("[OpenRouter Fallback] generateForecast error, cascading to local:", err.message);
            }
        }

        // Priority 3: Local Statistical Forecast
        const localForecast = fallbackGenerateForecast(transactions, currentBalance);
        return res.status(200).json({ result: localForecast, provider: 'local', fallback: true });
    }

    // 5. SUGGEST CATEGORY
    if (action === 'suggestCategory') {
        const { note = '', existingCategories = [] } = payload || {};

        if (!note.trim()) {
            return res.status(200).json({ result: null });
        }

        const prompt = `
Map transaction note "${note}" to one of these categories: ${JSON.stringify(existingCategories)}.
If none match, return a clean 1-word English category.
Output JSON: { "category": "CategoryName" }
`;

        // Priority 1: Gemini
        if (geminiApiKey) {
            try {
                const rawText = await callGemini(geminiApiKey, prompt, "You are a category matching assistant. Output only valid JSON.", true);
                const data = extractAndParseJson(rawText);
                return res.status(200).json({ result: data?.category || null, provider: 'gemini' });
            } catch (err) {
                console.warn("[Gemini Primary] suggestCategory error, cascading to OpenRouter:", err.message);
            }
        }

        // Priority 2: OpenRouter
        if (openrouterApiKey) {
            try {
                const rawText = await callOpenRouter(openrouterApiKey, [
                    { role: "system", content: "You are a category matching assistant. Output only valid JSON." },
                    { role: "user", content: prompt }
                ]);
                const data = extractAndParseJson(rawText);
                return res.status(200).json({ result: data?.category || null, provider: 'openrouter' });
            } catch (err) {
                console.warn("[OpenRouter Fallback] suggestCategory error, cascading to local:", err.message);
            }
        }

        // Priority 3: Local Matching
        const local = fallbackParseTransaction(note);
        return res.status(200).json({ result: local.category, provider: 'local', fallback: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
}
