
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export const ReloadPrompt = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    // Only show if update is needed
    if (!needRefresh) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] p-4 bg-slate-900/90 backdrop-blur-xl border border-indigo-500/50 rounded-2xl shadow-2xl flex flex-col gap-3 max-w-[300px] animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-white font-bold text-sm">New Update Available!</h3>
                    <p className="text-slate-400 text-xs mt-1">A new version of the app is ready. Update now to see the latest fixes.</p>
                </div>
                <button onClick={close} className="text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            <button
                onClick={() => updateServiceWorker(true)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
            >
                <RefreshCw size={16} className="animate-spin-slow" />
                Update & Reload
            </button>
        </div>
    );
};
