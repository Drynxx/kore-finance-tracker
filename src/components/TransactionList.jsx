import React, { useContext, useState } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { useCurrency } from '../context/CurrencyContext';
import { getRelativeDateLabel, formatMonthYear, formatMonthShort } from '../utils/date';
import { AddTransactionModal } from './AddTransactionModal';
import { MonthSelector } from './MonthSelector';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Coffee, Home, Briefcase, Car, Smartphone, ShoppingCart, Utensils,
    Zap, Film, MoreHorizontal, Filter, Trash2, Pencil, RotateCcw,
    Calendar, ArrowDownRight, ArrowUpRight, Wallet
} from 'lucide-react';

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
    const {
        transactions,
        monthlyTransactions,
        selectedMonth,
        setSelectedMonth,
        currentMonthKey,
        isCurrentMonth,
        goToCurrentMonth,
        monthlyStats,
        deleteTransaction
    } = useContext(TransactionContext);

    const { formatAmount } = useCurrency();
    const [editingTransaction, setEditingTransaction] = useState(null);

    const isAllTime = selectedMonth === 'all';
    const displayedTransactions = isAllTime ? transactions : monthlyTransactions;

    const groupedTransactions = displayedTransactions.reduce((groups, transaction) => {
        const date = transaction.date ? transaction.date.split('T')[0] : 'Unknown';
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b) - new Date(a));

    const activeIncome = isAllTime ? monthlyStats.allTimeIncome : monthlyStats.monthlyIncome;
    const activeExpense = isAllTime ? monthlyStats.allTimeExpense : monthlyStats.monthlyExpense;
    const activeNet = isAllTime ? monthlyStats.allTimeBalance : monthlyStats.monthlyNet;

    return (
        <div className="space-y-6 pb-24 md:pb-0 animate-fade-in">
            {/* Header & Controls */}
            <div className="relative z-30 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl shadow-black/20 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl md:text-3xl font-sans font-bold text-white tracking-tight drop-shadow-lg">
                                {isAllTime ? 'Complete History' : `${formatMonthYear(selectedMonth)} History`}
                            </h2>
                        </div>
                        <p className="text-slate-400 font-medium text-xs md:text-sm mt-0.5">
                            {isAllTime
                                ? `Showing all ${transactions.length} lifetime transactions.`
                                : `Showing ${displayedTransactions.length} transactions for ${formatMonthYear(selectedMonth)}.`}
                        </p>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <MonthSelector />

                        {/* All-Time Toggle Pill */}
                        <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/10">
                            <button
                                onClick={() => {
                                    if (isAllTime) {
                                        goToCurrentMonth();
                                    } else {
                                        setSelectedMonth('all');
                                    }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${isAllTime
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {isAllTime ? 'Viewing All' : 'Show All Time'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Period Summary Quick Stats Strip */}

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
                                            onClick={() => setEditingTransaction(transaction)}
                                            className="group relative overflow-hidden rounded-2xl bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md border border-white/10 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
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
                                                            <p className={`md:hidden font-medium tracking-tight text-base drop-shadow-md ${isExpense ? 'bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent' : 'bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text text-transparent'}`}>
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
                                                        <p className={`font-medium tracking-tight text-lg drop-shadow-md ${isExpense ? 'bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent' : 'bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text text-transparent'}`}>
                                                            {isExpense ? '-' : '+'}{formatAmount(Math.abs(transaction.amount))}
                                                        </p>


                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingTransaction(transaction);
                                                            }}
                                                            className="p-2.5 rounded-xl bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                                                            title="Edit Transaction"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteTransaction(transaction.id);
                                                            }}
                                                            className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 delay-75"
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
                <div className="text-center py-20 px-6 bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 mx-2 md:mx-0 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-4 shadow-lg">
                        <Calendar size={26} className="text-indigo-400" />
                    </div>
                    <p className="font-sans font-medium text-lg text-white">
                        {isAllTime
                            ? 'No transactions recorded yet'
                            : `No transactions in ${formatMonthYear(selectedMonth)}`}
                    </p>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm">
                        {isCurrentMonth
                            ? 'Start this monthly cycle by logging your first expense or income.'
                            : isAllTime
                                ? 'Add your first transaction using the + button.'
                                : 'No records exist for this historical month.'}
                    </p>
                    {!isCurrentMonth && (
                        <div className="flex items-center gap-3 mt-6">
                            <button
                                onClick={goToCurrentMonth}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all active:scale-95"
                            >
                                <RotateCcw size={13} />
                                <span>Go to Current Month</span>
                            </button>
                            <button
                                onClick={() => setSelectedMonth('all')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-all active:scale-95"
                            >
                                <span>View All Time</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {editingTransaction && (
                    <AddTransactionModal
                        transactionToEdit={editingTransaction}
                        onClose={() => setEditingTransaction(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export { TransactionList };
