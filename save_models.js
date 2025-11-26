import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const key = process.env.VITE_GEMINI_API_KEY || "AIzaSyBrJT7Zn7EpJb0QdiptPoyIxheIpnQfx4U";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

async function list() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            const names = data.models.map(m => m.name).join('\n');
            fs.writeFileSync('models.txt', names);
            console.log("Saved models to models.txt");
        } else {
            console.log("ERROR:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

list();
