import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { DollarSign, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CurrencySelector = ({ compact = false, placement = 'bottom' }) => {
    const { currency, changeCurrency, currencies } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            {compact ? (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 transition-all duration-300 group shadow-lg shadow-black/10"
                >
                    <span className="text-2xl">{currency.flag}</span>
                </motion.button>
            ) : (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 transition-all duration-300 group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                            <DollarSign size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Currency</p>
                            <p className="text-sm font-medium text-white flex items-center gap-2">
                                <span className="text-lg">{currency.flag}</span>
                                {currency.code}
                            </p>
                        </div>
                    </div>
                    <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        ></div>
                        <motion.div
                            initial={{ opacity: 0, y: placement === 'top' ? 10 : -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: placement === 'top' ? 10 : -10, scale: 0.95 }}
                            className={`absolute ${placement === 'top'
                                    ? 'bottom-full mb-2 origin-bottom'
                                    : 'top-full mt-2 origin-top'
                                } ${compact ? 'left-0 w-64' : 'left-0 right-0'
                                } bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50`}
                        >
                            <div className="p-2 max-h-80 overflow-y-auto">
                                {Object.values(currencies).map((curr) => (
                                    <button
                                        key={curr.code}
                                        onClick={() => {
                                            changeCurrency(curr.code);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currency.code === curr.code
                                            ? 'bg-indigo-500/20 text-white border border-indigo-500/30'
                                            : 'hover:bg-white/5 text-slate-300 hover:text-white'
                                            }`}
                                    >
                                        <span className="text-2xl">{curr.flag}</span>
                                        <div className="text-left flex-1">
                                            <p className="font-medium">{curr.code}</p>
                                            <p className="text-xs text-slate-500">{curr.name}</p>
                                        </div>
                                        <span className="text-slate-400">{curr.symbol}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
