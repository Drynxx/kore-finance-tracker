const key = process.env.VITE_GEMINI_API_KEY || "AIzaSyBrJT7Zn7EpJb0QdiptPoyIxheIpnQfx4U";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

console.log("Listing models from:", url.replace(key, "HIDDEN_KEY"));

async function list() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

list();
