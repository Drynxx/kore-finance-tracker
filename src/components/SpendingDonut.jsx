import React, { useContext, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { TransactionContext } from '../context/TransactionContext';
import { useCurrency } from '../context/CurrencyContext';
import { motion } from 'framer-motion';

const COLORS = ['#ef4444', '#f97316', '#8b5cf6', '#3b82f6', '#10b981'];

export const SpendingDonut = () => {
    const { transactions } = useContext(TransactionContext);
    const { formatAmount } = useCurrency();
    const [activeIndex, setActiveIndex] = useState(0);

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    const data = useMemo(() => {
        const categories = {};
        let total = 0;

        transactions.forEach(t => {
            if (t.amount < 0) {
                const amount = Math.abs(t.amount);
                categories[t.category] = (categories[t.category] || 0) + amount;
                total += amount;
            }
        });

        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 categories
    }, [transactions]);

    if (data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                No spending data
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-1 relative min-h-[140px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                        <defs>
                            {data.map((entry, index) => (
                                <filter key={`glow-${index}`} id={`glow-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            ))}
                        </defs>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={70}
                            paddingAngle={6}
                            dataKey="value"
                            stroke="none"
                            onMouseEnter={onPieEnter}
                            onClick={onPieEnter}
                            activeIndex={activeIndex}
                            activeShape={(props) => {
                                const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                                return (
                                    <g>
                                        <Sector
                                            cx={cx}
                                            cy={cy}
                                            innerRadius={innerRadius}
                                            outerRadius={outerRadius + 4} // Slight grow effect
                                            startAngle={startAngle}
                                            endAngle={endAngle}
                                            fill={fill}
                                            style={{ filter: `drop-shadow(0 0 8px ${fill})` }}
                                        />
                                    </g>
                                );
                            }}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    style={{ filter: `drop-shadow(0 0 4px ${COLORS[index % COLORS.length]})` }}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                backdropFilter: 'blur(12px)',
                                color: '#fff',
                                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
                            }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value) => formatAmount(value)}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                            {data[activeIndex]?.name || 'Total'}
                        </p>
                        <p className="text-white font-bold text-sm truncate max-w-[80px] drop-shadow-md">
                            {data[activeIndex] ? formatAmount(data[activeIndex].value).replace('RON', '').trim() : ''}
                            <span className="text-[10px] ml-0.5 text-slate-400">lei</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-2 flex justify-center gap-3">
                {data.slice(0, 2).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                        <span className="text-slate-300 truncate max-w-[60px]">{entry.name}</span>
                        <span className="text-white font-medium">{Math.round((entry.value / data.reduce((a, b) => a + b.value, 0)) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
