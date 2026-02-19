import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // CORS Support
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server misconfiguration: Missing Gemini API Key' });
    }

    const { action, payload } = req.body;

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt = "";

        if (action === 'suggest_category') {
            const { note, existingCategories } = payload;
            prompt = `
                You are a categorization assistant. 
                Analyze the transaction note: "${note}".
                Map it to one of these existing categories: ${JSON.stringify(existingCategories)}.
                
                Rules:
                1. If it clearly fits an existing category, return that category.
                2. If it does not fit, suggest a NEW, short, generic category name (One word, Capitalized, English).
                3. Be smart about cultural context (e.g., "Mega Image" is Food/Groceries).
                4. Output STRICT JSON: { "category": "CategoryName" }
            `;
        } else if (action === 'forecast') {
            const { currentBalance, history } = payload;
            const today = new Date().toISOString().split('T')[0];

            prompt = `
                Current Date: ${today}
                Current Balance: ${currentBalance}
                Transaction History (Last 90 Days): ${JSON.stringify(history)}

                GOAL: Forecast the daily balance for the NEXT 30 DAYS.
                INSTRUCTIONS:
                1. Analyze the history to identify RECURRING bills/income.
                2. Estimate average daily VARIABLE spending.
                3. Generate a daily forecast starting from tomorrow.
                4. Output STRICT JSON Array: [{ "date": "YYYY-MM-DD", "balance": number, "reason": "string" }]
            `;
        } else if (action === 'parse') {
            // ... Logic for parsing natural language transaction ...
            // For brevity, assuming similar structure to original service
            const { text, history } = payload;

            // Prepare history context (limit to last 50 transactions to save tokens/latency)
            const recentHistory = history.slice(0, 50).map(t => ({
                date: t.date,
                amount: t.amount,
                category: t.category,
                note: t.note,
                type: t.type
            }));

            prompt = `
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
                4. Output STRICTLY valid JSON.
            `;
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const response = await result.response;
        const text = response.text();

        // Clean markdown
        const cleanJson = (str) => str.replace(/```json\n?|\n?```/g, '').trim();
        const data = JSON.parse(cleanJson(text));

        return res.status(200).json(data);

    } catch (error) {
        console.error("Gemini Server Error:", error);
        return res.status(500).json({ error: 'Failed to process AI request' });
    }
}
