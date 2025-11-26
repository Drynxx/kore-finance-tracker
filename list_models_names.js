const key = process.env.VITE_GEMINI_API_KEY || "AIzaSyBrJT7Zn7EpJb0QdiptPoyIxheIpnQfx4U";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

async function list() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            console.log("AVAILABLE MODELS:");
            data.models.forEach(m => console.log(m.name));
        } else {
            console.log("ERROR:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

list();
