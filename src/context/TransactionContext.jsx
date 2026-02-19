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
            let allDocuments = [];
            let lastId = null;
            const BATCH_SIZE = 100; // Reduced from 5000 to Force Pagination & avoid timeouts
            let batchCount = 0;

            console.log("Starting Transaction Sync...");

            while (true) {
                batchCount++;
                console.log(`Fetching Batch ${batchCount}... (LastID: ${lastId})`);

                const queries = [
                    Query.equal('userId', user.$id),
                    Query.orderDesc('date'),
                    Query.limit(BATCH_SIZE)
                ];

                if (lastId) {
                    queries.push(Query.cursorAfter(lastId));
                }

                const response = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTION_ID,
                    queries
                );

                console.log(`Batch ${batchCount} received: ${response.documents.length} items.`);
                allDocuments = [...allDocuments, ...response.documents];

                if (response.documents.length < BATCH_SIZE) {
                    console.log("All transactions fetched. Total:", allDocuments.length);
                    break;
                }

                lastId = response.documents[response.documents.length - 1].$id;
            }

            // Transform Appwrite documents to our transaction format
            const transformedTransactions = allDocuments.map(doc => ({
                id: doc.$id,
                type: doc.type,
                amount: doc.amount,
                category: doc.category,
                date: doc.date,
                note: doc.note || ''
            }));

            setTransactions(transformedTransactions);
        } catch (error) {
            console.error('CRITICAL Error loading transactions:', error);
            // Don't wipe state on error, maybe keep old? For now, standard error handling
            // If we fail mid-loop, we might have partial data. 
            // Ideally we shouldn't setTransactions([]) unless it's a total failure.
            if (allDocuments.length > 0) {
                console.warn("Returning partial data due to error.");
                const transformedTransactions = allDocuments.map(doc => ({
                    id: doc.$id,
                    type: doc.type,
                    amount: doc.amount,
                    category: doc.category,
                    date: doc.date,
                    note: doc.note || ''
                }));
                setTransactions(transformedTransactions);
            } else {
                setTransactions([]);
            }
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

    return (
        <TransactionContext.Provider
            value={{
                transactions,
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
