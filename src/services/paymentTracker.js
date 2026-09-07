import { registerPlugin, Capacitor } from '@capacitor/core';

// Access the native PaymentTracker plugin registered in MainActivity
const PaymentTracker = registerPlugin('PaymentTracker');

export const isNativeAndroid = Capacitor.getPlatform() === 'android';
export const isNativeIOS = Capacitor.getPlatform() === 'ios';

/**
 * Checks if Notification Listener Service permission is granted by the user.
 */
export const checkPaymentNotificationPermission = async () => {
    if (!isNativeAndroid) {
        return { supported: false, granted: false, reason: 'Only supported on Android native build' };
    }
    try {
        const res = await PaymentTracker.isPermissionGranted();
        return { supported: true, granted: !!res?.granted };
    } catch (err) {
        console.error('Error checking notification listener permission:', err);
        return { supported: true, granted: false, error: err.message };
    }
};

/**
 * Directs the user to Android Settings -> Device & App Notifications to enable Kore.
 */
export const openNotificationSettings = async () => {
    if (!isNativeAndroid) return false;
    try {
        await PaymentTracker.openPermissionSettings();
        return true;
    } catch (err) {
        console.error('Failed to open notification settings:', err);
        return false;
    }
};

/**
 * Synchronizes Appwrite credentials with native Android SharedPreferences
 * so the background service can post documents directly even when Kore is closed.
 */
export const syncPaymentTrackerSession = async (user, jwt = '') => {
    if (!isNativeAndroid || !user?.$id) return;
    try {
        await PaymentTracker.syncSession({
            endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
            projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID || '69247271000fd2e093f0',
            databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || '692472be00265c68d4e3',
            collectionId: import.meta.env.VITE_APPWRITE_COLLECTION_ID || 'transaction',
            userId: user.$id,
            jwt: jwt || '',
            trackingEnabled: true
        });
        console.log('PaymentTracker session synchronized with native Android service');
    } catch (err) {
        console.error('Failed to sync session with PaymentTracker plugin:', err);
    }
};

/**
 * Checks for any transactions captured by the background notification listener
 * while the app was closed or in the background.
 */
export const fetchPendingTransactions = async () => {
    if (!isNativeAndroid) return [];
    try {
        const res = await PaymentTracker.getPendingTransactions();
        return res?.transactions || [];
    } catch (err) {
        console.error('Failed to fetch pending transactions:', err);
        return [];
    }
};

/**
 * Listens for real-time transactions captured while the app is actively foregrounded.
 */
export const addPaymentDetectedListener = (callback) => {
    if (!isNativeAndroid) return { remove: () => {} };
    try {
        return PaymentTracker.addListener('onNewTransaction', (transaction) => {
            callback(transaction);
        });
    } catch (err) {
        console.error('Failed to register payment detected listener:', err);
        return { remove: () => {} };
    }
};

/**
 * Simulates a payment notification for quick developer testing.
 */
export const testSimulatePayment = async (title = 'Google Pay', text = 'Paid $14.50 to Starbucks') => {
    if (!isNativeAndroid) {
        // Mock fallback for browser dev environment
        return {
            success: true,
            mock: true,
            transaction: {
                id: 'mock-' + Date.now(),
                amount: 14.5,
                currency: 'USD',
                merchant: 'Starbucks',
                category: 'Food & Dining',
                note: 'Auto-tracked via Google Pay: Starbucks',
                date: new Date().toISOString()
            }
        };
    }
    try {
        const res = await PaymentTracker.simulateNotification({ title, text });
        return res;
    } catch (err) {
        console.error('Simulation error:', err);
        return { success: false, error: err.message };
    }
};
