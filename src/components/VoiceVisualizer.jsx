import React from 'react';
import { motion } from 'framer-motion';

const VoiceVisualizer = ({ isListening = false }) => {
    // Helper for random floating animation
    // We use random values for x, y, and scale to create a "cloud" effect
    const floatTransition = (duration) => ({
        duration: isListening ? duration * 0.4 : duration, // Speed up significantly when listening
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
    });

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-visible">
            {/* 
                Container is overflow-visible to let clouds drift slightly out of bounds 
                if the parent allows it, creating a more expansive feel.
            */}

            {/* Blob 1: Cyan Cloud - Moves widely */}
            <motion.div
                animate={{
                    x: ["-20%", "20%", "-10%", "20%"],
                    y: ["-10%", "20%", "-20%", "10%"],
                    scale: [1, 1.2, 0.9, 1.1],
                    opacity: [0.3, 0.5, 0.3, 0.4]
                }}
                transition={floatTransition(10)}
                className="absolute w-[160px] h-[160px] rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 blur-[40px] mix-blend-screen opacity-40"
            />

            {/* Blob 2: Violet Cloud - Moves widely */}
            <motion.div
                animate={{
                    x: ["20%", "-20%", "10%", "-20%"],
                    y: ["10%", "-20%", "10%", "-10%"],
                    scale: [1.1, 0.9, 1.2, 1],
                    opacity: [0.3, 0.4, 0.2, 0.5]
                }}
                transition={floatTransition(12)}
                className="absolute w-[140px] h-[140px] rounded-full bg-gradient-to-l from-purple-500 to-indigo-500 blur-[40px] mix-blend-screen opacity-40"
            />

            {/* Blob 3: Blue/White Core - Stays more central but pulses */}
            <motion.div
                animate={{
                    scale: [0.9, 1.1, 0.9, 1.0],
                    opacity: [0.4, 0.6, 0.4, 0.5]
                }}
                transition={floatTransition(8)}
                className="absolute w-[120px] h-[120px] rounded-full bg-blue-500 blur-[50px] mix-blend-screen opacity-30"
            />

            {/* Listening Pulse Overlay - A subtle white flash */}
            {isListening && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                        opacity: [0, 0.2, 0],
                        scale: [0.8, 1.2, 0.8]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-[200px] h-[200px] bg-white blur-[80px] mix-blend-overlay rounded-full"
                />
            )}
        </div>
    );
};

export { VoiceVisualizer };
