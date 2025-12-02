import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
console.log("Gemini Service Loaded. Key present:", !!API_KEY);

let genAI = null;
let model = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
} else {
    console.error("Gemini API Key is missing! Make sure VITE_GEMINI_API_KEY is set in .env");
}

export const parseTransactionWithGemini = async (text, history = []) => {
    if (!model) {
        throw new Error("Gemini API is not configured. Please check your settings.");
    }

    // Prepare history context (limit to last 50 transactions to save tokens/latency)
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
    Rules:
    1. Detect the language of the "User Input".
    2. Respond in the SAME language as the input.
    3. For ADD, default to "expense" if unclear.
    4. Output STRICTLY valid JSON.
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
