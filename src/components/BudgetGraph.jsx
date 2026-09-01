import React, { useContext, useMemo, useState, useEffect } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { generateCashFlowForecast, generateStatisticalForecast } from '../services/gemini';
import { useCurrency } from '../context/CurrencyContext';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export const BudgetGraph = () => {
    const { transactions } = useContext(TransactionContext);
    const { formatAmount } = useCurrency();
    const [forecastData, setForecastData] = useState([]);
    const [isLoadingForecast, setIsLoadingForecast] = useState(true);

    // 1. Calculate Historical Balance (Last 30 Days)
    const historicalData = useMemo(() => {
        if (!transactions || !transactions.length) return [];

        const currentBalance = transactions.reduce((sum, t) => {
            const amt = Math.abs(parseFloat(t.amount) || 0);
            return sum + (t.type === 'income' || t.amount > 0 ? amt : -amt);
        }, 0);

        const days = [];
        const today = new Date();
        let runningBalance = currentBalance;

        // Work backwards from today
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayTransactions = transactions.filter(t => t.date === dateStr);
            const dayNetChange = dayTransactions.reduce((sum, t) => {
                const amt = Math.abs(parseFloat(t.amount) || 0);
                return sum + (t.type === 'income' || t.amount > 0 ? amt : -amt);
            }, 0);

            days.unshift({
                date: dateStr,
                day: date.getDate(),
                balance: Math.round(runningBalance * 100) / 100,
                type: 'historical'
            });

            runningBalance -= dayNetChange;
        }
        return days;
    }, [transactions]);

    // 2. Fetch Forecast with statistical fallback
    useEffect(() => {
        let isMounted = true;

        const fetchForecast = async () => {
            if (!historicalData.length) {
                if (isMounted) setIsLoadingForecast(false);
                return;
            }

            const currentBalance = historicalData[historicalData.length - 1]?.balance || 0;

            try {
                const forecast = await generateCashFlowForecast(transactions, currentBalance);
                if (isMounted) {
                    if (Array.isArray(forecast) && forecast.length > 0) {
                        setForecastData(forecast.map(item => ({
                            date: item.date,
                            balance: parseFloat(item.balance) || currentBalance,
                            reason: item.reason || 'Estimated Spending',
                            type: 'predicted'
                        })));
                    } else {
                        // Fallback
                        const local = generateStatisticalForecast(transactions, currentBalance);
                        setForecastData(local.map(item => ({ ...item, type: 'predicted' })));
                    }
                }
            } catch (err) {
                if (isMounted) {
                    const local = generateStatisticalForecast(transactions, currentBalance);
                    setForecastData(local.map(item => ({ ...item, type: 'predicted' })));
                }
            } finally {
                if (isMounted) setIsLoadingForecast(false);
            }
        };

        fetchForecast();

        return () => {
            isMounted = false;
        };
    }, [transactions, historicalData]);

    // Combine Data: Ensure smooth connection
    const chartData = useMemo(() => {
        if (!historicalData.length) return [];
        return [...historicalData, ...forecastData];
    }, [historicalData, forecastData]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            if (!dataPoint) return null;

            return (
                <div className="bg-slate-900/95 backdrop-blur-xl p-3.5 rounded-xl border border-white/10 shadow-2xl text-left">
                    <p className="text-slate-400 text-xs mb-1 font-mono">{dataPoint.date}</p>
                    <p className="text-white font-bold text-base">
                        {formatAmount(dataPoint.balance || 0)}
                    </p>
                    {dataPoint.type === 'predicted' && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <span className="text-[11px] font-semibold text-cyan-300">
                                {dataPoint.reason || 'Estimated Trend'}
                            </span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    if (!transactions || transactions.length === 0) {
        return (
            <div className="w-full h-[240px] flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-sm font-medium text-slate-300">No transaction data yet</p>
                <p className="text-xs text-slate-500 mt-1">Log your first expense or income to see your 30-day cash flow forecast.</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full relative"
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-base font-semibold text-white tracking-tight">Cash Flow Forecast</h3>
                    <p className="text-xs text-slate-400">Past 30 Days + 30-Day Predictive Projection</p>
                </div>
                {isLoadingForecast && (
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="text-[11px] text-indigo-300 font-medium">Predicting...</span>
                    </div>
                )}
            </div>

            <div className="h-[200px] w-full">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                stroke="rgba(255,255,255,0.2)"
                                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                                tickFormatter={(date) => {
                                    try {
                                        return new Date(date).getDate();
                                    } catch {
                                        return '';
                                    }
                                }}
                                tickLine={false}
                                axisLine={false}
                                interval={5}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#818cf8"
                                strokeWidth={2}
                                fill="url(#colorBalance)"
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default BudgetGraph;
