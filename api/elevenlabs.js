export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY || process.env.VITE_ELEVENLABS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: ELEVENLABS_API_KEY is not set.' });
    }

    const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = req.body || {};

    if (!text) {
        return res.status(400).json({ error: 'Missing text parameter.' });
    }

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            return res.status(response.status).json({ error: `ElevenLabs API error: ${response.status} - ${errorBody}` });
        }

        const audioBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'audio/mpeg');
        return res.send(Buffer.from(audioBuffer));

    } catch (error) {
        console.error("ElevenLabs Proxy Error:", error);
        return res.status(500).json({ error: error.message || 'Internal TTS Error' });
    }
}
