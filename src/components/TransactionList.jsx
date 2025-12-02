import React, { useContext, useState } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { useCurrency } from '../context/CurrencyContext';
import { getRelativeDateLabel } from '../utils/date';
import { Coffee, Home, Briefcase, Car, Smartphone, ShoppingCart, Utensils, Zap, Film, MoreHorizontal, Filter, Trash2 } from 'lucide-react';

const CATEGORY_ICONS = {
    Food: Utensils,
    Rent: Home,
    Salary: Briefcase,
    Freelance: Zap,
    Transport: Car,
    Entertainment: Film,
    Shopping: ShoppingCart,
    Utilities: Smartphone,
    Other: MoreHorizontal
};

const TransactionList = () => {
    const { transactions, deleteTransaction } = useContext(TransactionContext);
    const { formatAmount } = useCurrency();
    const [filter, setFilter] = useState('all');

    const filteredTransactions = transactions.filter(t => {
        if (filter === 'month') {
            const date = new Date(t.date);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }
        return true;
    });

    const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
        const date = transaction.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b) - new Date(a));

    return (
        <div className="space-y-8 pb-24 md:pb-0 animate-fade-in">
            {/* Header - Sticky Glass on Mobile */}
            <div className="sticky top-0 z-20 -mx-4 px-6 py-4 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 md:static md:bg-transparent md:backdrop-blur-none md:border-none md:p-0 md:mx-0 transition-all duration-300">
                <div className="flex items-end justify-between">
                    <div>
                        <h2 className="text-2xl md:text-4xl font-sans font-bold text-white tracking-tight drop-shadow-lg">History</h2>
                        <p className="text-slate-300 font-medium text-xs md:text-sm tracking-wide drop-shadow-md hidden md:block">Your financial footprint.</p>
                    </div>

                    <div className="flex bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/10">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-300 ${filter === 'all' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('month')}
                            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-300 ${filter === 'month' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                        >
                            Month
                        </button>
                    </div>
                </div>
            </div>

            {sortedDates.length > 0 ? (
                <div className="space-y-6 md:space-y-8 px-2 md:px-0">
                    {sortedDates.map(date => (
                        <div key={date} className="relative">
                            {/* Date Header - Floating Pill */}
                            <div className="sticky top-[4.5rem] md:top-0 z-10 flex justify-center md:justify-start mb-4 pointer-events-none">
                                <span className="px-4 py-1.5 rounded-full bg-slate-800/90 backdrop-blur-xl border border-white/10 text-xs font-bold uppercase tracking-widest text-slate-200 shadow-lg shadow-black/20">
                                    {getRelativeDateLabel(date)}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {groupedTransactions[date].map((transaction, index) => {
                                    const Icon = CATEGORY_ICONS[transaction.category] || MoreHorizontal;
                                    const isExpense = transaction.type === 'expense';

                                    return (
                                        <div
                                            key={transaction.id}
                                            className="group relative overflow-hidden rounded-2xl bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md border border-white/10 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98]"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            {/* Glass Reflection Gradient */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-50 pointer-events-none" />

                                            <div className="relative p-4 flex items-center gap-4">
                                                {/* Icon */}
                                                <div className={`p-3 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 text-white shadow-inner border border-white/10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                                                    <Icon size={22} strokeWidth={2} />
                                                </div>

                                                {/* Content Container */}
                                                <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                                                    {/* Category & Note */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between md:justify-start gap-2">
                                                            <p className="font-bold text-white text-base md:text-lg tracking-wide truncate drop-shadow-md">
                                                                {transaction.category}
                                                            </p>
                                                            {/* Mobile Amount */}
                                                            <p className={`md:hidden font-bold text-base tracking-wider drop-shadow-md ${isExpense ? 'text-white' : 'text-emerald-400'}`}>
                                                                {isExpense ? '-' : '+'}{formatAmount(Math.abs(transaction.amount))}
                                                            </p>
                                                        </div>
                                                        {transaction.note && (
                                                            <p className="text-xs md:text-sm text-slate-300 font-medium truncate mt-0.5 drop-shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
                                                                {transaction.note}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Desktop Amount & Actions */}
                                                    <div className="hidden md:flex items-center gap-6">
                                                        <p className={`font-semibold text-lg tracking-wider drop-shadow-md ${isExpense ? 'text-white' : 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]'}`}>
                                                            {isExpense ? '-' : '+'}{formatAmount(Math.abs(transaction.amount))}
                                                        </p>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteTransaction(transaction.id);
                                                            }}
                                                            className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                                                            title="Delete Transaction"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mobile Delete Button (Swipe-like) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteTransaction(transaction.id);
                                                }}
                                                className="md:hidden absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-l from-rose-600/80 to-transparent flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 opacity-50 bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 mx-4 md:mx-0">
                    <p className="font-sans font-light text-xl text-slate-400">No records found.</p>
                </div>
            )}
        </div>
    );
};

export { TransactionList };
