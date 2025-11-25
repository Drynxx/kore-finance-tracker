import React, { useState } from 'react';
import { X, Settings, Image as ImageIcon, DollarSign, User, LogOut, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useWallpaper } from '../context/WallpaperContext';
import { storage, WALLPAPER_BUCKET_ID } from '../lib/appwrite';

const SettingsModal = ({ onClose }) => {
    const { user, logout } = useAuth();
    const { currency, changeCurrency, currencies } = useCurrency();
    const { wallpapers, selectWallpaper, isAutoRotating, enableAutoRotation, wallpaperUrl } = useWallpaper();
    const [activeTab, setActiveTab] = useState('appearance');

    const tabs = [
        { id: 'appearance', label: 'Appearance', icon: ImageIcon },
        { id: 'general', label: 'General', icon: Settings },
        { id: 'account', label: 'Account', icon: User },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl bg-slate-900/80 backdrop-blur-3xl rounded-[2rem] shadow-2xl shadow-black/50 border border-white/10 animate-scale-in overflow-hidden flex flex-col md:flex-row h-[80vh] md:h-[600px]">
                {/* Inner Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-[2rem]" />

                {/* Sidebar */}
                <div className="w-full md:w-64 bg-slate-900/50 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col gap-2 relative z-10">
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                            <Settings size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Settings</h2>
                    </div>

                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-indigo-500/20 text-white border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <tab.icon size={20} strokeWidth={1.5} />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto relative z-10 custom-scrollbar">
                    <div className="flex justify-between items-center mb-6 md:hidden">
                        <h3 className="text-lg font-bold text-white capitalize">{activeTab}</h3>
                        <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-slate-400">
                            <X size={20} />
                        </button>
                    </div>
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all duration-300 hidden md:block">
                        <X size={24} strokeWidth={1.5} />
                    </button>

                    {/* Appearance Tab (Wallpapers) */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Wallpaper</h3>
                                <p className="text-slate-400 text-sm">Choose a background or enable auto-rotation.</p>
                            </div>

                            {/* Auto Rotate Toggle */}
                            <button
                                onClick={enableAutoRotation}
                                className={`w-full p-4 rounded-xl border transition-all duration-300 flex items-center justify-between group ${isAutoRotating ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isAutoRotating ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                        <RefreshCw size={20} className={isAutoRotating ? 'animate-spin-slow' : ''} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className={`font-bold ${isAutoRotating ? 'text-white' : 'text-slate-300'}`}>Auto Rotate</h3>
                                        <p className="text-xs text-slate-400">Change wallpaper every minute</p>
                                    </div>
                                </div>
                                {isAutoRotating && <Check size={20} className="text-indigo-400" />}
                            </button>

                            {/* Wallpaper Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {wallpapers.map((file) => {
                                    const url = storage.getFileView(WALLPAPER_BUCKET_ID, file.$id);
                                    const isSelected = wallpaperUrl === url && !isAutoRotating;

                                    return (
                                        <button
                                            key={file.$id}
                                            onClick={() => selectWallpaper(file.$id)}
                                            className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-300 group ${isSelected ? 'border-indigo-500 shadow-lg shadow-indigo-500/30 scale-[1.02]' : 'border-transparent hover:border-white/20 hover:scale-[1.02]'}`}
                                        >
                                            <img
                                                src={url}
                                                alt={file.name}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center backdrop-blur-[2px]">
                                                    <div className="bg-indigo-500 rounded-full p-1 shadow-lg">
                                                        <Check size={16} className="text-white" strokeWidth={3} />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                                <span className="text-xs text-white truncate w-full text-left">{file.name}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* General Tab (Currency) */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Currency</h3>
                                <p className="text-slate-400 text-sm">Select your preferred currency for the dashboard.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.values(currencies).map((curr) => (
                                    <button
                                        key={curr.code}
                                        onClick={() => changeCurrency(curr.code)}
                                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${currency.code === curr.code
                                            ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                            : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60 hover:border-white/10'
                                            }`}
                                    >
                                        <span className="text-3xl">{curr.flag}</span>
                                        <div className="text-left flex-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className={`font-bold ${currency.code === curr.code ? 'text-white' : 'text-slate-300'}`}>{curr.code}</h4>
                                                {currency.code === curr.code && <Check size={18} className="text-indigo-400" />}
                                            </div>
                                            <p className="text-sm text-slate-400">{curr.name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Account Tab */}
                    {activeTab === 'account' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Account</h3>
                                <p className="text-slate-400 text-sm">Manage your account settings.</p>
                            </div>

                            <div className="bg-slate-800/40 rounded-2xl p-6 border border-white/5 flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white">{user?.name || 'User'}</h4>
                                    <p className="text-slate-400">{user?.email}</p>
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-300 flex items-center justify-center gap-2 font-medium"
                            >
                                <LogOut size={20} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export { SettingsModal };
