import React, { useState, useContext, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TransactionContext } from '../context/TransactionContext';
import { useCurrency } from '../context/CurrencyContext';
import { formatMonthYear, formatMonthShort } from '../utils/date';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MonthSelector = ({ className = '', showAllTimeOption = true }) => {
    const {
        selectedMonth,
        setSelectedMonth,
        currentMonthKey,
        isCurrentMonth,
        availableMonths,
        goToPreviousMonth,
        goToNextMonth,
        goToCurrentMonth,
        monthlyStats,
        transactions
    } = useContext(TransactionContext);

    const { formatAmount } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const dropdownRef = useRef(null);
    const mobileModalRef = useRef(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            // If click is inside the mobile modal, ignore
            if (mobileModalRef.current && mobileModalRef.current.contains(event.target)) {
                return;
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const isAllTime = selectedMonth === 'all';

    const renderPeriodList = (isMobileView = false) => (
        <>
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1.5 mb-2 border-b border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar size={13} className="text-indigo-400" />
                    Select Period
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                        {availableMonths.length} {availableMonths.length === 1 ? 'month' : 'months'}
                    </span>
                    {isMobileView && (
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                            aria-label="Close period selector"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Uniform Period List */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                {/* All Time Option (Uniform Row) */}
                {showAllTimeOption && (
                    <button
                        onClick={() => {
                            setSelectedMonth('all');
                            setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                            isAllTime
                                ? 'bg-indigo-500/20 border border-indigo-500/40 text-white shadow-sm'
                                : 'hover:bg-white/5 border border-transparent text-slate-300 hover:text-white'
                        }`}
                    >
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs tracking-tight truncate">
                                    All Time
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-tight">
                                {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
                            </p>
                        </div>

                        <div className="text-right flex items-center gap-2 pl-2">
                            <span className={`text-xs font-medium tracking-tight ${
                                monthlyStats.allTimeBalance > 0
                                    ? 'text-emerald-400'
                                    : monthlyStats.allTimeBalance < 0
                                    ? 'text-rose-400'
                                    : 'text-slate-400'
                            }`}>
                                {monthlyStats.allTimeBalance > 0 ? '+' : ''}{formatAmount(monthlyStats.allTimeBalance)}
                            </span>
                            {isAllTime && (
                                <Check size={14} className="text-indigo-400 flex-shrink-0" />
                            )}
                        </div>
                    </button>
                )}

                {/* Divider between All Time and Monthly list */}
                {showAllTimeOption && (
                    <div className="border-t border-white/[0.06] my-1" />
                )}

                {/* Monthly Rows */}
                {availableMonths.map((m) => {
                    const isSelected = selectedMonth === m.key;
                    const isCurrent = m.key === currentMonthKey;

                    return (
                        <button
                            key={m.key}
                            onClick={() => {
                                setSelectedMonth(m.key);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                                isSelected
                                    ? 'bg-indigo-500/20 border border-indigo-500/40 text-white shadow-sm'
                                    : 'hover:bg-white/5 border border-transparent text-slate-300 hover:text-white'
                            }`}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-xs tracking-tight truncate">
                                        {m.label}
                                    </span>
                                    {isCurrent && (
                                        <span
                                            className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block flex-shrink-0"
                                            title="Current Cycle"
                                        />
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-tight">
                                    {m.count} {m.count === 1 ? 'transaction' : 'transactions'}
                                </p>
                            </div>

                            {/* Net Cashflow indicator */}
                            <div className="text-right flex items-center gap-2 pl-2">
                                <span className={`text-xs font-medium tracking-tight ${
                                    m.net > 0
                                        ? 'text-emerald-400'
                                        : m.net < 0
                                        ? 'text-rose-400'
                                        : 'text-slate-400'
                                }`}>
                                    {m.net > 0 ? '+' : ''}{formatAmount(m.net)}
                                </span>
                                {isSelected && (
                                    <Check size={14} className="text-indigo-400 flex-shrink-0" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </>
    );

    return (
        <div className={`relative inline-flex items-center gap-1.5 sm:gap-2 z-40 ${className}`} ref={dropdownRef}>
            {/* Main Navigation Pill */}
            <div
                className={`flex items-center backdrop-blur-xl border rounded-2xl p-0.5 sm:p-1 transition-all duration-300 ${
                    isOpen
                        ? 'bg-slate-900/95 border-indigo-500/50 ring-2 ring-indigo-500/20 shadow-xl shadow-indigo-500/10'
                        : 'bg-slate-900/80 hover:bg-slate-900/90 border-white/[0.12] shadow-lg shadow-black/30'
                }`}
            >
                {/* Previous Month Button */}
                <button
                    onClick={goToPreviousMonth}
                    title="Previous month"
                    aria-label="Previous month"
                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/15 active:scale-90 transition-all duration-200"
                >
                    <ChevronLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>

                {/* Center Month Display & Popover Trigger */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl hover:bg-white/5 active:scale-[0.98] transition-all duration-200 group"
                    aria-expanded={isOpen}
                    title="Change viewing period"
                >
                    <div
                        className={`p-1 rounded-lg transition-colors ${
                            isOpen
                                ? 'bg-indigo-500/25 text-indigo-300'
                                : 'bg-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500/25'
                        }`}
                    >
                        <Calendar size={13} className="sm:w-[14px] sm:h-[14px]" />
                    </div>

                    <span className="font-semibold text-xs sm:text-sm text-white tracking-tight whitespace-nowrap">
                        <span className="inline sm:hidden">{isAllTime ? 'All Time' : formatMonthShort(selectedMonth)}</span>
                        <span className="hidden sm:inline">{isAllTime ? 'All Time' : formatMonthYear(selectedMonth)}</span>
                    </span>

                    <ChevronDown
                        size={12}
                        className={`transition-transform duration-300 sm:w-3.5 sm:h-3.5 ${
                            isOpen ? 'rotate-180 text-indigo-400' : 'text-slate-400 group-hover:text-white'
                        }`}
                    />
                </button>

                {/* Next Month Button */}
                <button
                    onClick={goToNextMonth}
                    title="Next month"
                    aria-label="Next month"
                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/15 active:scale-90 transition-all duration-200"
                >
                    <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
            </div>

            {/* Quick Reset to Current Month Button (Desktop only, when viewing archive/all-time) */}
            <AnimatePresence>
                {!isCurrentMonth && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -10 }}
                        transition={{ duration: 0.2 }}
                        onClick={goToCurrentMonth}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold backdrop-blur-xl shadow-lg shadow-indigo-500/10 transition-all active:scale-95"
                        title="Jump to current month"
                    >
                        <RotateCcw size={12} />
                        <span>Today</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Desktop Dropdown Popover (Anchored under bar) */}
            <div className="hidden sm:block">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="absolute top-full right-0 mt-2 z-[100] w-80 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/90 ring-1 ring-white/10 overflow-hidden"
                        >
                            {renderPeriodList(false)}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile Centered Screen Modal (Portaled to body for true screen centering) */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="sm:hidden fixed inset-0 z-[9999] flex items-center justify-center p-4">
                            {/* Backdrop: Full screen blur & darken */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => setIsOpen(false)}
                                className="fixed inset-0 bg-black/65 backdrop-blur-sm"
                                aria-hidden="true"
                            />

                            {/* Centered Modal Card */}
                            <motion.div
                                ref={mobileModalRef}
                                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="relative z-10 w-full max-w-[340px] bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3 shadow-2xl shadow-black/95 ring-1 ring-white/10 overflow-hidden flex flex-col max-h-[82vh]"
                            >
                                {renderPeriodList(true)}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default MonthSelector;
