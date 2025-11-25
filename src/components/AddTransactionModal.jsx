import React, { useState, useContext } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { useCurrency } from '../context/CurrencyContext';
import { X, Check, DollarSign, Calendar, Tag, FileText } from 'lucide-react';

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
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full md:w-[480px] bg-slate-900/70 backdrop-blur-3xl md:rounded-[2.5rem] rounded-t-[2.5rem] p-8 shadow-2xl shadow-black/50 border border-white/10 animate-slide-up md:animate-scale-in overflow-hidden">
                {/* Inner Glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-[2.5rem]" />

                <div className="relative z-10 flex items-center justify-between mb-8">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all duration-300"
                    >
                        <X size={24} strokeWidth={1.5} />
                    </button>

                    <h2 className="text-xl md:text-2xl font-sans font-bold text-white tracking-tight">Add Transaction</h2>

                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="p-2 bg-gradient-to-br from-purple-600 via-orange-500 to-red-500 rounded-full text-white shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 disabled:opacity-50 disabled:scale-100"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Check size={20} strokeWidth={2.5} />
                        )}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                    {/* Type Toggle */}
                    <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${type === 'expense' ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${type === 'income' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            Income
                        </button>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-widest mb-3 ml-1 transition-colors ${error ? 'text-rose-400' : 'text-indigo-300'}`}>
                            {error ? 'Amount Required' : 'Amount'}
                        </label>
                        <div className={`relative group ${error ? 'animate-shake' : ''}`}>
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors text-lg font-medium">
                                {currency.symbol}
                            </span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    if (e.target.value) setError(false);
                                }}
                                placeholder="0.00"
                                className={`w-full pl-20 pr-6 py-5 text-4xl font-bold text-white bg-slate-800/50 hover:bg-slate-800/70 rounded-2xl border focus:bg-slate-800/90 focus:outline-none transition-all placeholder:text-slate-600 shadow-inner shadow-black/20 ${error ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-indigo-500/50'}`}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Category & Date Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3 ml-1">Category</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Tag size={18} strokeWidth={1.5} />
                                </span>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-800/50 hover:bg-slate-800/70 rounded-xl border border-white/10 text-white font-medium focus:border-indigo-500/50 focus:bg-slate-800/90 focus:outline-none appearance-none transition-all shadow-inner shadow-black/20"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3 ml-1">Date</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Calendar size={18} strokeWidth={1.5} />
                                </span>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-800/50 hover:bg-slate-800/70 rounded-xl border border-white/10 text-white font-medium focus:border-indigo-500/50 focus:bg-slate-800/90 focus:outline-none transition-all [color-scheme:dark] shadow-inner shadow-black/20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3 ml-1">Note (Optional)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <FileText size={18} strokeWidth={1.5} />
                            </span>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="What was this for?"
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-800/50 hover:bg-slate-800/70 rounded-xl border border-white/10 text-white font-medium focus:border-indigo-500/50 focus:bg-slate-800/90 focus:outline-none transition-all placeholder:text-slate-600 shadow-inner shadow-black/20"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-4 rounded-2xl font-bold text-lg text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 mt-4 disabled:opacity-70 disabled:scale-100 ${type === 'expense' ? 'bg-gradient-to-r from-rose-500 to-rose-600 shadow-rose-500/25 border border-rose-400/20' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/25 border border-emerald-400/20'}`}
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check size={24} strokeWidth={2.5} />
                                Save Transaction
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export { AddTransactionModal };
