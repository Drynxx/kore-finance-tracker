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
            <div className="flex items-end justify-between border-b border-white/5 pb-6">
                <div>
                    <h2 className="text-3xl md:text-4xl font-sans font-light text-white mb-1 tracking-tight">History</h2>
                    <p className="text-slate-400 font-light text-sm tracking-wide">Your financial footprint.</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setFilter('all')}
                        className={`text-sm font-medium transition-colors ${filter === 'all' ? 'text-indigo-300 border-b border-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        All Time
                    </button>
                    <button
                        onClick={() => setFilter('month')}
                        className={`text-sm font-medium transition-colors ${filter === 'month' ? 'text-indigo-300 border-b border-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        This Month
                    </button>
                </div>
            </div>

            {sortedDates.length > 0 ? (
                <div className="space-y-8">
                    {sortedDates.map(date => (
                        <div key={date}>
                            <h3 className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-4 pl-2 border-l-2 border-indigo-500/30">
                                {getRelativeDateLabel(date)}
                            </h3>
                            <div className="space-y-3">
                                {groupedTransactions[date].map((transaction, index) => {
                                    const Icon = CATEGORY_ICONS[transaction.category] || MoreHorizontal;
                                    const isExpense = transaction.type === 'expense';

                                    return (
                                        <div
                                            key={transaction.id}
                                            className="group relative overflow-hidden rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-300"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className="p-4 flex items-center gap-4">
                                                {/* Icon */}
                                                <div className={`p-3 rounded-xl bg-gradient-to-br from-white/10 to-white/5 text-slate-300 shadow-inner border border-white/5 flex-shrink-0`}>
                                                    <Icon size={20} strokeWidth={1.5} />
                                                </div>

                                                {/* Content Container */}
                                                <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                                                    {/* Category & Note */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between md:justify-start gap-2">
                                                            <p className="font-medium text-slate-200 text-base tracking-wide truncate">
                                                                {transaction.category}
                                                            </p>
                                                            {/* Mobile Amount (Visible on top row) */}
                                                            <p className={`md:hidden font-medium text-base tracking-wider ${isExpense ? 'text-slate-200' : 'text-emerald-400'}`}>
                                                                {isExpense ? '-' : '+'}{formatAmount(Math.abs(transaction.amount))}
                                                            </p>
                                                        </div>
                                                        {transaction.note && (
                                                            <p className="text-xs text-slate-500 font-light truncate mt-0.5 md:mt-0">
                                                                {transaction.note}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Desktop Amount & Actions */}
                                                    <div className="hidden md:flex items-center gap-6">
                                                        <p className={`font-light text-lg tracking-wider ${isExpense ? 'text-slate-200' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'}`}>
                                                            {isExpense ? '-' : '+'}{formatAmount(Math.abs(transaction.amount))}
                                                        </p>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteTransaction(transaction.id);
                                                            }}
                                                            className="p-2 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Delete Transaction"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mobile Delete Button (Swipe-like absolute position) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteTransaction(transaction.id);
                                                }}
                                                className="md:hidden absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-l from-rose-500/20 to-transparent flex items-center justify-center text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 opacity-50 bg-slate-900/20 rounded-[2.5rem] border border-white/5">
                    <p className="font-sans font-light text-xl text-slate-500">No records found.</p>
                </div>
            )}
        </div>
    );
};

export { TransactionList };
