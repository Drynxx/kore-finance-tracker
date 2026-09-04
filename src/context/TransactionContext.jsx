import React, { createContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { databases, DATABASE_ID, COLLECTION_ID } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import {
    getCurrentMonthKey,
    getTransactionMonthKey,
    formatMonthYear,
    formatMonthShort,
    getPreviousMonthKey,
    getNextMonthKey,
    getDaysElapsedInMonth
} from '../utils/date';

export const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
    const { user } = useAuth();

    const currentMonthKey = getCurrentMonthKey();
    const isCurrentMonth = selectedMonth === currentMonthKey;

    // Load transactions from Appwrite when user changes
    useEffect(() => {
        if (user) {
            loadTransactions();
        } else {
            setTransactions([]);
            setLoading(false);
        }
    }, [user]);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID,
                [
                    Query.equal('userId', user.$id),
                    Query.orderDesc('date'),
                    Query.limit(5000)
                ]
            );

            // Transform Appwrite documents to our transaction format
            const transformedTransactions = response.documents.map(doc => ({
                id: doc.$id,
                type: doc.type,
                amount: doc.amount,
                category: doc.category,
                date: doc.date,
                note: doc.note || ''
            }));

            setTransactions(transformedTransactions);
        } catch (error) {
            console.error('Error loading transactions:', error);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    const addTransaction = async (transaction) => {
        try {
            const docData = {
                userId: user.$id,
                type: transaction.type,
                amount: transaction.amount,
                category: transaction.category,
                date: transaction.date,
                note: transaction.note || ''
            };

            const response = await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID,
                ID.unique(),
                docData
            );

            // Add to local state
            const newTransaction = {
                id: response.$id,
                type: response.type,
                amount: response.amount,
                category: response.category,
                date: response.date,
                note: response.note || ''
            };

            setTransactions(prev => [newTransaction, ...prev]);
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    };

    const deleteTransaction = async (id) => {
        try {
            await databases.deleteDocument(
                DATABASE_ID,
                COLLECTION_ID,
                id
            );

            // Remove from local state
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    };

    const updateTransaction = async (id, updatedData) => {
        try {
            const docData = {
                type: updatedData.type,
                amount: updatedData.amount,
                category: updatedData.category,
                date: updatedData.date,
                note: updatedData.note || ''
            };

            const response = await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID,
                id,
                docData
            );

            // Update local state
            setTransactions(prev => prev.map(t =>
                t.id === id ? { ...t, ...docData } : t
            ));
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    };

    // Calculate available historical months from transactions + current month
    const availableMonths = useMemo(() => {
        const monthMap = new Map();

        // Always ensure the current month exists
        monthMap.set(currentMonthKey, {
            key: currentMonthKey,
            label: formatMonthYear(currentMonthKey),
            shortLabel: formatMonthShort(currentMonthKey),
            count: 0,
            income: 0,
            expense: 0,
            net: 0,
            isCurrent: true
        });

        // Group transaction stats by month
        transactions.forEach(t => {
            const key = getTransactionMonthKey(t.date);
            if (!key) return;

            if (!monthMap.has(key)) {
                monthMap.set(key, {
                    key,
                    label: formatMonthYear(key),
                    shortLabel: formatMonthShort(key),
                    count: 0,
                    income: 0,
                    expense: 0,
                    net: 0,
                    isCurrent: key === currentMonthKey
                });
            }

            const monthData = monthMap.get(key);
            monthData.count += 1;
            const amt = parseFloat(t.amount) || 0;
            if (amt > 0 || t.type === 'income') {
                monthData.income += Math.abs(amt);
            } else {
                monthData.expense += Math.abs(amt);
            }
            monthData.net = monthData.income - monthData.expense;
        });

        // Sort descending (newest month first)
        return Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
    }, [transactions, currentMonthKey]);

    // Transactions filtered by the selected period
    const monthlyTransactions = useMemo(() => {
        if (!selectedMonth || selectedMonth === 'all') {
            return transactions;
        }
        return transactions.filter(t => getTransactionMonthKey(t.date) === selectedMonth);
    }, [transactions, selectedMonth]);

    // Calculate metrics for selected period & all-time
    const monthlyStats = useMemo(() => {
        // Selected period totals
        const mAmounts = monthlyTransactions.map(t => {
            const amt = parseFloat(t.amount) || 0;
            return (t.type === 'income' || amt > 0) ? Math.abs(amt) : -Math.abs(amt);
        });

        const monthlyIncome = mAmounts
            .filter(a => a > 0)
            .reduce((acc, a) => acc + a, 0);

        const monthlyExpense = mAmounts
            .filter(a => a < 0)
            .reduce((acc, a) => acc + Math.abs(a), 0);

        const monthlyNet = monthlyIncome - monthlyExpense;

        const daysElapsed = getDaysElapsedInMonth(selectedMonth);
        const dailyAverage = monthlyExpense / Math.max(daysElapsed, 1);

        const savingsRate = monthlyIncome > 0
            ? Math.max(0, Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100))
            : 0;

        // All-time totals
        const allAmounts = transactions.map(t => {
            const amt = parseFloat(t.amount) || 0;
            return (t.type === 'income' || amt > 0) ? Math.abs(amt) : -Math.abs(amt);
        });

        const allTimeIncome = allAmounts
            .filter(a => a > 0)
            .reduce((acc, a) => acc + a, 0);

        const allTimeExpense = allAmounts
            .filter(a => a < 0)
            .reduce((acc, a) => acc + Math.abs(a), 0);

        const allTimeBalance = allTimeIncome - allTimeExpense;

        return {
            monthlyIncome,
            monthlyExpense,
            monthlyNet,
            dailyAverage,
            savingsRate,
            allTimeBalance,
            allTimeIncome,
            allTimeExpense,
            daysElapsed
        };
    }, [monthlyTransactions, transactions, selectedMonth]);

    // Period Navigation Helpers
    const goToPreviousMonth = () => {
        if (selectedMonth === 'all') {
            setSelectedMonth(currentMonthKey);
            return;
        }
        setSelectedMonth(getPreviousMonthKey(selectedMonth));
    };

    const goToNextMonth = () => {
        if (selectedMonth === 'all') {
            setSelectedMonth(currentMonthKey);
            return;
        }
        setSelectedMonth(getNextMonthKey(selectedMonth));
    };

    const goToCurrentMonth = () => {
        setSelectedMonth(currentMonthKey);
    };

    return (
        <TransactionContext.Provider
            value={{
                transactions,
                allTransactions: transactions,
                monthlyTransactions,
                selectedMonth,
                setSelectedMonth,
                currentMonthKey,
                isCurrentMonth,
                availableMonths,
                monthlyStats,
                goToPreviousMonth,
                goToNextMonth,
                goToCurrentMonth,
                addTransaction,
                deleteTransaction,
                updateTransaction,
                loading
            }}
        >
            {children}
        </TransactionContext.Provider>
    );
};

