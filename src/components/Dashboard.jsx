import React, { useContext } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { useCurrency } from '../context/CurrencyContext';
import { formatMonthYear, formatMonthShort } from '../utils/date';
import { BudgetGraph } from './BudgetGraph';
import { SpendingDonut } from './SpendingDonut';
import { MonthSelector } from './MonthSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { History, RotateCcw, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Dashboard = () => {
    const {
        monthlyStats,
        selectedMonth,
        isCurrentMonth,
        goToCurrentMonth
    } = useContext(TransactionContext);

    const { formatAmount } = useCurrency();

    const isAllTime = selectedMonth === 'all';
    const isPastMonth = !isAllTime && !isCurrentMonth;

    const displayNet = isAllTime ? monthlyStats.allTimeBalance : monthlyStats.monthlyNet;
    const displayIncome = isAllTime ? monthlyStats.allTimeIncome : monthlyStats.monthlyIncome;
    const displayExpense = isAllTime ? monthlyStats.allTimeExpense : monthlyStats.monthlyExpense;

    // Animation variants
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            {/* Top Period Header Bar */}
            <motion.div
                variants={item}
                className="relative z-30 flex flex-row items-center justify-between gap-3 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[1.75rem] sm:rounded-[2rem] px-4 py-3 sm:px-6 sm:py-4 shadow-xl shadow-black/20"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-white tracking-tight truncate">
                            {isAllTime ? 'Complete History' : formatMonthYear(selectedMonth)}
                        </h2>
                    </div>
                </div>

                {/* Period Selector Controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <MonthSelector />
                </div>
            </motion.div>

            {/* Archive Notification Banner (If viewing historical month) */}
            <AnimatePresence>
                {isPastMonth && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    <History size={18} />
                                </div>
                                <div>
                                    <p className="text-xs sm:text-sm font-semibold text-amber-200">
                                        Looking back at {formatMonthYear(selectedMonth)}
                                    </p>
                                    <p className="text-[11px] text-amber-300/70">
                                        You are viewing closed historical metrics. Any edits to these dates will update this archive.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={goToCurrentMonth}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/30 transition-all active:scale-95 whitespace-nowrap"
                            >
                                <RotateCcw size={12} />
                                <span>Return to Current Month</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dashboard Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Net Balance Card - Large */}
                <motion.div
                    variants={item}
                    className="md:col-span-1 bg-slate-900/40 backdrop-blur-xl md:backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl shadow-black/20 relative overflow-hidden group flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase">
                                {isAllTime ? 'Cumulative Net' : ` Net Balance`}
                            </h3>
                        </div>

                        <div className="text-4xl md:text-5xl font-medium tracking-tight bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
                            {formatAmount(displayNet)}
                        </div>

                        {/* All-Time Lifetime Balance Indicator (When viewing a specific month) */}
                        {!isAllTime && (
                            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs">
                                <span>All-Time Wealth:</span>
                                <span className="font-medium tracking-tight bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">{formatAmount(monthlyStats.allTimeBalance)}</span>
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 grid grid-cols-2 gap-4 mt-8 pt-6">
                        <div>
                            <div className="flex items-center gap-1 text-slate-400 text-xs uppercase tracking-wider mb-1">
                                <span>Income</span>
                            </div>
                            <p className="text-lg font-medium text-emerald-400 drop-shadow-sm">
                                +{formatAmount(displayIncome)}
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center gap-1 text-slate-400 text-xs uppercase tracking-wider mb-1">
                                <span>Expense</span>
                            </div>
                            <p className="text-lg font-medium text-rose-400 drop-shadow-sm">
                                -{formatAmount(displayExpense)}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Spending Art (Donut) */}
                <motion.div
                    variants={item}
                    className="md:col-span-1 bg-slate-900/40 backdrop-blur-xl md:backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl shadow-black/20 relative overflow-hidden flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-medium text-sm md:text-base">Spending Art</h3>
                        <span className="text-[11px] text-slate-400 font-medium tracking-tight">
                            {formatMonthShort(selectedMonth)}
                        </span>
                    </div>
                    <div className="h-[180px]">
                        <SpendingDonut />
                    </div>
                </motion.div>

                {/* Daily Average (Small Card) */}
                <motion.div
                    variants={item}
                    className="md:col-span-1 bg-slate-900/40 backdrop-blur-xl md:backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl shadow-black/20 flex flex-col justify-center"
                >
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Daily Average</h3>
                        </div>
                        <p className="text-3xl font-medium tracking-tight bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent mt-2">
                            {formatAmount(monthlyStats.dailyAverage)}
                        </p>
                        <span className="text-[11px] text-slate-400 font-medium tracking-tight">
                            {formatMonthShort(selectedMonth)}
                        </span>
                    </div>
                </motion.div>

                {/* Trend Graph (Wide Bottom Card) */}
                <motion.div
                    variants={item}
                    className="md:col-span-3 bg-slate-900/40 backdrop-blur-xl md:backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl shadow-black/20 relative overflow-hidden min-h-[300px]"
                >
                    <BudgetGraph />
                </motion.div>
            </div>
        </motion.div>
    );
};

export { Dashboard };
export default Dashboard;

