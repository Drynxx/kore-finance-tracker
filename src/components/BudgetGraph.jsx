import React, { useContext, useMemo } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { useCurrency } from '../context/CurrencyContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export const BudgetGraph = () => {
    const { transactions } = useContext(TransactionContext);
    const { formatAmount } = useCurrency();

    const data = useMemo(() => {
        const days = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayTransactions = transactions.filter(t => t.date === dateStr);
            const spending = dayTransactions
                .filter(t => t.amount < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            days.push({
                date: dateStr,
                day: date.getDate(),
                spending: spending
            });
        }
        return days;
    }, [transactions]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-xl border border-white/10 shadow-xl">
                    <p className="text-slate-400 text-xs mb-1">{payload[0].payload.date}</p>
                    <p className="text-white font-bold text-lg">
                        {formatAmount(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full h-full"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white">30-Day Spending Trend</h3>
            </div>

            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="day"
                            stroke="rgba(255,255,255,0.3)"
                            tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }}
                            tickLine={false}
                            axisLine={false}
                            interval={6}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area
                            type="monotone"
                            dataKey="spending"
                            stroke="#818cf8"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorSpending)"
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', shadow: '0 0 20px #fff' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};
