import React, { useState, useContext } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { useCurrency } from '../context/CurrencyContext';
import { X, Check, Calendar, Tag, FileText, ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['Food', 'Rent', 'Salary', 'Freelance', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Other'];

const AddTransactionModal = ({ onClose }) => {
    const { addTransaction } = useContext(TransactionContext);
    const { currency } = useCurrency();
    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Food');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) === 0) {
            setError(true);
            return;
        }

        try {
            setIsLoading(true);
            setError(false);

            const newTransaction = {
                id: Math.floor(Math.random() * 100000000),
                type,
                amount: type === 'expense' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
                category,
                date,
                note
            };

            await addTransaction(newTransaction);

            // Reset and close
            setAmount('');
            setNote('');
            onClose();
        } catch (err) {
            console.error("Failed to add transaction", err);
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

                    <h2 className="text-lg font-semibold text-white tracking-tight">New Transaction</h2>

                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="p-2 -mr-2 hover:bg-white/10 rounded-full text-blue-400 font-semibold transition-colors disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <span className="text-lg">Save</span>
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
                        {/* Category */}
                        <div className="bg-white/5 rounded-2xl p-1 border border-white/5">
                            <div className="relative flex items-center px-4 py-3">
                                <div className="p-2 rounded-lg bg-white/5 mr-4 text-slate-400">
                                    <Tag size={20} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-0.5">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-transparent text-white font-medium focus:outline-none appearance-none text-base"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                                        ))}
                                    </select>
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
