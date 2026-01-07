import React, { useState, useContext, useEffect } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { useCurrency } from '../context/CurrencyContext';
import { suggestCategory } from '../services/gemini';
import { X, Check, Calendar, Tag, FileText, ArrowUpCircle, ArrowDownCircle, Loader2, Plus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transactionSchema } from '../schemas/transaction';
import { z } from 'zod';

const CATEGORIES = ['Food', 'Rent', 'Salary', 'Freelance', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Other'];

const AddTransactionModal = ({ onClose, transactionToEdit = null }) => {
    const { addTransaction, updateTransaction } = useContext(TransactionContext);
    const { currency } = useCurrency();
    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(''); // Empty initially to prompt search/select
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    const [isAiThinking, setIsAiThinking] = useState(false);

    // Load data if editing
    useEffect(() => {
        if (transactionToEdit) {
            setType(transactionToEdit.type);
            setAmount(Math.abs(transactionToEdit.amount).toString());
            setCategory(transactionToEdit.category);
            setDate(transactionToEdit.date.split('T')[0]);
            setNote(transactionToEdit.note || '');
        }
    }, [transactionToEdit]);

    // AI Auto-Match Logic (Debounced Gemini) - Only run if NOT editing initially or if user changes note
    useEffect(() => {
        if (!note.trim() || (transactionToEdit && note === transactionToEdit.note)) return;

        const timer = setTimeout(async () => {
            setIsAiThinking(true);
            const suggested = await suggestCategory(note, CATEGORIES);
            if (suggested) {
                setCategory(suggested);
            }
            setIsAiThinking(false);
        }, 800); // Wait 800ms after typing stops

        return () => clearTimeout(timer);
    }, [note]);



    // ... imports remain the same ...

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setIsLoading(true);
            setError(false);

            // 1. Prepare data
            const rawData = {
                type,
                amount: parseFloat(amount),
                category,
                date,
                note: note.trim() || undefined // Zod optional expects undefined or missing, not empty string usually, but checking schema
            };

            // 2. Validate with Zod
            const validatedData = transactionSchema.parse(rawData);

            // 3. Process Amount (Sign based on type)
            const finalAmount = validatedData.type === 'expense'
                ? -Math.abs(validatedData.amount)
                : Math.abs(validatedData.amount);

            const transactionPayload = {
                type: validatedData.type,
                amount: finalAmount,
                category: validatedData.category,
                date: validatedData.date,
                note: validatedData.note
            };

            if (transactionToEdit) {
                await updateTransaction(transactionToEdit.id, transactionPayload);
            } else {
                await addTransaction({
                    id: Math.floor(Math.random() * 100000000),
                    ...transactionPayload
                });
            }

            // Reset and close
            setAmount('');
            setNote('');
            setCategory(''); // Clear category too
            onClose();
        } catch (err) {
            console.error("Failed to add transaction", err);
            if (err instanceof z.ZodError) {
                // For now, just show the first error. 
                // In a real app we'd map these to specific fields.
                alert(err.errors[0].message);
                setError(true);
            } else {
                alert("Failed to save transaction. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full h-full md:h-auto md:w-[500px] bg-slate-900/95 md:bg-slate-900/80 backdrop-blur-2xl md:rounded-[2.5rem] rounded-none shadow-2xl border-t md:border border-white/10 overflow-hidden flex flex-col"
            >
                {/* Header - iOS Style for Mobile Safety */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl z-20 sticky top-0">
                    <button
                        onClick={onClose}
                        className="p-2 -ml-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <span className="md:hidden text-lg font-medium text-blue-400">Cancel</span>
                        <X size={24} className="hidden md:block" />
                    </button>

                    <h2 className="text-lg font-semibold text-white tracking-tight">
                        {transactionToEdit ? 'Edit Transaction' : 'New Transaction'}
                    </h2>

                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="p-2 -mr-2 hover:bg-white/10 rounded-full text-blue-400 font-semibold transition-colors disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <span className="text-lg">{transactionToEdit ? 'Update' : 'Save'}</span>
                        )}
                    </button>
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Type Toggle - Subtle Segmented Control */}
                    <div className="bg-white/5 p-1 rounded-xl flex">
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${type === 'expense' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${type === 'income' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            Income
                        </button>
                    </div>

                    {/* Amount Input - Clean & Minimal */}
                    <div className="text-center space-y-2 py-4">
                        <div className={`relative flex items-center justify-center ${error ? 'animate-shake' : ''}`}>
                            <span className="text-3xl font-light text-slate-500 mr-2">{currency.symbol}</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    if (e.target.value) setError(false);
                                }}
                                placeholder="0"
                                className="w-48 bg-transparent text-6xl font-light text-white text-center focus:outline-none placeholder:text-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-rose-400 text-xs font-medium">Please enter an amount</p>}
                    </div>

                    {/* Details Grid - Soft Glass Cards */}
                    <div className="space-y-4">
                        {/* Category - Smart Combobox */}
                        <div className="bg-white/5 rounded-2xl p-1 border border-white/5 z-20 relative">
                            <div className="relative flex items-center px-4 py-3">
                                <div className="p-2 rounded-lg bg-white/5 mr-4 text-slate-400">
                                    <Tag size={20} />
                                </div>
                                <div className="flex-1 relative">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <label className="block text-xs font-medium text-slate-500">Category</label>
                                        {isAiThinking && (
                                            <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
                                                <Sparkles size={10} className="animate-spin-slow" />
                                                AI Matching...
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            onFocus={() => setIsCategoryOpen(true)}
                                            onBlur={() => setTimeout(() => setIsCategoryOpen(false), 200)}
                                            placeholder="Search or create..."
                                            className="w-full bg-transparent text-white font-medium focus:outline-none placeholder:text-slate-600 text-base"
                                        />

                                        {/* Dropdown Options */}
                                        {isCategoryOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto z-50">
                                                {CATEGORIES.filter(c => c.toLowerCase().includes(category.toLowerCase())).map(cat => (
                                                    <button
                                                        key={cat}
                                                        onClick={() => setCategory(cat)}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-between"
                                                    >
                                                        {cat}
                                                        {category === cat && <Check size={14} className="text-emerald-400" />}
                                                    </button>
                                                ))}

                                                {/* Create New Option */}
                                                {category && !CATEGORIES.includes(category) && (
                                                    <button
                                                        onClick={() => setCategory(category)} // Just confirms the custom text
                                                        className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-2 border-t border-white/5"
                                                    >
                                                        <Plus size={14} />
                                                        Create "{category}"
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Date */}
                        <div className="bg-white/5 rounded-2xl p-1 border border-white/5">
                            <div className="relative flex items-center px-4 py-3">
                                <div className="p-2 rounded-lg bg-white/5 mr-4 text-slate-400">
                                    <Calendar size={20} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-0.5">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-transparent text-white font-medium focus:outline-none text-base [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Note */}
                        <div className="bg-white/5 rounded-2xl p-1 border border-white/5">
                            <div className="relative flex items-center px-4 py-3">
                                <div className="p-2 rounded-lg bg-white/5 mr-4 text-slate-400">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-0.5">Note</label>
                                    <input
                                        type="text"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Optional description"
                                        className="w-full bg-transparent text-white font-medium focus:outline-none placeholder:text-slate-600 text-base"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export { AddTransactionModal };
