import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI = null;
let model = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
} else {
    console.error("Gemini API Key is missing! Make sure VITE_GEMINI_API_KEY is set in .env");
}

export const parseTransactionWithGemini = async (text, currencySymbol = '$') => {
    if (!model) {
        throw new Error("Gemini API is not configured. Please check your settings.");
    }

    const prompt = `
    Extract transaction details from: "${text}".
    
    Rules:
    1. **Amount**: Find the number representing the cost or income. Ignore currency symbols like "lei", "RON", "$", "€". If multiple numbers, pick the one that looks like a price.
    2. **Type**: "expense" (spending) or "income" (earning). Default to "expense".
    3. **Category**: Choose best match from: ["Food", "Rent", "Salary", "Freelance", "Transport", "Entertainment", "Shopping", "Utilities", "Other"].
    4. **Note**: A short description of what it was for.
    5. **Date**: YYYY-MM-DD (default to today: ${new Date().toISOString().split('T')[0]}).

    Output strictly valid JSON.
    
    Examples:
    "50 lei pizza" -> {"type": "expense", "amount": 50, "category": "Food", "note": "pizza", "date": "${new Date().toISOString().split('T')[0]}"}
    "Am cheltuit 100 pe benzina" -> {"type": "expense", "amount": 100, "category": "Transport", "note": "benzina", "date": "${new Date().toISOString().split('T')[0]}"}
    "Salariu 5000" -> {"type": "income", "amount": 5000, "category": "Salary", "note": "Salariu", "date": "${new Date().toISOString().split('T')[0]}"}
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
        // Pass the actual error message to the user for better debugging
        throw new Error(`AI Error: ${error.message || "Unknown error"}`);
    }
};
