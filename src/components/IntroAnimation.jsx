import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const IntroAnimation = ({ onComplete }) => {
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    // Contextual greeting
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Bună dimineața';
        if (hour >= 12 && hour < 18) return 'Bună ziua';
        if (hour >= 18 && hour < 23) return 'Bună seara';
        return 'Bun venit';
    }, []);

    const firstName = useMemo(() => {
        if (!user?.name) return '';
        return user.name.trim().split(' ')[0];
    }, [user]);

    // Handle skip & completion
    const handleFinish = () => {
        if (isExiting) return;
        setIsExiting(true);
        setTimeout(() => {
            onComplete();
        }, 500);
    };

    // Keyboard support for instant skip (ESC, Space, Enter)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                handleFinish();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isExiting]);

    // Timeline Sequence
    useEffect(() => {
        const t1 = setTimeout(() => setStep(1), 300);
        const t2 = setTimeout(() => setStep(2), 1100);
        const t3 = setTimeout(() => handleFinish(), 3800);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, []);

    return (
        <motion.div
            onClick={handleFinish}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030408]/90 backdrop-blur-[60px] overflow-hidden select-none cursor-pointer touch-manipulation min-h-[100dvh]"
            initial={{ opacity: 0 }}
            animate={{ 
                opacity: isExiting ? 0 : 1, 
                scale: isExiting ? 1.03 : 1, 
                filter: isExiting ? 'blur(20px)' : 'blur(0px)' 
            }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(24px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Ethereal Minimalist Light Bloom */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                <motion.div
                    className="w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] md:w-[700px] md:h-[700px] rounded-full opacity-30 mix-blend-screen will-change-transform"
                    style={{
                        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(147, 51, 234, 0.25) 40%, rgba(6, 182, 212, 0.15) 60%, transparent 75%)',
                        filter: 'blur(80px)',
                    }}
                    animate={{
                        scale: [0.95, 1.1, 0.95],
                        opacity: [0.25, 0.35, 0.25],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            {/* Top Minimalist Skip Button */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="absolute z-[102]"
                style={{
                    top: 'max(1.25rem, env(safe-area-inset-top, 1.25rem))',
                    right: 'max(1.25rem, env(safe-area-inset-right, 1.25rem))'
                }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleFinish();
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-light tracking-wider text-white/40 hover:text-white/90 transition-colors duration-300"
                >
                    sari peste
                </button>
            </motion.div>

            {/* Pure Aesthetic Typography Center */}
            <div className="relative z-10 flex flex-col items-center justify-center max-w-lg w-full px-6 text-center pointer-events-none">
                
                {/* Brand Tagline */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: step >= 0 ? 1 : 0, y: step >= 0 ? 0 : 15 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-4 sm:mb-6"
                >
                    <span className="text-[11px] sm:text-xs font-medium tracking-[0.35em] text-white/30 uppercase">
                        K O R E
                    </span>
                </motion.div>

                {/* Primary Greeting */}
                <div className="space-y-3 mb-8 sm:mb-10 w-full">
                    <AnimatePresence mode="wait">
                        {step >= 1 && (
                            <motion.h1
                                key="greeting-title"
                                className="text-3xl sm:text-5xl md:text-6xl font-light tracking-tight text-white font-sans leading-tight"
                                initial={{ opacity: 0, y: 20, filter: 'blur(12px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <span className="text-white/90">
                                    {greeting}
                                </span>
                                {firstName && (
                                    <span className="font-normal block sm:inline sm:ml-2.5 mt-1 sm:mt-0 text-white">
                                        {firstName}
                                    </span>
                                )}
                            </motion.h1>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {step >= 2 && (
                            <motion.p
                                initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className="text-xs sm:text-sm font-light tracking-widest text-white/40 uppercase"
                            >
                                Financial Workspace
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                {/* Hairline Apple-Style Progress Line */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="w-32 sm:w-44 h-[1.5px] bg-white/[0.08] rounded-full overflow-hidden relative"
                >
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-white/20 via-white/80 to-white/30"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                </motion.div>
            </div>

            {/* Bottom Subtle Hint */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="absolute z-10 text-[10px] sm:text-[11px] font-light tracking-wider text-white/40 pointer-events-none text-center"
                style={{
                    bottom: 'max(1.75rem, env(safe-area-inset-bottom, 1.75rem))'
                }}
            >
                atinge pentru a continua
            </motion.div>
        </motion.div>
    );
};

export default IntroAnimation;



