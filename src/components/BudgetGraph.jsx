import React, { useContext, useMemo } from 'react';
import { TransactionContext } from '../context/TransactionContext';
import { generateCashFlowForecast } from '../services/gemini';
import { useCurrency } from '../context/CurrencyContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export const BudgetGraph = () => {
    const { transactions } = useContext(TransactionContext);
    const { formatAmount } = useCurrency();
    const [forecastData, setForecastData] = React.useState([]);
    const [isLoadingForecast, setIsLoadingForecast] = React.useState(true);

    // 1. Calculate Historical Balance (Last 30 Days)
    const historicalData = useMemo(() => {
        if (!transactions.length) return [];

        // Calculate current total balance
        const currentBalance = transactions.reduce((sum, t) => {
            return sum + (t.type === 'income' ? t.amount : -Math.abs(t.amount));
        }, 0);

        const days = [];
        const today = new Date();
        let runningBalance = currentBalance;

        // Work backwards from today
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Find transactions for this specific day
            const dayTransactions = transactions.filter(t => t.date === dateStr);
            const dayNetChange = dayTransactions.reduce((sum, t) => {
                return sum + (t.type === 'income' ? t.amount : -Math.abs(t.amount));
            }, 0);

            days.unshift({
                date: dateStr,
                day: date.getDate(),
                balance: runningBalance,
                type: 'historical'
            });

            // Update running balance for the previous day
            runningBalance -= dayNetChange;
        }
        return days;
    }, [transactions]);

    // 2. Fetch AI Forecast
    React.useEffect(() => {
        const fetchForecast = async () => {
            if (historicalData.length > 0) {
                const currentBalance = historicalData[historicalData.length - 1].balance;
                const forecast = await generateCashFlowForecast(transactions, currentBalance);
                setForecastData(forecast.map(item => ({ ...item, type: 'predicted' })));
                setIsLoadingForecast(false);
            }
        };
        fetchForecast();
    }, [transactions, historicalData]);

    // Combine Data: Ensure smooth connection
    const chartData = useMemo(() => {
        if (!historicalData.length) return [];
        return [...historicalData, ...forecastData];
    }, [historicalData, forecastData]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-xl border border-white/10 shadow-xl">
                    <p className="text-slate-400 text-xs mb-1">{dataPoint.date}</p>
                    <p className="text-white font-bold text-lg">
                        {formatAmount(dataPoint.balance)}
                    </p>
                    {dataPoint.type === 'predicted' && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">AI Forecast</span>
                            {dataPoint.reason && <p className="text-xs text-slate-300 mt-1">{dataPoint.reason}</p>}
                        </div>
                    )}
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
            className="w-full h-full relative"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-medium text-white">Cash Flow Oracle</h3>
                    <p className="text-xs text-slate-400">Past 30 Days + AI Forecast</p>
                </div>
                {isLoadingForecast && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="text-xs text-indigo-300 font-medium">AI Predicting...</span>
                    </div>
                )}
            </div>

            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="rgba(255,255,255,0.3)"
                            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                            tickFormatter={(date) => new Date(date).getDate()}
                            tickLine={false}
                            axisLine={false}
                            interval={6}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />

                        {/* Historical Line */}
                        <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="#818cf8"
                            strokeWidth={2}
                            fill="url(#colorBalance)"
                            connectNulls
                        />

                        {/* Forecast Line (Overlay to show distinct color) */}
                        {/* Note: In a real split, we'd separate data. Here we rely on the tooltip to distinguish. 
                            To make the line visually distinct (dashed), we'd need complex data splitting. 
                            For MVP, we'll use a single continuous line but change color if possible, 
                            or just rely on the tooltip and header indicator. 
                            
                            Refinement: Let's split the data into two areas for visual distinction.
                        */}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};
