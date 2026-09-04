/**
 * Kore Notification Engine
 * Handles Web Notifications API, Service Worker background notifications,
 * subtle Web Audio synthesized confirmation chimes, and haptic feedback.
 */

// Check if Notification API is supported
export const isNotificationSupported = () => {
    return typeof window !== 'undefined' && 'Notification' in window;
};

// Get current permission status
export const getNotificationPermission = () => {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission;
};

// Request Notification Permission from user
export const requestNotificationPermission = async () => {
    if (!isNotificationSupported()) {
        return 'unsupported';
    }

    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return 'denied';
    }
};

/**
 * Synthesizes a crisp, elegant confirmation chime using Web Audio API.
 * Completely offline, 0 external assets, ultra-fast.
 */
export const playConfirmationChime = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        
        // Two-tone harmonic chime (C6 -> G6)
        const playTone = (freq, startTime, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.08, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        playTone(1046.50, now, 0.15);       // C6
        playTone(1567.98, now + 0.08, 0.28); // G6
    } catch (e) {
        console.debug('Audio chime prevented or unsupported:', e);
    }
};

/**
 * Trigger subtle haptic vibration pattern
 */
export const triggerHaptic = (pattern = [100, 50, 100]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.debug('Haptics prevented:', e);
        }
    }
};

/**
 * Display a native OS / browser notification for Kore.
 * Tries ServiceWorkerRegistration first (for mobile PWAs), falls back to Notification constructor.
 */
export const showKoreNotification = async ({
    title = 'Kore Finance',
    body = 'Transaction updated successfully',
    icon = '/logo.png',
    badge = '/logo.png',
    tag = 'kore-notification',
    data = {},
    playSound = true
}) => {
    // 1. Play audio chime and haptics if permitted
    if (playSound) {
        playConfirmationChime();
    }
    triggerHaptic([80, 40, 80]);

    if (!isNotificationSupported()) {
        console.warn('Notifications not supported in this browser.');
        return false;
    }

    if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted.');
        return false;
    }

    const options = {
        body,
        icon,
        badge,
        tag,
        data,
        silent: !playSound,
        vibrate: [100, 50, 100],
        renotify: true
    };

    try {
        // Try Service Worker registration first (Required on Android Chrome & iOS PWA for background display)
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.ready;
                if (reg && reg.showNotification) {
                    await reg.showNotification(title, options);
                    return true;
                }
            } catch (swErr) {
                console.debug('ServiceWorker showNotification failed, falling back to Notification constructor:', swErr);
            }
        }

        // Standard Window Notification constructor
        const notif = new Notification(title, options);
        notif.onclick = () => {
            window.focus();
            notif.close();
        };
        return true;
    } catch (error) {
        console.error('Failed to show notification:', error);
        return false;
    }
};

/**
 * Helper to dispatch a pre-formatted transaction confirmation notification
 */
export const sendTransactionConfirmationNotification = async (transaction, source = 'Auto-Pay') => {
    const isExpense = transaction.type === 'expense' || transaction.amount < 0;
    const sign = isExpense ? '-' : '+';
    const absAmt = Math.abs(transaction.amount).toFixed(2);
    const currency = transaction.currency || 'RON';
    const merchant = transaction.merchant || transaction.note || transaction.category || 'Transaction';
    const category = transaction.category || 'General';

    return await showKoreNotification({
        title: `💳 ${isExpense ? 'Expense' : 'Income'} Logged • Kore`,
        body: `${sign}${absAmt} ${currency} at ${merchant} (${category}) via ${source}`,
        tag: `kore-tx-${Date.now()}`,
        data: { id: transaction.id, url: '/' }
    });
};
