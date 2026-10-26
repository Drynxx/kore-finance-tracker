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
import {
    syncPaymentTrackerSession,
    fetchPendingTransactions,
    addPaymentDetectedListener
} from '../services/paymentTracker';

// Helper to extract account from document or note tag
export const extractAccount = (doc) => {
    if (doc.account) return doc.account;
    if (doc.type === 'investment') return 'investment';
    const note = (doc.note || '').toLowerCase();
    if (note.includes('[#cash]') || note.includes('(cash)')) return 'cash';
    if (note.includes('[#investment]') || note.includes('(investment)')) return 'investment';
    return 'bank';
};

export const cleanNoteText = (note) => {
    return (note || '').replace(/\[#(cash|investment|bank)\]/gi, '').trim();
};

export const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
    const [selectedAccount, setSelectedAccount] = useState('all'); // 'all' | 'bank' | 'cash' | 'investment'
    const { user } = useAuth();

    const currentMonthKey = getCurrentMonthKey();
    const isCurrentMonth = selectedMonth === currentMonthKey;

    // Load transactions from Appwrite and sync background tracker when user changes
    useEffect(() => {
        if (user) {
            loadTransactions();
            syncPaymentTrackerSession(user);

            // Fetch any transactions collected by Android service while app was in background
            const checkPending = async () => {
                try {
                    const pending = await fetchPendingTransactions();
                    if (pending && pending.length > 0) {
                        for (const item of pending) {
                            const isIncome = item.type === 'income';
                            const signedAmount = isIncome ? Math.abs(item.amount) : -Math.abs(item.amount);
                            await addTransaction({
                                type: isIncome ? 'income' : (item.type || 'expense'),
                                account: item.account || 'bank',
                                amount: signedAmount,
                                category: item.category || (isIncome ? 'Salary' : 'Other'),
                                date: item.date || new Date().toISOString(),
                                note: item.note || `Auto-tracked from ${item.merchant || 'Google Pay'}`
                            });
                        }
                    }
                } catch (e) {
                    console.error('Error syncing pending payment notifications:', e);
                }
            };
            checkPending();

            // Listen for live payment notifications arriving while the app is foregrounded
            const listener = addPaymentDetectedListener((newTx) => {
                if (newTx && newTx.amount) {
                    const isIncome = newTx.type === 'income';
                    const signedAmount = isIncome ? Math.abs(newTx.amount) : -Math.abs(newTx.amount);
                    const txAccount = newTx.account || 'bank';
                    setTransactions((prev) => {
                        if (prev.some(t => t.id === newTx.id)) return prev;
                        return [{
                            id: newTx.id || String(Date.now()),
                            type: isIncome ? 'income' : (newTx.type || 'expense'),
                            account: txAccount,
                            amount: signedAmount,
                            category: newTx.category || (isIncome ? 'Salary' : 'Other'),
                            date: newTx.date || new Date().toISOString(),
                            note: cleanNoteText(newTx.note) || `Auto-tracked: ${newTx.merchant}`
                        }, ...prev];
                    });
                }
            });

            return () => {
                if (listener && typeof listener.remove === 'function') {
                    listener.remove();
                }
            };
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

            // Transform Appwrite documents to our transaction format with normalized signed amounts and account types
            const transformedTransactions = response.documents.map(doc => {
                const amt = parseFloat(doc.amount) || 0;
                const isIncome = doc.type ? doc.type === 'income' : amt > 0;
                const isInvest = doc.type === 'investment';
                const signedAmount = isIncome || isInvest ? Math.abs(amt) : -Math.abs(amt);
                const account = extractAccount(doc);

                return {
                    id: doc.$id,
                    type: doc.type || (isIncome ? 'income' : 'expense'),
                    account,
                    amount: signedAmount,
                    category: doc.category,
                    date: doc.date,
                    note: cleanNoteText(doc.note)
                };
            });

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
            const account = transaction.account || (transaction.type === 'investment' ? 'investment' : 'bank');
            const cleanNote = cleanNoteText(transaction.note);

            let docData = {
                userId: user.$id,
                type: transaction.type,
                amount: transaction.amount,
                category: transaction.category,
                date: transaction.date,
                note: cleanNote
            };

            // Attempt native account attribute if not bank
            if (account !== 'bank') {
                docData.account = account;
            }

            let response;
            try {
                response = await databases.createDocument(
                    DATABASE_ID,
                    COLLECTION_ID,
                    ID.unique(),
                    docData
                );
            } catch (err) {
                // If Appwrite throws attribute not found for 'account', fallback to embedding tag in note
                if (docData.account && (err?.message?.includes('account') || err?.code === 400)) {
                    delete docData.account;
                    docData.note = `${cleanNote} [#${account}]`.trim();
                    response = await databases.createDocument(
                        DATABASE_ID,
                        COLLECTION_ID,
                        ID.unique(),
                        docData
                    );
                } else {
                    throw err;
                }
            }

            // Add to local state
            const newTransaction = {
                id: response.$id,
                type: response.type,
                account,
                amount: response.amount,
                category: response.category,
                date: response.date,
                note: cleanNote
            };

            setTransactions(prev => [newTransaction, ...prev]);
            return newTransaction;
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
            const account = updatedData.account || (updatedData.type === 'investment' ? 'investment' : 'bank');
            const cleanNote = cleanNoteText(updatedData.note);

            let docData = {
                type: updatedData.type,
                amount: updatedData.amount,
                category: updatedData.category,
                date: updatedData.date,
                note: cleanNote
            };

            if (account !== 'bank') {
                docData.account = account;
            }

            let response;
            try {
                response = await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_ID,
                    id,
                    docData
                );
            } catch (err) {
                if (docData.account && (err?.message?.includes('account') || err?.code === 400)) {
                    delete docData.account;
                    docData.note = `${cleanNote} [#${account}]`.trim();
                    response = await databases.updateDocument(
                        DATABASE_ID,
                        COLLECTION_ID,
                        id,
                        docData
                    );
                } else {
                    throw err;
                }
            }

            // Update local state
            setTransactions(prev => prev.map(t =>
                t.id === id ? { ...t, ...docData, account, note: cleanNote } : t
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
            const isInc = t.type ? t.type === 'income' : amt > 0;
            if (isInc) {
                monthData.income += Math.abs(amt);
            } else if (t.type !== 'investment') {
                monthData.expense += Math.abs(amt);
            }
            monthData.net = monthData.income - monthData.expense;
        });

        // Sort descending (newest month first)
        return Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
    }, [transactions, currentMonthKey]);

    // Transactions filtered by the selected period and optional account
    const monthlyTransactions = useMemo(() => {
        let list = (!selectedMonth || selectedMonth === 'all')
            ? transactions
            : transactions.filter(t => getTransactionMonthKey(t.date) === selectedMonth);

        if (selectedAccount && selectedAccount !== 'all') {
            if (selectedAccount === 'investment') {
                list = list.filter(t => t.type === 'investment' || t.account === 'investment');
            } else {
                list = list.filter(t => (t.account || 'bank') === selectedAccount);
            }
        }
        return list;
    }, [transactions, selectedMonth, selectedAccount]);

    // Calculate metrics for selected period, all-time, and asset allocations
    const monthlyStats = useMemo(() => {
        // Selected period totals
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        let monthlyInvested = 0;

        const periodTxs = (!selectedMonth || selectedMonth === 'all')
            ? transactions
            : transactions.filter(t => getTransactionMonthKey(t.date) === selectedMonth);

        periodTxs.forEach(t => {
            const amt = Math.abs(parseFloat(t.amount) || 0);
            if (t.type === 'income') {
                monthlyIncome += amt;
            } else if (t.type === 'investment') {
                monthlyInvested += amt;
            } else {
                // 'expense' or fallback
                monthlyExpense += amt;
            }
        });

        const monthlyNet = monthlyIncome - monthlyExpense;
        const daysElapsed = getDaysElapsedInMonth(selectedMonth);
        const dailyAverage = monthlyExpense / Math.max(daysElapsed, 1);

        const savingsRate = monthlyIncome > 0
            ? Math.min(100, Math.max(0, Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100)))
            : 0;

        // All-time asset balances across ALL transactions
        let bankBalance = 0;
        let cashBalance = 0;
        let investedTotal = 0;
        let allTimeIncome = 0;
        let allTimeExpense = 0;

        transactions.forEach(t => {
            const amt = Math.abs(parseFloat(t.amount) || 0);
            const account = t.account || 'bank';
            const isInc = t.type ? t.type === 'income' : (parseFloat(t.amount) || 0) > 0;

            if (t.type === 'investment') {
                investedTotal += amt;
                if (account === 'cash') {
                    cashBalance -= amt;
                } else {
                    bankBalance -= amt;
                }
            } else if (t.type === 'transfer') {
                if (account === 'cash') {
                    cashBalance -= amt;
                    bankBalance += amt;
                } else {
                    bankBalance -= amt;
                    cashBalance += amt;
                }
            } else if (isInc) {
                allTimeIncome += amt;
                if (account === 'cash') {
                    cashBalance += amt;
                } else {
                    bankBalance += amt;
                }
            } else {
                // Regular expense
                allTimeExpense += amt;
                if (account === 'cash') {
                    cashBalance -= amt;
                } else {
                    bankBalance -= amt;
                }
            }
        });

        const liquidBalance = bankBalance + cashBalance;
        const totalNetWorth = liquidBalance + investedTotal;

        // Asset allocation percentages
        const positiveWealth = Math.max(totalNetWorth, 1);
        const bankPercent = totalNetWorth > 0 ? Math.round((Math.max(0, bankBalance) / positiveWealth) * 100) : 0;
        const cashPercent = totalNetWorth > 0 ? Math.round((Math.max(0, cashBalance) / positiveWealth) * 100) : 0;
        const investedPercent = totalNetWorth > 0 ? Math.round((Math.max(0, investedTotal) / positiveWealth) * 100) : 0;

        return {
            monthlyIncome,
            monthlyExpense,
            monthlyInvested,
            monthlyNet,
            dailyAverage,
            savingsRate,
            allTimeBalance: liquidBalance,
            allTimeIncome,
            allTimeExpense,
            bankBalance,
            cashBalance,
            investedTotal,
            liquidBalance,
            totalNetWorth,
            bankPercent,
            cashPercent,
            investedPercent,
            daysElapsed
        };
    }, [transactions, selectedMonth]);

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
                selectedAccount,
                setSelectedAccount,
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

