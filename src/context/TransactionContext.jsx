import React, { createContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { databases, DATABASE_ID, COLLECTION_ID } from '../lib/appwrite';
import { ID, Query } from 'appwrite';

export const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

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
                    Query.orderDesc('date')
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

    return (
        <TransactionContext.Provider
            value={{
                transactions,
                addTransaction,
                deleteTransaction,
                loading
            }}
        >
            {children}
        </TransactionContext.Provider>
    );
};
