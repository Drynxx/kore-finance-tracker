import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';

const IntroAnimation = ({ onComplete }) => {
    const { user } = useAuth();
    const [textVisible, setTextVisible] = useState(false);
    const [subTextVisible, setSubTextVisible] = useState(false);

    useEffect(() => {
        let timeouts = [];

        const playIntro = async () => {
            // Text Sequence
            timeouts.push(setTimeout(() => setTextVisible(true), 500));
            timeouts.push(setTimeout(() => setSubTextVisible(true), 1200));

            // Finish
            timeouts.push(setTimeout(() => {
                onComplete();
            }, 5500));
        };

        playIntro();

        return () => {
            timeouts.forEach(t => clearTimeout(t));
        };
    }, [user, onComplete]);

    return (
        <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-[50px] overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
        >
            {/* Background Orb - Always animating gently */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                    className="w-[600px] h-[600px] rounded-full opacity-60"
                    style={{
                        background: 'conic-gradient(from 180deg at 50% 50%, #FF2E63 0deg, #08D9D6 72deg, #252A34 144deg, #EAEAEA 216deg, #FF2E63 360deg)',
                        filter: 'blur(100px)',
                    }}
                    animate={{ rotate: 360, scale: [0.8, 1.1, 0.9] }}
                    transition={{
                        rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                        scale: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                    }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 text-center space-y-2 pointer-events-none">
                <AnimatePresence>
                    {textVisible && (
                        <motion.h1
                            className="text-5xl md:text-7xl font-semibold tracking-tighter text-white drop-shadow-2xl"
                            initial={{ opacity: 0, filter: 'blur(20px)', y: 20 }}
                            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        >
                            Bun venit
                        </motion.h1>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {subTextVisible && user?.name && (
                        <motion.p
                            className="text-2xl md:text-3xl font-medium tracking-wide text-white/80"
                            initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
                            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                            transition={{ duration: 1.0, ease: "easeOut" }}
                        >
                            {user.name}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>

            {/* Skip Button */}
            <button
                onClick={onComplete}
                className="absolute top-8 right-8 text-white/20 hover:text-white/80 transition-colors z-[101]"
            >
                <X size={24} strokeWidth={1} />
            </button>
        </motion.div>
    );
};

export default IntroAnimation;
