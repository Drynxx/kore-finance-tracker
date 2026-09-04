import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Smartphone, 
    Sparkles, 
    Zap, 
    Copy, 
    Check, 
    Bell, 
    BellRing, 
    Play, 
    CreditCard, 
    ArrowRight, 
    CheckCircle2, 
    AlertCircle, 
    ExternalLink, 
    ShieldCheck, 
    Layers, 
    Cpu 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TransactionContext } from '../context/TransactionContext';
import { 
    isNotificationSupported, 
    getNotificationPermission, 
    requestNotificationPermission, 
    sendTransactionConfirmationNotification, 
    playConfirmationChime 
} from '../utils/notifications';

const PRESET_NOTIFICATIONS = [
    {
        label: '🤖 Google Pay • OMV Fuel',
        source: 'Google Pay',
        text: 'Google Wallet: Paid 45.00 RON at OMV'
    },
    {
        label: '🍎 Apple Pay • Starbucks',
        source: 'Apple Pay',
        text: 'Apple Pay: 24.50 RON at Starbucks'
    },
    {
        label: '💳 Revolut • Carrefour',
        source: 'Google Pay',
        text: 'Revolut: Paid 86.50 RON to Carrefour with card'
    },
    {
        label: '🏦 Bank SMS • Mega Image',
        source: 'Auto-Pay',
        text: 'Plata POS de 32.80 RON la MEGA IMAGE a fost autorizata'
    }
];

export const AutoPayModal = ({ onClose }) => {
    const { user, ingestionKey, getWebhookUrl, getQuickLogUrl } = useAuth();
    const { addTransaction } = useContext(TransactionContext);

    const [activePlatform, setActivePlatform] = useState('ios'); // 'ios' | 'android' | 'simulator'
    const [copiedField, setCopiedField] = useState(null);
    const [notifPermission, setNotifPermission] = useState(getNotificationPermission());

    // Simulator State
    const [simText, setSimText] = useState(PRESET_NOTIFICATIONS[0].text);
    const [simSource, setSimSource] = useState(PRESET_NOTIFICATIONS[0].source);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simResult, setSimResult] = useState(null);
    const [simError, setSimError] = useState(null);

    const webhookUrl = getWebhookUrl();
    const fullWebhookUrl = `${webhookUrl}?apiKey=${ingestionKey || user?.$id || 'sample_key'}`;

    useEffect(() => {
        setNotifPermission(getNotificationPermission());
    }, []);

    const handleCopy = (text, fieldName) => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleRequestPermission = async () => {
        const result = await requestNotificationPermission();
        setNotifPermission(result);
        if (result === 'granted') {
            playConfirmationChime();
        }
    };

    const handleRunSimulation = async () => {
        if (!simText.trim()) return;

        setIsSimulating(true);
        setSimError(null);
        setSimResult(null);

        try {
            // Call the Ingestion Webhook API
            const response = await fetch('/api/quick-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: ingestionKey || user?.$id || 'sim_user',
                    text: simText.trim(),
                    source: simSource
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to process transaction.');
            }

            // Also save directly into Appwrite local state
            if (addTransaction) {
                await addTransaction({
                    id: Math.floor(Math.random() * 100000000),
                    type: data.transaction.type,
                    amount: data.transaction.amount,
                    category: data.transaction.category,
                    date: data.transaction.date,
                    note: `${data.transaction.merchant} [${simSource}]`
                });
            }

            // Fire real device notification
            await sendTransactionConfirmationNotification(data.transaction, simSource);

            setSimResult(data);
        } catch (err) {
            console.error('Simulation error:', err);
            setSimError(err.message || 'Simulation failed.');
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/75 backdrop-blur-xl"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
                className="relative w-full max-w-2xl bg-slate-900/90 backdrop-blur-2xl rounded-[2.2rem] shadow-2xl shadow-indigo-950/50 border border-white/10 overflow-hidden flex flex-col my-auto max-h-[92vh]"
            >
                {/* Header Ambient Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-gradient-to-b from-indigo-500/20 via-violet-500/10 to-transparent blur-2xl pointer-events-none" />

                {/* Top Bar */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 relative z-10 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Zap className="w-5 h-5 text-white animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">Auto-Pay Tracking</h2>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    Live
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">Google Pay & Apple Pay automated transaction sync</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Notification Permission Strip */}
                <div className="px-6 py-2.5 bg-slate-950/60 border-b border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        {notifPermission === 'granted' ? (
                            <>
                                <BellRing className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-300 font-medium">Device confirmation notifications active</span>
                            </>
                        ) : notifPermission === 'denied' ? (
                            <>
                                <AlertCircle className="w-4 h-4 text-amber-400" />
                                <span className="text-amber-300">Notifications blocked in browser settings</span>
                            </>
                        ) : (
                            <>
                                <Bell className="w-4 h-4 text-indigo-400 animate-bounce" />
                                <span className="text-slate-300">Enable device notifications to confirm payment additions</span>
                            </>
                        )}
                    </div>
                    {notifPermission !== 'granted' && isNotificationSupported() && (
                        <button
                            onClick={handleRequestPermission}
                            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition-colors shadow-md shadow-indigo-600/30"
                        >
                            Enable Alerts
                        </button>
                    )}
                </div>

                {/* Platform Selector Nav */}
                <div className="px-6 pt-4 pb-2">
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/5">
                        <button
                            onClick={() => setActivePlatform('ios')}
                            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                                activePlatform === 'ios'
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Smartphone className="w-4 h-4" />
                            <span>Apple Pay (iOS)</span>
                        </button>

                        <button
                            onClick={() => setActivePlatform('android')}
                            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                                activePlatform === 'android'
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Smartphone className="w-4 h-4" />
                            <span>Google Pay (Android)</span>
                        </button>

                        <button
                            onClick={() => setActivePlatform('simulator')}
                            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                                activePlatform === 'simulator'
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Play className="w-4 h-4 text-emerald-400" />
                            <span>Live Simulator</span>
                        </button>
                    </div>
                </div>

                {/* Main Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 custom-scrollbar">
                    
                    {/* TAB 1: APPLE PAY (iOS) */}
                    {activePlatform === 'ios' && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="space-y-5"
                        >
                            {/* Insight Banner */}
                            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200/90 leading-relaxed flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-white block font-semibold mb-1">Native iOS 17+ Zero-Touch Automation</strong>
                                    Apple sandboxes apps from reading notifications. However, Apple built an official native trigger: 
                                    <span className="text-white font-medium"> Apple Shortcuts &gt; Automation &gt; Transaction</span>. When you tap to pay at any store terminal, iOS runs this shortcut automatically in the background and pops up a confirmation notification!
                                </div>
                            </div>

                            {/* Webhook Endpoint Box */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    Your Personal Sync Webhook URL
                                </label>
                                <div className="flex items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/10">
                                    <input
                                        type="text"
                                        readOnly
                                        value={fullWebhookUrl}
                                        className="bg-transparent border-none text-xs text-slate-300 font-mono flex-1 px-2 focus:outline-none truncate"
                                    />
                                    <button
                                        onClick={() => handleCopy(fullWebhookUrl, 'webhook')}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                                    >
                                        {copiedField === 'webhook' ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>Copy URL</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* 4-Step Visual Workflow Recipe */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    Shortcut Recipe (Takes 60 seconds to setup on iPhone)
                                </h3>
                                
                                <div className="space-y-2.5">
                                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                            1
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <strong className="text-white font-medium">Open Shortcuts App &gt; Automation Tab</strong>
                                            <p className="text-slate-400">Tap <span className="text-indigo-300 font-mono">+</span>, choose <span className="text-white">Transaction</span> (under Cards &amp; Passes). Select "Any Card". Toggle <span className="text-emerald-400 font-semibold">Run Immediately</span>.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                            2
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <strong className="text-white font-medium">Add Action: "Get Contents of URL"</strong>
                                            <p className="text-slate-400">Method: <span className="text-indigo-300 font-mono">POST</span>. URL: Paste your Personal Webhook URL above. Body: JSON containing <span className="text-white font-mono">Shortcut Input</span> (Amount, Merchant, Currency).</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                            3
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <strong className="text-white font-medium">Add Action: "Show Notification"</strong>
                                            <p className="text-slate-400">Select <span className="text-white font-mono">Contents of URL</span> as notification text. Whenever you tap to pay, your phone immediately rings with: <span className="text-emerald-400">"💳 Kore: Added 24.50 RON at Starbucks"</span>!</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* TAB 2: GOOGLE PAY (ANDROID) */}
                    {activePlatform === 'android' && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="space-y-5"
                        >
                            {/* Insight Banner */}
                            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-200/90 leading-relaxed flex items-start gap-3">
                                <Cpu className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-white block font-semibold mb-1">Android Notification Interception</strong>
                                    Android allows notification listening through automation apps (MacroDroid / Tasker) or native Android services. It detects notifications from <span className="text-white font-medium">Google Wallet (com.google.android.apps.walletnf)</span> and your banking apps.
                                </div>
                            </div>

                            {/* MacroDroid 1-Minute Setup */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        MacroDroid Setup (Free on Google Play Store)
                                    </h3>
                                    <span className="text-[10px] text-indigo-300 font-medium bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                        No Root Required
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                            1
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <strong className="text-white font-medium">Trigger: Notification Received</strong>
                                            <p className="text-slate-400">Select Applications: <span className="text-white">Google Wallet</span>, <span className="text-white">Revolut</span>, or your Bank. Text Content: Select <span className="text-indigo-300">Any</span>.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                            2
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <strong className="text-white font-medium">Action 1: HTTP Request</strong>
                                            <p className="text-slate-400">Method: <span className="text-indigo-300 font-mono">POST</span>. URL: <span className="text-slate-300 font-mono truncate">{webhookUrl}</span></p>
                                            <div className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-slate-300">
                                                &#123; "apiKey": "{ingestionKey || 'your_key'}", "text": "[notif_text]", "source": "Google Pay" &#125;
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                            3
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <strong className="text-white font-medium">Action 2: Display Notification</strong>
                                            <p className="text-slate-400">Title: <span className="text-white">Kore Finance</span>. Message: <span className="text-emerald-400 font-mono">&#123;http_response.notification.body&#125;</span>. Immediately displays confirmation right on your lock screen!</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* TAB 3: LIVE SIMULATOR & SANDBOX */}
                    {activePlatform === 'simulator' && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="space-y-4"
                        >
                            <p className="text-xs text-slate-300">
                                Test the live parsing and notification confirmation pipeline directly in your browser:
                            </p>

                            {/* Preset Chips */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Select a Sample Payment Notification:
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {PRESET_NOTIFICATIONS.map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setSimText(preset.text);
                                                setSimSource(preset.source);
                                            }}
                                            className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                                                simText === preset.text
                                                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                                                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            <span className="font-medium truncate">{preset.label}</span>
                                            {simText === preset.text && (
                                                <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1.5" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Input Form */}
                            <div className="space-y-2 pt-1">
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Notification String Payload:
                                </label>
                                <div className="relative">
                                    <textarea
                                        rows={2}
                                        value={simText}
                                        onChange={(e) => setSimText(e.target.value)}
                                        placeholder="Enter notification text (e.g. Google Pay: Paid 45 RON at OMV)..."
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-none"
                                    />
                                </div>
                            </div>

                            {/* Trigger Button */}
                            <button
                                type="button"
                                onClick={handleRunSimulation}
                                disabled={isSimulating || !simText.trim()}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isSimulating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Ingesting &amp; Generating Confirmation...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 text-emerald-300 fill-emerald-300" />
                                        <span>Simulate Notification Ingestion &amp; Dispatch Alert</span>
                                    </>
                                )}
                            </button>

                            {/* Simulation Results Card */}
                            {simResult && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-3 shadow-inner"
                                >
                                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Transaction Logged &amp; Notification Sent!</span>
                                        </div>
                                        <span className="text-[10px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full font-mono">
                                            {simResult.transaction.category}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Amount</span>
                                            <span className="text-lg font-bold text-white">
                                                {simResult.transaction.amount < 0 ? '-' : '+'}
                                                {Math.abs(simResult.transaction.amount).toFixed(2)} {simResult.transaction.currency}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Merchant</span>
                                            <span className="text-sm font-semibold text-slate-200">
                                                {simResult.transaction.merchant}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1 text-xs font-mono">
                                        <div className="text-[10px] text-indigo-300 uppercase font-semibold flex items-center gap-1">
                                            <Bell className="w-3 h-3" />
                                            <span>Generated System Notification:</span>
                                        </div>
                                        <div className="text-white font-medium text-[11px]">{simResult.notification.title}</div>
                                        <div className="text-slate-400 text-[11px]">{simResult.notification.body}</div>
                                    </div>
                                </motion.div>
                            )}

                            {simError && (
                                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/30 text-xs text-rose-300 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                                    <span>{simError}</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        <span>Encrypted sync token</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default AutoPayModal;
