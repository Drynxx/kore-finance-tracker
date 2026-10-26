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
        goToCurrentMonth,
        selectedAccount,
        setSelectedAccount
    } = useContext(TransactionContext);

    const { formatAmount } = useCurrency();

    const isAllTime = selectedMonth === 'all';
    const isPastMonth = !isAllTime && !isCurrentMonth;

    const displayNet = isAllTime ? monthlyStats.totalNetWorth : monthlyStats.monthlyNet;
    const displayIncome = isAllTime ? monthlyStats.allTimeIncome : monthlyStats.monthlyIncome;
    const displayExpense = isAllTime ? monthlyStats.allTimeExpense : monthlyStats.monthlyExpense;
    const displayInvested = isAllTime ? monthlyStats.investedTotal : monthlyStats.monthlyInvested;

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

            {/* Asset Allocation & Pocket Cash Breakdown Bar */}
            <motion.div
                variants={item}
                className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 sm:p-5 shadow-xl shadow-black/20 relative overflow-hidden"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-indigo-400" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Asset Allocation</span>
                        <span className="hidden sm:inline text-slate-500">•</span>
                        <span className="text-xs text-slate-400 font-medium">
                            Net Worth: <strong className="text-white font-semibold">{formatAmount(monthlyStats.totalNetWorth)}</strong>
                        </span>
                    </div>
                    {selectedAccount && selectedAccount !== 'all' && (
                        <button
                            onClick={() => setSelectedAccount('all')}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors self-start sm:self-auto"
                        >
                            <RotateCcw size={11} /> Reset Filter
                        </button>
                    )}
                </div>

                {/* Visual Tripartite Allocation Bar */}
                <div className="w-full h-2 rounded-full bg-white/5 flex overflow-hidden gap-1 mb-3.5 p-0.5">
                    <div
                        className="h-full rounded-full bg-blue-500/90 transition-all duration-500"
                        style={{ width: `${Math.max(monthlyStats.bankPercent, monthlyStats.totalNetWorth > 0 ? 3 : 33)}%` }}
                        title={`Bank: ${monthlyStats.bankPercent}%`}
                    />
                    <div
                        className="h-full rounded-full bg-emerald-500/90 transition-all duration-500"
                        style={{ width: `${Math.max(monthlyStats.cashPercent, monthlyStats.totalNetWorth > 0 ? 3 : 33)}%` }}
                        title={`Pocket Cash: ${monthlyStats.cashPercent}%`}
                    />
                    <div
                        className="h-full rounded-full bg-indigo-500/90 transition-all duration-500"
                        style={{ width: `${Math.max(monthlyStats.investedPercent, monthlyStats.totalNetWorth > 0 ? 3 : 34)}%` }}
                        title={`Investments: ${monthlyStats.investedPercent}%`}
                    />
                </div>

                {/* Interactive Account Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Bank */}
                    <button
                        onClick={() => setSelectedAccount(selectedAccount === 'bank' ? 'all' : 'bank')}
                        className={`p-3 rounded-2xl border text-left transition-all duration-200 group active:scale-[0.98] ${
                            selectedAccount === 'bank'
                                ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                    >
                        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                            <span className="flex items-center gap-1.5 font-medium text-slate-300">
                                <span>💳</span> Bank (Card)
                            </span>
                            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                {monthlyStats.bankPercent}%
                            </span>
                        </div>
                        <div className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                            {formatAmount(monthlyStats.bankBalance)}
                        </div>
                    </button>

                    {/* Pocket Cash */}
                    <button
                        onClick={() => setSelectedAccount(selectedAccount === 'cash' ? 'all' : 'cash')}
                        className={`p-3 rounded-2xl border text-left transition-all duration-200 group active:scale-[0.98] ${
                            selectedAccount === 'cash'
                                ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                    >
                        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                            <span className="flex items-center gap-1.5 font-medium text-slate-300">
                                <span>💵</span> Pocket Cash
                            </span>
                            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                {monthlyStats.cashPercent}%
                            </span>
                        </div>
                        <div className="text-base sm:text-lg font-bold text-emerald-300 tracking-tight truncate">
                            {formatAmount(monthlyStats.cashBalance)}
                        </div>
                    </button>

                    {/* Investments */}
                    <button
                        onClick={() => setSelectedAccount(selectedAccount === 'investment' ? 'all' : 'investment')}
                        className={`p-3 rounded-2xl border text-left transition-all duration-200 group active:scale-[0.98] ${
                            selectedAccount === 'investment'
                                ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                    >
                        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                            <span className="flex items-center gap-1.5 font-medium text-slate-300">
                                <span>📈</span> Investments
                            </span>
                            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                {monthlyStats.investedPercent}%
                            </span>
                        </div>
                        <div className="text-base sm:text-lg font-bold text-indigo-300 tracking-tight truncate">
                            {formatAmount(monthlyStats.investedTotal)}
                        </div>
                    </button>
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
                                {isAllTime ? 'Total Net Worth' : `Net Balance`}
                            </h3>
                        </div>

                        <div className="text-4xl md:text-5xl font-medium tracking-tight bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
                            {formatAmount(displayNet)}
                        </div>

                        {/* Net Worth & Liquid Indicator (When viewing a specific month) */}
                        {!isAllTime && (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs">
                                    <span>Net Worth:</span>
                                    <span className="font-semibold text-white">{formatAmount(monthlyStats.totalNetWorth)}</span>
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs">
                                    <span>Liquid:</span>
                                    <span className="font-semibold text-white">{formatAmount(monthlyStats.liquidBalance)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-white/5">
                        <div>
                            <div className="flex items-center gap-1 text-slate-400 text-xs uppercase tracking-wider mb-1">
                                <span>Income</span>
                            </div>
                            <p className="text-lg font-medium text-emerald-400 drop-shadow-sm truncate">
                                +{formatAmount(displayIncome)}
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center gap-1 text-slate-400 text-xs uppercase tracking-wider mb-1">
                                <span>Expense</span>
                            </div>
                            <p className="text-lg font-medium text-rose-400 drop-shadow-sm truncate">
                                -{formatAmount(displayExpense)}
                            </p>
                        </div>
                        {displayInvested > 0 && (
                            <div className="col-span-2 pt-2 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-1 text-slate-400 text-xs uppercase tracking-wider">
                                    <span>📈 Invested Capital</span>
                                </div>
                                <p className="text-sm font-semibold text-indigo-300 drop-shadow-sm">
                                    {formatAmount(displayInvested)}
                                </p>
                            </div>
                        )}
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

