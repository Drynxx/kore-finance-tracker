import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { useExportData } from '../hooks/useExportData';
import { useCurrency } from '../context/CurrencyContext';

const ExportButtons = ({ transactions }) => {
    const { currency } = useCurrency();
    const { exportToCSV, exportToPDF } = useExportData(transactions, currency);

    return (
        <div className="flex gap-3">
            <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-sm font-medium backdrop-blur-md group"
            >
                <FileSpreadsheet size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                Export CSV
            </button>
            <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-sm font-medium backdrop-blur-md group"
            >
                <FileText size={16} className="text-rose-400 group-hover:scale-110 transition-transform" />
                Export PDF
            </button>
        </div>
    );
};

export { ExportButtons };
