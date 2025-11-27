import React, { useState, useContext } from 'react';
import { X, Settings, Image as ImageIcon, DollarSign, User, LogOut, Check, RefreshCw, FileText, FileDown, ChevronRight, SwitchCamera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useWallpaper } from '../context/WallpaperContext';
import { TransactionContext } from '../context/TransactionContext';
import { storage, WALLPAPER_BUCKET_ID } from '../lib/appwrite';
import { motion, AnimatePresence } from 'framer-motion';

const SettingsModal = ({ onClose }) => {
    const { user, logout } = useAuth();
    const { currency, changeCurrency, currencies } = useCurrency();
    const { wallpapers, selectWallpaper, isAutoRotating, toggleAutoRotation, wallpaperUrl } = useWallpaper();
    const { transactions } = useContext(TransactionContext);
    const [activeTab, setActiveTab] = useState('appearance');

    const tabs = [
        { id: 'appearance', label: 'Appearance', icon: ImageIcon, desc: 'Wallpaper & Theme' },
        { id: 'general', label: 'General', icon: Settings, desc: 'Currency & Data' },
        { id: 'account', label: 'Account', icon: User, desc: 'Profile & Security' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal Content - Unified Top Nav Layout */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className="relative w-full max-w-2xl h-[85vh] md:h-[700px] bg-slate-900/60 backdrop-blur-xl md:backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-black/50 border border-white/10 overflow-hidden flex flex-col"
            >
                {/* Glass Reflection */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

                {/* Global Header */}
                <div className="flex-none px-5 py-5 md:px-8 md:py-6 flex items-center justify-between border-b border-white/5 bg-white/5 relative z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Settings size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">Settings</h2>
                            <p className="text-xs text-slate-400 font-medium">Preferences & Account</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Top Navigation Tabs */}
                <div className="flex-none px-5 pt-5 pb-1 md:px-8 md:pt-6 md:pb-2 relative z-20">
                    <div className="flex p-1 bg-black/20 rounded-2xl border border-white/5">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="relative flex-1 flex items-center justify-center gap-2 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-xl transition-all duration-300"
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-white/10 rounded-xl shadow-sm border border-white/10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className={`relative z-10 flex items-center gap-1.5 md:gap-2 ${activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                                    <tab.icon size={14} className="md:w-4 md:h-4" />
                                    {tab.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar relative z-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6 md:space-y-8"
                        >
                            {/* Appearance Tab */}
                            {activeTab === 'appearance' && (
                                <div className="space-y-6 md:space-y-8">
                                    {/* Auto Rotate Section */}
                                    <section className="space-y-3 md:space-y-4">
                                        <h4 className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wider pl-1">Wallpaper Rotation</h4>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 flex items-center justify-between hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3 md:gap-4">
                                                <div className={`p-2.5 md:p-3 rounded-xl ${isAutoRotating ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                                                    <RefreshCw size={20} className={`md:w-6 md:h-6 ${isAutoRotating ? 'animate-spin-slow' : ''}`} />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm md:text-base font-semibold text-white">Auto-Rotate</h5>
                                                    <p className="text-xs md:text-sm text-slate-400">Change every minute</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={toggleAutoRotation}
                                                className={`w-12 h-7 md:w-14 md:h-8 rounded-full transition-colors duration-300 relative ${isAutoRotating ? 'bg-indigo-500' : 'bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-5 h-5 md:w-6 md:h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${isAutoRotating ? 'translate-x-5 md:translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </section>

                                    {/* Wallpapers Grid */}
                                    <section className="space-y-3 md:space-y-4">
                                        <h4 className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wider pl-1">Select Wallpaper</h4>
                                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                                            {wallpapers.map((file) => {
                                                const url = storage.getFileView(WALLPAPER_BUCKET_ID, file.$id);
                                                const isSelected = wallpaperUrl === url && !isAutoRotating;

                                                return (
                                                    <motion.button
                                                        key={file.$id}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => selectWallpaper(file.$id)}
                                                        className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-300 group ${isSelected ? 'border-indigo-500 shadow-lg shadow-indigo-500/30' : 'border-transparent hover:border-white/20'}`}
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={file.name}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center backdrop-blur-[2px]">
                                                                <div className="bg-indigo-500 rounded-full p-1.5 shadow-lg">
                                                                    <Check size={16} className="text-white" strokeWidth={3} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                            <span className="text-xs text-white font-medium truncate w-full text-left">{file.name}</span>
                                                        </div>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {/* General Tab */}
                            {activeTab === 'general' && (
                                <div className="space-y-6 md:space-y-8">
                                    <section className="space-y-3 md:space-y-4">
                                        <h4 className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wider pl-1">Currency Preference</h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {Object.values(currencies).map((curr) => (
                                                <button
                                                    key={curr.code}
                                                    onClick={() => changeCurrency(curr.code)}
                                                    className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl border transition-all duration-300 ${currency.code === curr.code
                                                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                                        }`}
                                                >
                                                    <span className="text-2xl md:text-3xl">{curr.flag}</span>
                                                    <div className="text-left flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className={`font-bold text-sm md:text-base ${currency.code === curr.code ? 'text-white' : 'text-slate-300'}`}>{curr.code}</h4>
                                                            {currency.code === curr.code && <Check size={16} className="text-indigo-400 md:w-5 md:h-5" />}
                                                        </div>
                                                        <p className="text-xs md:text-sm text-slate-400">{curr.name}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {/* Account Tab */}
                            {activeTab === 'account' && (
                                <div className="space-y-6 md:space-y-8">
                                    <section className="space-y-3 md:space-y-4">
                                        <h4 className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wider pl-1">Profile Information</h4>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 flex items-center gap-4 md:gap-6">
                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl md:text-3xl font-bold text-white shadow-xl shadow-indigo-500/20">
                                                {user?.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <h4 className="text-lg md:text-xl font-bold text-white mb-1">{user?.name || 'User'}</h4>
                                                <p className="text-xs md:text-sm text-slate-400 font-medium">{user?.email}</p>
                                                <div className="mt-2 md:mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] md:text-xs font-bold border border-emerald-500/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    Active Session
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-3 md:space-y-4">
                                        <h4 className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wider pl-1">Danger Zone</h4>
                                        <button
                                            onClick={logout}
                                            className="w-full p-3 md:p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-300 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <LogOut size={18} className="md:w-5 md:h-5" />
                                                <span className="font-medium text-sm md:text-base">Sign Out</span>
                                            </div>
                                            <ChevronRight size={16} className="opacity-50 group-hover:translate-x-1 transition-transform md:w-5 md:h-5" />
                                        </button>
                                    </section>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export { SettingsModal };
