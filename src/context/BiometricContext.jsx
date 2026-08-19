import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    isBiometricsSupported,
    isBiometricsEnabled,
    registerBiometrics,
    authenticateWithBiometrics,
    disableBiometrics as removeBiometrics
} from '../utils/biometrics';

const BiometricContext = createContext();

export const useBiometrics = () => useContext(BiometricContext);

export const BiometricProvider = ({ children }) => {
    const [isSupported, setIsSupported] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState(null);

    // Initial check on mount
    useEffect(() => {
        const checkSupport = async () => {
            const supported = await isBiometricsSupported();
            setIsSupported(supported);
            const enabled = isBiometricsEnabled();
            setIsEnabled(enabled);

            // If biometrics are enabled, lock the ledger on initial app launch
            if (enabled) {
                setIsLocked(true);
            }
        };
        checkSupport();
    }, []);

    // Auto-lock when user leaves the app (PWA backgrounded / Tab hidden)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isBiometricsEnabled()) {
                setIsLocked(true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const unlock = useCallback(async () => {
        setIsAuthenticating(true);
        setAuthError(null);

        try {
            await authenticateWithBiometrics();

            // Success haptic
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                    navigator.vibrate([60, 30, 60]);
                } catch (e) {
                    console.debug("Haptics failed:", e);
                }
            }

            setIsLocked(false);
            setIsAuthenticating(false);
            return { success: true };
        } catch (err) {
            console.error("Biometric authentication failed:", err);
            const msg = err.message || "Authentication cancelled or failed.";
            setAuthError(msg);
            setIsAuthenticating(false);
            return { success: false, error: msg };
        }
    }, []);

    const enable = async (userEmail, userName) => {
        try {
            const res = await registerBiometrics(userEmail, userName);
            setIsEnabled(true);
            setIsLocked(false);
            return res;
        } catch (err) {
            console.error("Failed to enable biometrics:", err);
            throw err;
        }
    };

    const disable = () => {
        removeBiometrics();
        setIsEnabled(false);
        setIsLocked(false);
    };

    const lock = () => {
        if (isEnabled) {
            setIsLocked(true);
        }
    };

    return (
        <BiometricContext.Provider
            value={{
                isSupported,
                isEnabled,
                isLocked,
                isAuthenticating,
                authError,
                unlock,
                lock,
                enable,
                disable
            }}
        >
            {children}
        </BiometricContext.Provider>
    );
};
