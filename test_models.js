import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
    console.log("Testing Key:", API_KEY ? "Present" : "Missing");

    // Try to list models directly if possible, otherwise test common ones
    // The SDK doesn't expose listModels on the main class easily, so we test.
    const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro", "gemini-1.5-pro-latest"];

    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("Hi");
            console.log(`SUCCESS: ${m}`);
        } catch (e) {
            console.log(`FAIL: ${m} - ${e.message.split(' ')[0]} ${e.message.split(' ')[1]}`);
        }
    }
}

listModels();
