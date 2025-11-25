import React, { useContext, useState } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { useCurrency } from '../context/CurrencyContext';
import { getRelativeDateLabel } from '../utils/date';
import { Coffee, Home, Briefcase, Car, Smartphone, ShoppingCart, Utensils, Zap, Film, MoreHorizontal, Filter } from 'lucide-react';

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
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-2xl shadow-black/20">
                    <div className="space-y-10">
                        {sortedDates.map(date => (
                            <div key={date}>
                                <h3 className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-6 pl-2 border-l-2 border-indigo-500/30">
                                    {getRelativeDateLabel(date)}
                                </h3>
                                <div className="space-y-4">
                                    {groupedTransactions[date].map((transaction, index) => {
                                        const Icon = CATEGORY_ICONS[transaction.category] || MoreHorizontal;
                                        const isExpense = transaction.type === 'expense';

                                        return (
                                            <div
                                                key={transaction.id}
                                                className="group flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all duration-300 cursor-default border border-transparent hover:border-white/5 relative overflow-hidden"
                                                style={{ animationDelay: `${index * 50}ms` }}
                                            >
                                                <div className="flex items-center gap-4 md:gap-5 min-w-0 flex-1">
                                                    <div className={`p-3 rounded-xl bg-white/5 text-slate-400 group-hover:text-white group-hover:bg-white/10 transition-all duration-300 shadow-inner shadow-white/5 flex-shrink-0`}>
                                                        <Icon size={20} strokeWidth={1.5} />
                                                    </div>
                                                    <div className="min-w-0 flex-1 pr-2">
                                                        <p className="font-medium text-slate-200 text-base tracking-wide truncate">{transaction.category}</p>
                                                        {transaction.note && (
                                                            <p className="text-xs text-slate-500 font-light mt-0.5 truncate">{transaction.note}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-3 md:gap-4 flex-shrink-0">
                                                    <p className={`font-light text-lg tracking-wider whitespace-nowrap ${isExpense ? 'text-slate-200' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'}`}>
                                                        {isExpense ? '-' : '+'}{formatAmount(Math.abs(transaction.amount))}
                                                    </p>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteTransaction(transaction.id);
                                                        }}
                                                        className="p-2 -mr-2 md:mr-0 text-rose-400/50 hover:text-rose-400 md:opacity-0 md:group-hover:opacity-100 transition-all"
                                                        aria-label="Delete transaction"
                                                    >
                                                        <span className="md:hidden text-xs uppercase tracking-wider font-medium">Del</span>
                                                        <span className="hidden md:inline text-xs uppercase tracking-wider">Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
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
