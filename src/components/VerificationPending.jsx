import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const VerificationPending = () => {
    const { user, sendVerificationEmail, logout, checkSession } = useAuth();
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');

    const handleResend = async () => {
        setSending(true);
        setMessage('');
        const result = await sendVerificationEmail();
        setSending(false);
        if (result.success) {
            setMessage('Verification email sent! Check your inbox.');
        } else {
            setMessage(result.error);
        }
    };

    const handleCheckStatus = async () => {
        await checkSession();
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            {/* Photorealistic Background */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: 'url("https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2070&auto=format&fit=crop")',
                }}
            >
                {/* Dark Overlay for Readability */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] p-8 md:p-12 shadow-2xl shadow-black/50 text-center">

                    <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                        <Mail size={32} className="text-indigo-400 relative z-10" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-3">Verify your Email</h1>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        We've sent a verification link to <span className="text-white font-medium">{user?.email}</span>.
                        Please check your inbox to continue.
                    </p>

                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-6 p-3 rounded-xl text-sm ${message.includes('sent') ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}
                        >
                            {message}
                        </motion.div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleCheckStatus}
                            className="w-full bg-white hover:bg-white/90 text-slate-900 font-bold py-4 rounded-full shadow-lg shadow-black/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            I've Verified
                        </button>

                        <button
                            onClick={handleResend}
                            disabled={sending}
                            className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-4 rounded-full border border-white/10 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {sending ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <Mail size={18} />
                            )}
                            Resend Email
                        </button>

                        <button
                            onClick={logout}
                            className="w-full text-white/60 hover:text-white font-medium py-2 text-sm transition-colors flex items-center justify-center gap-2 mt-4"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
