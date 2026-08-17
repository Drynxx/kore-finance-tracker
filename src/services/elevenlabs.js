import { rateLimiter } from '../utils/rateLimiter';

export const speakWithElevenLabs = async (text) => {
    try {
        // Rate Limit: 3 requests per 60 seconds
        if (!rateLimiter.check('elevenlabs_tts', 3, 60000)) {
            throw new Error("Rate limit exceeded. Falling back to browser TTS.");
        }

        const response = await fetch('/api/elevenlabs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TTS API error: ${response.status} - ${errorBody}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();

        return audio;

    } catch (error) {
        console.error("ElevenLabs TTS Failed:", error);
    }
};
