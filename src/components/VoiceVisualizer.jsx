import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const VoiceVisualizer = ({ isListening = false, mode = 'overlay' }) => {

    // MacOS / Apple Intelligence Style:
    // A fluid, multi-colored gradient border/glow that morphs organically.

    if (mode === 'overlay') {
        // Subtle header version
        return (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <motion.div
                    animate={{
                        background: [
                            "linear-gradient(90deg, #4f46e5, #0ea5e9)",
                            "linear-gradient(90deg, #db2777, #7c3aed)",
                            "linear-gradient(90deg, #4f46e5, #0ea5e9)"
                        ]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-0 w-full h-[2px] opacity-70"
                />
                {isListening && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute w-full h-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 blur-xl"
                    />
                )}
            </div>
        );
    }

    // Full Premium Mode (Siri / Apple Intelligence Style)
    // We use a blob morphing effect with deep, rich colors.
    return (
        <div className="relative w-full h-full flex items-center justify-center">

            {/* The Glowing Aura */}
            <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">

                {/* 1. Deep Core Glow */}
                <motion.div
                    animate={{
                        scale: isListening ? [0.9, 1.1, 0.95, 1.05, 0.9] : 0.9,
                        opacity: isListening ? 0.8 : 0.4
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-indigo-600 blur-[80px] mix-blend-screen"
                />

                {/* 2. Fluid Morphing Blobs (The "Apple Intelligence" look) */}
                {/* Cyan Blob */}
                <motion.div
                    animate={{
                        x: isListening ? [0, 30, -20, 0] : 0,
                        y: isListening ? [0, -40, 20, 0] : 0,
                        scale: isListening ? [1, 1.2, 0.9, 1] : 1,
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-48 h-48 bg-cyan-500 rounded-full blur-[60px] mix-blend-screen opacity-70 top-0 left-0"
                />

                {/* Magenta/Pink Blob */}
                <motion.div
                    animate={{
                        x: isListening ? [0, -30, 40, 0] : 0,
                        y: isListening ? [0, 20, -30, 0] : 0,
                        scale: isListening ? [1, 1.3, 0.8, 1] : 1,
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute w-48 h-48 bg-fuchsia-500 rounded-full blur-[60px] mix-blend-screen opacity-70 bottom-0 right-0"
                />

                {/* Violet Blob */}
                <motion.div
                    animate={{
                        scale: isListening ? [1, 1.4, 0.8, 1] : 1,
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute w-40 h-40 bg-violet-600 rounded-full blur-[50px] mix-blend-screen opacity-80"
                />

                {/* 3. White Core Pulse (Voice Activity) */}
                {isListening && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.2, 0.6, 0.2] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute w-32 h-32 bg-white rounded-full blur-[50px] mix-blend-overlay z-10"
                    />
                )}
            </div>

            {/* Glass Container (Optional, adds to the premium feel) */}
            {/* <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] rounded-full z-20 pointer-events-none" /> */}
        </div>
    );
};

export { VoiceVisualizer };
