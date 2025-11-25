import React from 'react';
import { X, Check, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { useWallpaper } from '../context/WallpaperContext';
import { storage, WALLPAPER_BUCKET_ID } from '../lib/appwrite';

const WallpaperPickerModal = ({ onClose }) => {
    const { wallpapers, selectWallpaper, isAutoRotating, enableAutoRotation, wallpaperUrl } = useWallpaper();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-slate-900/70 backdrop-blur-3xl rounded-[2rem] p-8 shadow-2xl shadow-black/50 border border-white/10 animate-scale-in overflow-hidden max-h-[80vh] flex flex-col">
                {/* Inner Glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-[2rem]" />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between mb-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                            <ImageIcon size={24} />
                        </div>
                        <h2 className="text-2xl font-sans font-bold text-white tracking-tight">Select Wallpaper</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all duration-300"
                    >
                        <X size={24} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Auto Rotate Toggle */}
                <div className="relative z-10 mb-6 shrink-0">
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
                </div>

                {/* Grid */}
                <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    {wallpapers.map((file) => {
                        const url = storage.getFileView(WALLPAPER_BUCKET_ID, file.$id);
                        const isSelected = wallpaperUrl === url && !isAutoRotating;

                        return (
                            <button
                                key={file.$id}
                                onClick={() => {
                                    selectWallpaper(file.$id);
                                    // Optional: Close on select? Or let user browse? Let's keep it open.
                                }}
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
        </div>
    );
};

export { WallpaperPickerModal };
