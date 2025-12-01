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

    // Limit history to 15 items and minimize keys for maximum mobile speed
    const recentHistory = history.slice(0, 15).map(t => ({
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

    Role:Financial Assistant. Lang:Romanian.

    INTENT:ADD
    Trig:Expense/Income log (e.g. "Am cheltuit 50 lei pe pizza").
    Out JSON:
    {
        "intent": "add",
        "type": "expense"|"income",
        "amount": number,
        "category": "Food"|"Rent"|"Salary"|"Transport"|"Shopping"|"Utilities"|"Entertainment"|"Other",
        "note": "desc (in RO)",
        "date": "YYYY-MM-DD",
        "conversational_response": "Adăugat 50 lei pentru pizza."
    }

    INTENT:QUERY
    Trig:Finances question (e.g. "Cât am cheltuit pe mâncare?").
    Action:Analyze "Hist".
    Out JSON:
    {
        "intent": "query",
        "conversational_response": "Ai cheltuit 450 lei pe Mâncare luna asta."
    }

    Rules:
    1.Response MUST be in Romanian.
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
