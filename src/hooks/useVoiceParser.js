import { useState, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseVoiceShortcut } from '../services/gemini';

const SYSTEM_PROMPT = `You are a high-speed, specialized financial transaction extractor for the Kore Finance app.
Given spoken or typed transaction text from an OS voice shortcut, extract structured transaction data.

Today's Date: ${new Date().toISOString().split('T')[0]}

Schema:
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
7. Return ONLY the raw JSON object.
`;

const extractAndParseJson = (text) => {
    try {
        const arrayStart = text.indexOf('[');
        const arrayEnd = text.lastIndexOf(']');
        if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
            return JSON.parse(text.substring(arrayStart, arrayEnd + 1));
        }

        const objectStart = text.indexOf('{');
        const objectEnd = text.lastIndexOf('}');
        if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
            return JSON.parse(text.substring(objectStart, objectEnd + 1));
        }

        const cleanStr = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanStr);
    } catch (error) {
        console.error("JSON Extraction Failed:", error);
        throw new Error("Failed to extract valid JSON from AI response");
    }
};

export const useVoiceParser = () => {
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const parseVoiceInput = useCallback(async (rawText) => {
        if (!rawText || !rawText.trim()) {
            throw new Error("Empty voice or text payload received.");
        }

        setIsParsing(true);
        setError(null);

        try {
            const clientApiKey = import.meta.env.VITE_GEMINI_API_KEY;
            let parsedData;

            // Direct client SDK path if VITE_GEMINI_API_KEY is available (sub-second performance)
            if (clientApiKey) {
                try {
                    const genAI = new GoogleGenerativeAI(clientApiKey);
                    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
                    
                    const prompt = `${SYSTEM_PROMPT}\nUser Voice Input: "${rawText.trim()}"`;
                    const res = await model.generateContent({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.1
                        }
                    });

                    const response = await res.response;
                    parsedData = extractAndParseJson(response.text());
                } catch (directErr) {
                    console.warn("Direct Gemini client call failed, falling back to proxy:", directErr);
                    parsedData = await parseVoiceShortcut(rawText.trim());
                }
            } else {
                // Server proxy path
                parsedData = await parseVoiceShortcut(rawText.trim());
            }

            // Normalization & Validation safeguards
            const normalized = {
                amount: Math.abs(parseFloat(parsedData.amount)) || 0,
                currency: (parsedData.currency || 'RON').toUpperCase(),
                category: parsedData.category || 'Other',
                paymentMethod: parsedData.paymentMethod === 'Card' ? 'Card' : 'Cash',
                type: parsedData.type === 'income' ? 'income' : 'expense',
                merchant: (parsedData.merchant || '').trim()
            };

            if (normalized.amount <= 0) {
                throw new Error("Could not extract a valid transaction amount from input.");
            }

            setResult(normalized);
            setIsParsing(false);
            return normalized;
        } catch (err) {
            const errorMsg = err.message || "Failed to parse voice command with Gemini.";
            console.error("useVoiceParser error:", err);
            setError(errorMsg);
            setIsParsing(false);
            throw err;
        }
    }, []);

    return {
        parseVoiceInput,
        isParsing,
        error,
        result
    };
};
