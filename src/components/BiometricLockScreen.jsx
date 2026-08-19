import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useBiometrics } from '../context/BiometricContext';
import { useAuth } from '../context/AuthContext';
import { Fingerprint } from 'lucide-react';

export const BiometricLockScreen = () => {
    const { unlock, isAuthenticating, authError } = useBiometrics();
    const { logout } = useAuth();

    // Trigger biometric prompt on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            unlock();
        }, 200);
        return () => clearTimeout(timer);
    }, [unlock]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl select-none">
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full max-w-xs flex flex-col items-center text-center"
            >
                {/* Minimal Sensor Icon */}
                <button
                    type="button"
                    onClick={unlock}
                    disabled={isAuthenticating}
                    aria-label="Unlock with biometrics"
                    className="relative group p-6 rounded-full transition-all duration-300 active:scale-95 focus:outline-none"
                >
                    {/* Subtle outer breathing ring when authenticating */}
                    <motion.div
                        animate={{
                            scale: isAuthenticating ? [1, 1.15, 1] : 1,
                            opacity: isAuthenticating ? [0.4, 0.8, 0.4] : 0.2
                        }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full border border-indigo-400/30"
                    />

                    {/* Sensor Circle */}
                    <div className="relative w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:border-white/20 transition-all">
                        <Fingerprint className={`w-10 h-10 transition-transform stroke-[1.5] ${isAuthenticating ? 'text-indigo-400 scale-105' : 'text-slate-300'}`} />
                    </div>
                </button>

                {/* Minimalist Title & Subtitle */}
                <div className="mt-4 space-y-1">
                    <h2 className="text-base font-medium text-white tracking-tight">
                        Kore Locked
                    </h2>
                    <p className="text-xs text-slate-400 font-normal">
                        {isAuthenticating ? 'Verifying biometrics...' : 'Tap to unlock'}
                    </p>
                </div>

                {/* Subtle Inline Error */}
                {authError && (
                    <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 text-xs text-rose-400/90 font-medium max-w-[240px]"
                    >
                        {authError}
                    </motion.p>
                )}

                {/* Minimalist Password Fallback Link */}
                <div className="mt-8">
                    <button
                        type="button"
                        onClick={logout}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5"
                    >
                        Sign in with password
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default BiometricLockScreen;
