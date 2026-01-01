import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { account } from '../lib/appwrite';

const CurrencyContext = createContext();

export const useCurrency = () => useContext(CurrencyContext);

const CURRENCIES = {
    USD: { symbol: '$', name: 'US Dollar', code: 'USD', flag: '🇺🇸' },
    EUR: { symbol: '€', name: 'Euro', code: 'EUR', flag: '🇪🇺' },
    GBP: { symbol: '£', name: 'British Pound', code: 'GBP', flag: '🇬🇧' },
    JPY: { symbol: '¥', name: 'Japanese Yen', code: 'JPY', flag: '🇯🇵' },
    CAD: { symbol: 'C$', name: 'Canadian Dollar', code: 'CAD', flag: '🇨🇦' },
    AUD: { symbol: 'A$', name: 'Australian Dollar', code: 'AUD', flag: '🇦🇺' },
    CHF: { symbol: 'CHF', name: 'Swiss Franc', code: 'CHF', flag: '🇨🇭' },
    CNY: { symbol: '¥', name: 'Chinese Yuan', code: 'CNY', flag: '🇨🇳' },
    RON: { symbol: 'RON', name: 'Romanian Leu', code: 'RON', flag: '🇷🇴' },
    HUF: { symbol: 'Ft', name: 'Hungarian Forint', code: 'HUF', flag: '🇭🇺' }
};

export const CurrencyProvider = ({ children }) => {
    const { user } = useAuth();
    const [currency, setCurrency] = useState(CURRENCIES.RON);

    // Sync with Appwrite User Preferences
    useEffect(() => {
        if (user?.prefs?.currency && CURRENCIES[user.prefs.currency]) {
            setCurrency(CURRENCIES[user.prefs.currency]);
        }
    }, [user]);

    const changeCurrency = async (currencyCode) => {
        if (CURRENCIES[currencyCode]) {
            // Optimistic update
            setCurrency(CURRENCIES[currencyCode]);

            if (user) {
                try {
                    await account.updatePrefs({
                        ...user.prefs,
                        currency: currencyCode
                    });
                } catch (error) {
                    console.error('Failed to update currency preference:', error);
                }
            }
        }
    };

    const formatAmount = (amount) => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        // Special handling for RON to ensure negative sign is visible and standard
        if (currency.code === 'RON') {
            const absAmount = Math.abs(numAmount);
            const formatted = new Intl.NumberFormat('ro-RO', {
                style: 'currency',
                currency: 'RON',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(absAmount);

            return numAmount < 0 ? `-${formatted}` : formatted;
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numAmount);
    };

    return (
        <CurrencyContext.Provider value={{ currency, changeCurrency, formatAmount, currencies: CURRENCIES }}>
            {children}
        </CurrencyContext.Provider>
    );
};
