const key = process.env.VITE_GEMINI_API_KEY || "AIzaSyBrJT7Zn7EpJb0QdiptPoyIxheIpnQfx4U";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

console.log("Fetching from:", url.replace(key, "HIDDEN_KEY"));

async function test() {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

test();
