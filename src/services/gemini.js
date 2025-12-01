import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
console.log("Gemini Service Loaded. Key present:", !!API_KEY);

let genAI = null;
let model = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
} else {
    console.error("Gemini API Key is missing! Make sure VITE_GEMINI_API_KEY is set in .env");
}

export const parseTransactionWithGemini = async (text, history = []) => {
    if (!model) {
        throw new Error("Gemini API is not configured. Please check your settings.");
    }

    // Limit history to 20 items to reduce token count significantly
    const recentHistory = history.slice(0, 20).map(t => ({
        d: t.date,
        a: t.amount,
        c: t.category,
        n: t.note,
        t: t.type
    }));

    const prompt = `
    Date:${new Date().toISOString().split('T')[0]}
    Hist:${JSON.stringify(recentHistory)}
    In:"${text}"

    Role:Financial Assistant. Analyze "In" & determine INTENT.

    INTENT:ADD
    Trig:Expense/Income log.
    Out JSON:
    {
        "intent": "add",
        "type": "expense"|"income",
        "amount": number,
        "category": "Food"|"Rent"|"Salary"|"Transport"|"Shopping"|"Utilities"|"Entertainment"|"Other",
        "note": "desc",
        "date": "YYYY-MM-DD",
        "conversational_response": "Added..."
    }

    INTENT:QUERY
    Trig:Finances question.
    Action:Analyze "Hist".
    Out JSON:
    {
        "intent": "query",
        "conversational_response": "Answer..."
    }

    Rules:
    1.QUERY:Concise.
    2.ADD:Default "expense".
    3.JSON ONLY.
    `;

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const response = await result.response;
        const text = response.text();

        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Error:", error);
        throw new Error(`AI Error: ${error.message || "Unknown error"}`);
    }
};
