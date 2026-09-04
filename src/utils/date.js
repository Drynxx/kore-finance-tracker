export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
};

export const getRelativeDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    return formatDate(dateString);
};

/**
 * Returns current month key in 'YYYY-MM' format (e.g. '2026-09')
 */
export const getCurrentMonthKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

/**
 * Safely extracts 'YYYY-MM' key from a date string (ISO or YYYY-MM-DD)
 */
export const getTransactionMonthKey = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}/.test(dateStr)) {
        return dateStr.slice(0, 7);
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

/**
 * Formats 'YYYY-MM' into 'September 2026'
 */
export const formatMonthYear = (monthKey) => {
    if (!monthKey || monthKey === 'all') return 'All Time';
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const date = new Date(year, monthIndex, 1);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
};

/**
 * Formats 'YYYY-MM' into 'Sep 2026'
 */
export const formatMonthShort = (monthKey) => {
    if (!monthKey || monthKey === 'all') return 'All Time';
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const date = new Date(year, monthIndex, 1);
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
};

/**
 * Gets previous month key 'YYYY-MM'
 */
export const getPreviousMonthKey = (monthKey) => {
    const key = (!monthKey || monthKey === 'all') ? getCurrentMonthKey() : monthKey;
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const prevDate = new Date(year, monthIndex - 1, 1);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Gets next month key 'YYYY-MM'
 */
export const getNextMonthKey = (monthKey) => {
    const key = (!monthKey || monthKey === 'all') ? getCurrentMonthKey() : monthKey;
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const nextDate = new Date(year, monthIndex + 1, 1);
    return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Returns total days in the specified month
 */
export const getDaysInMonth = (monthKey) => {
    if (!monthKey || monthKey === 'all') return 30;
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    return new Date(year, monthIndex + 1, 0).getDate();
};

/**
 * Returns elapsed days in the month (capped at today's day for current month)
 */
export const getDaysElapsedInMonth = (monthKey) => {
    if (!monthKey || monthKey === 'all') return 30;
    const currentKey = getCurrentMonthKey();
    const totalDays = getDaysInMonth(monthKey);
    if (monthKey === currentKey) {
        return Math.max(1, Math.min(new Date().getDate(), totalDays));
    }
    // If it's a past month, all days in that month elapsed
    if (monthKey < currentKey) {
        return totalDays;
    }
    // If it's future month, default to 1 to avoid division by zero
    return 1;
};

