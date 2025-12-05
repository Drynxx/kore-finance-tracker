import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ArrowRight, Mail } from 'lucide-react';

export const AuthScreens = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [showForgotModal, setShowForgotModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetStatus, setResetStatus] = useState({ loading: false, message: '', error: '' });
    const { login, register, sendPasswordReset } = useAuth();

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setResetStatus({ loading: true, message: '', error: '' });

        const result = await sendPasswordReset(resetEmail);

        if (result.success) {
            setResetStatus({
                loading: false,
                message: 'Recovery email sent! Check your inbox.',
                error: ''
            });
            setTimeout(() => {
                setShowForgotModal(false);
                setResetStatus({ loading: false, message: '', error: '' });
                setResetEmail('');
            }, 3000);
        } else {
            setResetStatus({
                loading: false,
                message: '',
                error: result.error
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let result;
            if (isLogin) {
                result = await login(formData.email, formData.password);
            } else {
                if (!formData.name || !formData.email || !formData.password) {
                    setError('All fields are required');
                    setLoading(false);
                    return;
                }

                // Strict Email Validation
                const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
                if (!emailRegex.test(formData.email)) {
                    setError('Please enter a valid email address');
                    setLoading(false);
                    return;
                }

                result = await register(formData.name, formData.email, formData.password);
            }

            if (!result.success) {
                setError(result.error);
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
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

            <div className="w-full max-w-md relative z-10">
                {/* Frosted Glass Card */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] p-8 md:p-12 shadow-2xl shadow-black/50">

                    {/* Header with Custom Logo */}
                    <div className="text-center mb-10">
                        <div className="flex justify-center mb-8 relative">
                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-150 opacity-20"></div>
                            <img
                                src="logo.png"
                                alt="Kore Logo"
                                className="h-28 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] relative z-10"
                            />
                        </div>
                        <h1 className="text-3xl font-serif text-white mb-2 tracking-tight">
                            {isLogin ? 'Welcome back to Kore' : 'Join Kore'}
                        </h1>
                        <p className="text-white/70 font-light text-sm">
                            {isLogin ? 'Enter your details to manage your finances' : 'Start your journey to financial clarity'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-white text-sm text-center backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-white/80 uppercase tracking-wider ml-4">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 group-focus-within:text-white transition-colors" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-white/10 border border-white/10 rounded-full py-4 pl-14 pr-6 text-white placeholder-white/40 focus:outline-none focus:bg-white/20 focus:border-white/30 transition-all shadow-inner"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/80 uppercase tracking-wider ml-4">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 group-focus-within:text-white transition-colors" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-white/10 border border-white/10 rounded-full py-4 pl-14 pr-6 text-white placeholder-white/40 focus:outline-none focus:bg-white/20 focus:border-white/30 transition-all shadow-inner"
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/80 uppercase tracking-wider ml-4">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-white/10 border border-white/10 rounded-full py-4 pl-14 pr-6 text-white placeholder-white/40 focus:outline-none focus:bg-white/20 focus:border-white/30 transition-all shadow-inner"
                                    placeholder="••••••••"
                                />
                            </div>
                            {isLogin && (
                                <div className="flex justify-end px-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotModal(true)}
                                        className="text-xs text-white/60 hover:text-white transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white hover:bg-white/90 text-slate-900 font-bold py-4 rounded-full shadow-lg shadow-black/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    {/* Toggle */}
                    <div className="mt-8 text-center">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                setFormData({ name: '', email: '', password: '' });
                            }}
                            className="text-white/70 hover:text-white text-sm transition-colors font-medium"
                        >
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <span className="text-white underline decoration-white/30 hover:decoration-white underline-offset-4">
                                {isLogin ? 'Sign up' : 'Sign in'}
                            </span>
                        </button>
                    </div>

                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl shadow-black/50 relative">
                        <button
                            onClick={() => setShowForgotModal(false)}
                            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                        <h3 className="text-xl font-bold text-white mb-2">Reset Password</h3>
                        <p className="text-white/60 text-sm mb-6">Enter your email to receive a recovery link.</p>

                        <form onSubmit={handleForgotSubmit} className="space-y-4">
                            {resetStatus.message && (
                                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm text-center border border-emerald-500/30">
                                    {resetStatus.message}
                                </div>
                            )}
                            {resetStatus.error && (
                                <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 text-sm text-center border border-rose-500/30">
                                    {resetStatus.error}
                                </div>
                            )}

                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 group-focus-within:text-white transition-colors" />
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-14 pr-6 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={resetStatus.loading}
                                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-full shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {resetStatus.loading ? 'Sending...' : 'Send Recovery Link'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Creator Credit */}
            <div className="absolute bottom-6 left-0 right-0 text-center z-20 pointer-events-none">
                <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-light">
                    Made by Mattias Tarr
                </p>
            </div>
        </div>
    );
};
