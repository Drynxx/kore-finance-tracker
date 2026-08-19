import OpenAI from 'openai';

// Helper to robustly extract and parse JSON from AI text
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

// Ultra-fast lightweight models (< 1-2s response time)
const FAST_MODEL = "google/gemma-4-26b-a4b-it:free";
const FAST_FALLBACKS = [
    "google/gemma-4-31b-it:free",
    "openai/gpt-oss-20b:free",
    "openrouter/free"
];

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: OPENROUTER_API_KEY is not set in server environment.' });
    }

    const { action, payload } = req.body || {};

    if (!action) {
        return res.status(400).json({ error: 'Missing action parameter.' });
    }

    try {
        const client = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: apiKey,
            defaultHeaders: {
                "HTTP-Referer": "https://kore-finance.vercel.app",
                "X-Title": "Kore Finance Tracker"
            }
        });

        // 1. STREAMING CHAT (Instant word-by-word streaming for chat interface)
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

            const stream = await client.chat.completions.create({
                model: FAST_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0.3,
                stream: true,
                extra_body: {
                    models: FAST_FALLBACKS
                }
            });

            for await (const chunk of stream) {
                const token = chunk.choices[0]?.delta?.content || "";
                if (token) {
                    res.write(`data: ${JSON.stringify({ token })}\n\n`);
                }
            }

            res.write('data: [DONE]\n\n');
            return res.end();
        }

        // 2. QUICK VOICE SHORTCUT (Blazing-fast JSON extraction)
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

            const completion = await client.chat.completions.create({
                model: FAST_MODEL,
                messages: [
                    { role: "system", content: "You are a fast JSON financial extraction engine. Output only valid JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
                extra_body: {
                    models: FAST_FALLBACKS
                }
            });

            const rawContent = completion.choices[0]?.message?.content || "";
            const parsedData = extractAndParseJson(rawContent);

            return res.status(200).json({ result: parsedData });
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
            Trigger: User logs expense/income (e.g. "Spent 50 on pizza", "Am cheltuit 50 lei pe pizza").
            Output JSON:
            {
                "intent": "add",
                "type": "expense" | "income",
                "amount": number,
                "category": "Food" | "Rent" | "Salary" | "Transport" | "Shopping" | "Utilities" | "Entertainment" | "Other",
                "note": "short description",
                "date": "YYYY-MM-DD",
                "conversational_response": "Added 50 lei for pizza."
            }

            ---
            INTENT 2: QUERY
            Trigger: User asks about their finances.
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

            const completion = await client.chat.completions.create({
                model: FAST_MODEL,
                messages: [
                    { role: "system", content: "You are a financial AI assistant. Output strictly valid JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
                extra_body: {
                    models: FAST_FALLBACKS
                }
            });

            const rawContent = completion.choices[0]?.message?.content || "";
            const parsedData = extractAndParseJson(rawContent);

            return res.status(200).json({ result: parsedData });
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

            const completion = await client.chat.completions.create({
                model: FAST_MODEL,
                messages: [
                    { role: "system", content: "You are a cash flow forecasting assistant. Output only a strict JSON array." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
                extra_body: {
                    models: FAST_FALLBACKS
                }
            });

            const rawContent = completion.choices[0]?.message?.content || "[]";
            const data = extractAndParseJson(rawContent);

            return res.status(200).json({ result: Array.isArray(data) ? data : [] });
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

            const completion = await client.chat.completions.create({
                model: FAST_MODEL,
                messages: [
                    { role: "system", content: "You are a category matching assistant. Output only valid JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
                extra_body: {
                    models: FAST_FALLBACKS
                }
            });

            const rawContent = completion.choices[0]?.message?.content || "{}";
            const data = extractAndParseJson(rawContent);

            return res.status(200).json({ result: data?.category || null });
        }

        return res.status(400).json({ error: `Unknown action: ${action}` });

    } catch (error) {
        console.error(`AI Server Function Error (${action}):`, error);
        return res.status(500).json({ error: error.message || 'Internal AI Error' });
    }
}
