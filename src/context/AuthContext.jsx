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
            // Redirect back to the app's root url
            await account.createVerification(`${window.location.origin}/verify`);
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
            // Redirect back to the app's root url with type=recovery
            await account.createRecovery(email, `${window.location.origin}?type=recovery`);
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
            checkSession // Exposed for manual refresh
        }}>
            {children}
        </AuthContext.Provider>
    );
};
