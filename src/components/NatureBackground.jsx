import React from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import { motion, AnimatePresence } from 'framer-motion';

export const NatureBackground = () => {
    const { wallpaperUrl } = useWallpaper();

    return (
        <div className="fixed inset-0 -z-50 overflow-hidden bg-slate-900">
            <AnimatePresence mode="wait">
                {wallpaperUrl ? (
                    <motion.div
                        key={wallpaperUrl}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0"
                    >
                        <img
                            src={wallpaperUrl}
                            alt="Background"
                            className="w-full h-full object-cover opacity-60 blur-sm scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/20 to-slate-900/80" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="default"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0"
                    >
                        {/* Default Yosemite-like Gradient if no wallpaper */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#2c3e50] via-[#4ca1af] to-[#2c3e50] opacity-50" />
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1449034446853-66c86144b0ad?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 blur-sm scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/20 to-slate-900/80" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Noise Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
};
