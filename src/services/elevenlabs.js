import { rateLimiter } from '../utils/rateLimiter';

const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel (Standard Voice)



export const speakWithElevenLabs = async (text) => {
    try {
        // Rate Limit: 3 requests per 60 seconds (Standard Tier is expensive)
        if (!rateLimiter.check('elevenlabs_tts', 3, 60000)) {
            throw new Error("Rate limit exceeded. Falling back to browser TTS.");
        }
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'xi-api-key': API_KEY,
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
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorBody}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();

        return audio; // Return audio instance in case we need to stop it later

    } catch (error) {
        console.error("ElevenLabs TTS Failed:", error);
        // alert(`ElevenLabs Error: ${error.message}`); // Disabled for production
        // Fallback to browser TTS if ElevenLabs fails
        // console.warn("ElevenLabs Failed, but fallback is disabled per user request.");
    }
};
