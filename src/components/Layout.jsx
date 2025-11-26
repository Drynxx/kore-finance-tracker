import React, { useState } from 'react';
import { LayoutDashboard, Plus, List, Wallet, Settings, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SettingsModal } from './SettingsModal';
import { AIAssistantModal } from './AIAssistantModal';
import { motion } from 'framer-motion';

const Layout = ({ children, activeTab, setActiveTab, onOpenAddModal }) => {
    const { user } = useAuth();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAIOpen, setIsAIOpen] = useState(false);

    const DockIcon = ({ icon: Icon, label, isActive, onClick }) => {
        const isAI = label === 'Kore Assistant';

        return (
            <motion.button
                onClick={onClick}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.95 }}
                className={`relative p-3 rounded-2xl transition-all duration-300 group 
                    ${isActive ? 'bg-white/20 text-white shadow-lg shadow-indigo-500/20' :
                        isAI ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/20 hover:text-white hover:border-indigo-400' :
                            'text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
                <Icon size={24} strokeWidth={1.5} className={isAI ? "animate-pulse" : ""} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-slate-900/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none backdrop-blur-md border border-white/10">
                    {label}
                </span>
                {isActive && (
                    <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white/10 rounded-2xl -z-10"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                )}
            </motion.button>
        );
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-200">
            {/* Floating Dock (Desktop) */}
            <motion.aside
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="hidden md:flex flex-col items-center justify-between w-24 fixed left-6 top-12 bottom-12 z-50 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] py-8 shadow-2xl shadow-black/20"
            >
                <div className="flex flex-col items-center gap-8">
                    <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="p-3 bg-white/10 rounded-2xl border border-white/20 shadow-lg shadow-indigo-500/10 backdrop-blur-md"
                    >
                        <Wallet className="w-6 h-6 text-white" strokeWidth={1.5} />
                    </motion.div>

                    <nav className="flex flex-col gap-6">
                        <DockIcon
                            icon={LayoutDashboard}
                            label="Dashboard"
                            isActive={activeTab === 'dashboard'}
                            onClick={() => setActiveTab('dashboard')}
                        />
                        <DockIcon
                            icon={List}
                            label="Transactions"
                            isActive={activeTab === 'transactions'}
                            onClick={() => setActiveTab('transactions')}
                        />
                        <DockIcon
                            icon={Sparkles}
                            label="Kore Assistant"
                            isActive={isAIOpen}
                            onClick={() => setIsAIOpen(true)}
                        />
                        <DockIcon
                            icon={Settings}
                            label="Settings"
                            isActive={isSettingsOpen}
                            onClick={() => setIsSettingsOpen(true)}
                        />
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onOpenAddModal}
                            className="p-3 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 border border-white/20"
                        >
                            <Plus size={24} strokeWidth={1.5} />
                        </motion.button>
                    </nav>
                </div>

                <div className="flex flex-col items-center gap-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                </div>
            </motion.aside>

            {/* Mobile Header (Dark Glass) */}
            <header className="sticky top-0 z-10 md:hidden backdrop-blur-2xl bg-slate-900/60 border-b border-white/5">
                <div className="px-6 py-5 flex items-center justify-between relative">
                    {/* Centered Title */}
                    <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-sans font-bold text-white tracking-tight">
                        Kore
                    </h1>

                    {/* Left Side - User Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/20 relative z-10">
                        {user?.name?.charAt(0) || 'U'}
                    </div>

                    {/* Right Side - Empty for balance */}
                    <div className="w-8 h-8" />
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-32 p-6 md:p-8 max-w-7xl mx-auto w-full pb-32 md:pb-8">
                {children}
            </main>

            {/* Mobile Bottom Navigation (Dark Glass Floating Pill) */}
            <nav className="fixed bottom-6 left-6 right-6 z-50 md:hidden pointer-events-none">
                <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_0_20px_rgba(0,0,0,0.3)] h-20 px-6 flex justify-between items-center relative pointer-events-auto">
                    {/* Inner Glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5 pointer-events-none rounded-[2rem]" />

                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`relative z-10 transition-all duration-300 ${activeTab === 'dashboard' ? 'text-indigo-400 scale-110 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-slate-500'}`}
                        >
                            <LayoutDashboard size={24} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
                        </button>

                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`relative z-10 transition-all duration-300 ${activeTab === 'transactions' ? 'text-indigo-400 scale-110 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-slate-500'}`}
                        >
                            <List size={24} strokeWidth={activeTab === 'transactions' ? 2.5 : 2} />
                        </button>
                    </div>

                    {/* Spacer for FAB */}
                    <div className="w-12" />

                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => setIsAIOpen(true)}
                            className={`relative z-10 transition-all duration-300 ${isAIOpen ? 'text-indigo-400 scale-110 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-slate-500'}`}
                        >
                            <Sparkles size={24} strokeWidth={2} className={isAIOpen ? "animate-pulse" : ""} />
                        </button>

                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className={`relative z-10 transition-all duration-300 ${isSettingsOpen ? 'text-indigo-400 scale-110 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-slate-500'}`}
                        >
                            <Settings size={24} strokeWidth={isSettingsOpen ? 2.5 : 2} />
                        </button>
                    </div>
                </div>

                {/* FAB - Positioned relative to the nav container, sitting on top */}
                <button
                    onClick={onOpenAddModal}
                    className="absolute left-1/2 -translate-x-1/2 bottom-1 z-50 group pointer-events-auto"
                >
                    <div className="bg-slate-900/50 backdrop-blur-xl p-2 rounded-full border border-indigo-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] group-active:scale-95 transition-transform duration-200">
                        <div className="bg-gradient-to-br from-purple-600 via-orange-500 to-red-500 text-white w-14 h-14 rounded-full shadow-[0_0_25px_rgba(249,115,22,0.4)] flex items-center justify-center border border-white/20 group-hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] transition-shadow duration-300">
                            <Plus size={32} strokeWidth={1.5} />
                        </div>
                    </div>
                </button>
            </nav>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}

            {/* AI Assistant Modal */}
            {isAIOpen && (
                <AIAssistantModal onClose={() => setIsAIOpen(false)} />
            )}
        </div>
    );
};

export { Layout };
