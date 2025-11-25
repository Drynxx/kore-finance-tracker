import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ArrowRight, Mail } from 'lucide-react';

export const AuthScreens = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { login, register } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
        </div>
    );
};
