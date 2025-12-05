import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const ResetPassword = ({ userId, secret, onComplete }) => {
    const { completePasswordReset } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        const result = await completePasswordReset(userId, secret, password, confirmPassword);
        setLoading(false);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 3000);
        } else {
            setError(result.error);
        }
    };

    if (success) {
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
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] p-12 text-center max-w-md w-full shadow-2xl shadow-black/50 relative z-10"
                >
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={32} className="text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
                    <p className="text-slate-300">Your password has been updated successfully. Redirecting to login...</p>
                </motion.div>
            </div>
        );
    }

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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] p-8 md:p-12 shadow-2xl shadow-black/50">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-serif text-white mb-2">Reset Password</h1>
                        <p className="text-white/70 font-light text-sm">Enter your new password below</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-white text-sm text-center backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/80 uppercase tracking-wider ml-4">New Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/10 border border-white/10 rounded-full py-4 pl-14 pr-6 text-white placeholder-white/40 focus:outline-none focus:bg-white/20 focus:border-white/30 transition-all shadow-inner"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/80 uppercase tracking-wider ml-4">Confirm Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white/10 border border-white/10 rounded-full py-4 pl-14 pr-6 text-white placeholder-white/40 focus:outline-none focus:bg-white/20 focus:border-white/30 transition-all shadow-inner"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white hover:bg-white/90 text-slate-900 font-bold py-4 rounded-full shadow-lg shadow-black/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? 'Updating...' : 'Set New Password'}
                            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};
