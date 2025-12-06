import 'dotenv/config';

const apiKey = process.env.VITE_GEMINI_API_KEY;
console.log("Checking Key:", apiKey ? "Present (" + apiKey.slice(0, 5) + "...)" : "MISSING");

async function checkModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("API Request Failed!");
            console.error("Status:", response.status);
            console.error("Error:", JSON.stringify(data, null, 2));
            return;
        }

        console.log("✅ API Connection Successful!");
        console.log("Available Models:");
        if (data.models) {
            data.models.forEach(m => {
                // Filter for generateContent supported models
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(` - ${m.name.replace('models/', '')}`);
                }
            });
        } else {
            console.log("No models returned (very strange).");
        }

    } catch (error) {
        console.error("Network Error:", error);
    }
}

checkModels();
