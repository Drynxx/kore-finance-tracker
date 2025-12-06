import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

const apiKey = process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    console.log("NO_KEY");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function check() {
    const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];

    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("Hi");
            console.log(`MODEL: ${m} - OK`);
        } catch (e) {
            console.log(`MODEL: ${m} - FAILED: ${e.message.split('[')[0]}`);
        }
    }
}
check();
