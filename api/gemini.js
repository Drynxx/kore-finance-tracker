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

const OPENROUTER_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
const OPENROUTER_FALLBACKS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "openai/gpt-oss-120b:free",
    "google/gemma-4-26b-it:free"
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

        if (action === 'parseVoiceShortcut') {
            const { text } = payload || {};
            if (!text || !text.trim()) {
                return res.status(400).json({ error: 'Missing text in payload.' });
            }

            const prompt = `You are a specialized financial transaction extractor for the Kore Finance app.
Given spoken or typed transaction text from an OS voice shortcut, extract structured transaction data.

Current Date: ${new Date().toISOString().split('T')[0]}
User Voice Input: "${text}"

Output a STRICT JSON object matching this schema:
{
  "amount": number,
  "currency": string,
  "category": "Food" | "Rent" | "Salary" | "Freelance" | "Transport" | "Entertainment" | "Shopping" | "Utilities" | "Other",
  "paymentMethod": "Cash" | "Card",
  "type": "expense" | "income",
  "merchant": string
}

Rules & Extraction Guidelines:
1. amount: strictly a positive number (float or integer, e.g. 15 or 42.50). Never negative.
2. currency: currency code (e.g. "RON", "EUR", "USD", "GBP"). Map "lei", "leu", "ron" to "RON". Map "$", "dollar", "bucks" to "USD". Map "€", "euro" to "EUR". Default to "RON" if none detected.
3. category: must be one of ["Food", "Rent", "Salary", "Freelance", "Transport", "Entertainment", "Shopping", "Utilities", "Other"].
   - Food: groceries, restaurants, dining, coffee, snacks, supermarket (Mega Image, Lidl, Kaufland, Carrefour, Glovo, Tazz, Starbucks, etc.)
   - Transport: Uber, Bolt, taxi, fuel/gas, metro, bus, parking, airline, train
   - Shopping: retail, electronics, clothing, Amazon, eMAG, Zara, etc.
   - Entertainment: movies, games, Steam, cinema, concert, bar, pub, club
   - Utilities: electricity, water, internet, phone bill, Enel, Digi, Orange, Vodafone
   - Rent: rent, chirie
   - Salary: wage, salary, salariu, paycheck
   - Freelance: invoice, client payment, project
   - Other: unspecified or other
4. paymentMethod: "Card" if a digital service, online platform, ride-hailing (Uber, Bolt), delivery app (Glovo, Tazz, DoorDash), subscription (Netflix, Spotify, Apple, Google, Amazon), or card payment is mentioned. Default to "Cash" if cash is mentioned or payment method is unspecified.
5. type: "income" for salary, received money, freelance payment, refunds. Default to "expense".
6. merchant: clean brand, vendor, or store name if identified (e.g. "Starbucks", "Uber", "Lidl", "Mega Image"), or empty string "" if none mentioned.
7. Return ONLY the raw JSON object. No Markdown fences or explanations.
`;

            const completion = await client.chat.completions.create({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: "system", content: "You are a financial extraction engine. Always output pure, valid JSON only." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
                extra_body: {
                    models: OPENROUTER_FALLBACKS
                }
            });

            const rawContent = completion.choices[0]?.message?.content || "";
            const parsedData = extractAndParseJson(rawContent);

            return res.status(200).json({ result: parsedData });
        }

        if (action === 'parseTransaction') {
            const { text, history = [] } = payload || {};
            if (!text) {
                return res.status(400).json({ error: 'Missing text in payload.' });
            }

            const recentHistory = history.slice(0, 50).map(t => ({
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

            You are a smart financial assistant. Analyze the User Input and determine the INTENT.
            The user may speak in English or Romanian.
            If the input is in Romanian, the "conversational_response" MUST be in Romanian.
            If the input is in English, the "conversational_response" MUST be in English.

            ---
            INTENT 1: ADD_TRANSACTION
            Trigger: User wants to log an expense or income (e.g., "Spent 50 on pizza", "Salary came in", "Am cheltuit 50 lei pe pizza", "A intrat salariul").
            Output JSON:
            {
                "intent": "add",
                "type": "expense" | "income",
                "amount": number,
                "category": "Food" | "Rent" | "Salary" | "Transport" | "Shopping" | "Utilities" | "Entertainment" | "Other",
                "note": "short description (keep original language)",
                "date": "YYYY-MM-DD",
                "conversational_response": "Added 50 lei for pizza. / Am adăugat 50 lei pentru pizza."
            }

            ---
            INTENT 2: QUERY
            Trigger: User asks a question about their finances (e.g., "How much did I spend on food?", "Cat am cheltuit pe mancare?").
            Action: Analyze the "Transaction History" provided above to answer the question accurately.
            Output JSON:
            {
                "intent": "query",
                "conversational_response": "You spent a total of 450 lei on Food. / Ai cheltuit un total de 450 lei pe Mâncare."
            }

            ---
            INTENT 3: FORECAST
            Trigger: User asks about future spending or prediction (e.g., "How much will I spend next month?", "Cat crezi ca o sa cheltui luna viitoare?", "spending forecast").
            Action: Analyze the "Transaction History" (recurrence, average spending) to Estimate the total for the requested period.
            Output JSON:
            {
                "intent": "forecast",
                "conversational_response": "Based on your spending habits, I predict you will spend around 2500 lei next month. / Bazat pe istoricul tău, preconizez că vei cheltui aproximativ 2500 lei luna viitoare."
            }

            ---
            Rules:
            1. Detect the language of the "User Input".
            2. Respond in the SAME language as the input.
            3. For ADD, default to "expense" if unclear.
            4. Output STRICTLY valid JSON only.
            `;

            const completion = await client.chat.completions.create({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: "system", content: "You are a smart financial assistant. Always respond with pure valid JSON only." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.2,
                extra_body: {
                    models: OPENROUTER_FALLBACKS
                }
            });

            const rawContent = completion.choices[0]?.message?.content || "";
            const parsedData = extractAndParseJson(rawContent);

            return res.status(200).json({ result: parsedData });
        }

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
            Transaction History (Last 90 Days): ${JSON.stringify(history)}

            GOAL: Forecast the daily balance for the NEXT 30 DAYS.

            INSTRUCTIONS:
            1. Analyze the history to identify RECURRING bills/income (e.g., Rent, Salary, Subscriptions) based on amount and day of month.
            2. Estimate average daily VARIABLE spending (Food, Transport, etc.).
            3. Generate a daily forecast starting from tomorrow.
            4. For each day, calculate the projected balance.

            OUTPUT FORMAT:
            Return a STRICT JSON array of objects:
            [
                { "date": "YYYY-MM-DD", "balance": number, "reason": "Salary" | "Rent" | "Estimated Spending" | null }
            ]
            `;

            const completion = await client.chat.completions.create({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: "system", content: "You are a cash flow forecasting assistant. Output only a strict JSON array of objects." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.2,
                extra_body: {
                    models: OPENROUTER_FALLBACKS
                }
            });

            const rawContent = completion.choices[0]?.message?.content || "[]";
            const data = extractAndParseJson(rawContent);

            return res.status(200).json({ result: Array.isArray(data) ? data : [] });
        }

        if (action === 'suggestCategory') {
            const { note = '', existingCategories = [] } = payload || {};

            if (!note.trim()) {
                return res.status(200).json({ result: null });
            }

            const prompt = `
            You are a categorization assistant. 
            Analyze the transaction note: "${note}".
            Map it to one of these existing categories: ${JSON.stringify(existingCategories)}.
            
            Rules:
            1. If it clearly fits an existing category, return that category.
            2. If it does not fit, suggest a NEW, short, generic category name (One word, Capitalized, English).
            3. Be smart about cultural context (e.g., "Mega Image" is Food/Groceries).

            Output STRICT JSON:
            { "category": "CategoryName" }
            `;

            const completion = await client.chat.completions.create({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: "system", content: "You are a category matching assistant. Output only valid JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
                extra_body: {
                    models: OPENROUTER_FALLBACKS
                }
            });

            const rawContent = completion.choices[0]?.message?.content || "{}";
            const data = extractAndParseJson(rawContent);

            return res.status(200).json({ result: data?.category || null });
        }

        return res.status(400).json({ error: `Unknown action: ${action}` });

    } catch (error) {
        console.error(`OpenRouter Server Function Error (${action}):`, error);
        return res.status(500).json({ error: error.message || 'Internal AI Error' });
    }
}
