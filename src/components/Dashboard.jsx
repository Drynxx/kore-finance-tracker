import React, { useContext } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { useCurrency } from '../context/CurrencyContext';
import { BudgetGraph } from './BudgetGraph';
import { SpendingDonut } from './SpendingDonut';
import { motion } from 'framer-motion';

const Dashboard = () => {
    const { transactions } = useContext(TransactionContext);
    const { formatAmount } = useCurrency();

    const amounts = transactions.map(transaction => transaction.amount);
    const income = amounts
        .filter(item => item > 0)
        .reduce((acc, item) => acc + item, 0);

    const expense = (
        amounts.filter(item => item < 0).reduce((acc, item) => acc + item, 0) * -1
    );

    const totalBalance = income - expense;

    // Animation variants
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full"
        >
            {/* Net Balance Card - Large */}
            <motion.div
                variants={item}
                className="md:col-span-1 bg-slate-900/40 backdrop-blur-xl md:backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl shadow-black/20 relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500"></div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Net Balance</h3>
                        <div className="text-4xl md:text-5xl font-medium tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                            {formatAmount(totalBalance)}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Income</p>
                            <p className="text-lg font-medium text-emerald-400 drop-shadow-sm">{formatAmount(income)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Expense</p>
                            <p className="text-lg font-medium text-rose-400 drop-shadow-sm">{formatAmount(expense)}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Spending Art (Donut) */}
            <motion.div
                variants={item}
                className="md:col-span-1 bg-slate-900/40 backdrop-blur-xl md:backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl shadow-black/20 relative overflow-hidden"
            >
                <h3 className="text-white font-medium mb-4">Spending Art</h3>
                <div className="h-[180px]">
                    <SpendingDonut />
                </div>
            </motion.div>

            {/* Daily Average (Small Card) */}
            <motion.div
                variants={item}
                className="md:col-span-1 bg-slate-900/40 backdrop-blur-xl md:backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl shadow-black/20 flex flex-col justify-center"
            >
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Daily Average</h3>
                <p className="text-3xl font-medium text-white">{formatAmount(expense / 30)}</p>
                <p className="text-slate-500 text-sm mt-2">Last 30 days</p>
            </motion.div>

            {/* Trend Graph (Wide Bottom Card) */}
            <motion.div
                variants={item}
                className="md:col-span-3 bg-slate-900/40 backdrop-blur-xl md:backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl shadow-black/20 relative overflow-hidden min-h-[300px]"
            >
                <BudgetGraph />
            </motion.div>
        </motion.div>
    );
};

export { Dashboard };
