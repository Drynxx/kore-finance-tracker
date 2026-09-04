import React, { createContext, useState, useEffect, useContext } from 'react';
import { account } from '../lib/appwrite';
import { ID } from 'appwrite';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const currentUser = await account.get();
            setUser(currentUser);
        } catch (error) {
            // No active session
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const register = async (name, email, password) => {
        try {
            // Create account
            await account.create(ID.unique(), email, password, name);

            // Auto-login after registration
            await account.createEmailPasswordSession(email, password);

            // Get user data
            const currentUser = await account.get();
            setUser(currentUser);

            // Trigger verification email automatically
            await sendVerificationEmail();

            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: error.message || 'Registration failed'
            };
        }
    };

    const login = async (email, password) => {
        try {
            await account.createEmailPasswordSession(email, password);
            const currentUser = await account.get();
            setUser(currentUser);
            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.message || 'Invalid email or password'
            };
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const sendVerificationEmail = async () => {
        try {
            const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
            await account.createVerification(`${baseUrl}/verify`);
            return { success: true };
        } catch (error) {
            console.error('Verification email error:', error);
            return {
                success: false,
                error: error.message || 'Failed to send verification email'
            };
        }
    };

    const completeVerification = async (userId, secret) => {
        try {
            await account.updateVerification(userId, secret);
            // Refresh user data to update emailVerification status
            const currentUser = await account.get();
            setUser(currentUser);
            return { success: true };
        } catch (error) {
            console.error('Verification completion error:', error);
            return {
                success: false,
                error: error.message || 'Verification failed'
            };
        }
    };

    const sendPasswordReset = async (email) => {
        try {
            const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
            await account.createRecovery(email, `${baseUrl}?type=recovery`);
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                error: error.message || 'Failed to send password reset email'
            };
        }
    };

    const completePasswordReset = async (userId, secret, password, passwordAgain) => {
        try {
            await account.updateRecovery(userId, secret, password, passwordAgain);
            return { success: true };
        } catch (error) {
            console.error('Password reset completion error:', error);
            return {
                success: false,
                error: error.message || 'Password reset failed'
            };
        }
    };

    // User Personal Ingestion Sync Token for Apple Pay & Google Pay Webhooks
    const ingestionKey = user
        ? `kore_sync_${user.$id}_${(user.$createdAt || 'active').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`
        : '';

    const getWebhookUrl = () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kore-finance.vercel.app';
        return `${origin}/api/quick-transaction`;
    };

    const getQuickLogUrl = (extraParams = {}) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kore-finance.vercel.app';
        const url = new URL(`${origin}/quick-log`);
        Object.entries(extraParams).forEach(([k, v]) => {
            if (v) url.searchParams.set(k, v);
        });
        return url.toString();
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            register,
            logout,
            loading,
            sendVerificationEmail,
            completeVerification,
            sendPasswordReset,
            completePasswordReset,
            checkSession, // Exposed for manual refresh
            ingestionKey,
            getWebhookUrl,
            getQuickLogUrl
        }}>
            {children}
        </AuthContext.Provider>
    );
};
