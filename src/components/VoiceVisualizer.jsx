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
                    x: ["-30%", "20%", "-10%", "30%"],
                    y: ["-20%", "30%", "-30%", "10%"],
                    scale: [1, 1.4, 0.9, 1.2],
                    opacity: [0.3, 0.6, 0.3, 0.5]
                }}
                transition={floatTransition(10)}
                className="absolute w-[180px] h-[180px] rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 blur-[50px] mix-blend-screen opacity-40"
            />

            {/* Blob 2: Violet Cloud - Moves widely */}
            <motion.div
                animate={{
                    x: ["30%", "-20%", "20%", "-30%"],
                    y: ["20%", "-30%", "10%", "-20%"],
                    scale: [1.2, 0.9, 1.3, 1],
                    opacity: [0.3, 0.5, 0.2, 0.6]
                }}
                transition={floatTransition(12)}
                className="absolute w-[160px] h-[160px] rounded-full bg-gradient-to-l from-purple-500 to-indigo-500 blur-[50px] mix-blend-screen opacity-40"
            />

            {/* Blob 3: Blue/White Core - Stays more central but pulses */}
            <motion.div
                animate={{
                    scale: [0.8, 1.2, 0.9, 1.1],
                    opacity: [0.4, 0.7, 0.4, 0.6]
                }}
                transition={floatTransition(8)}
                className="absolute w-[140px] h-[140px] rounded-full bg-blue-500 blur-[60px] mix-blend-screen opacity-30"
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
