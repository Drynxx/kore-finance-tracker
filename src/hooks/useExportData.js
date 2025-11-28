import { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const useExportData = (transactions, currency = { code: 'USD', symbol: '$' }) => {

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.code,
        }).format(amount);
    };

    const exportToCSV = useCallback(() => {
        if (!transactions || transactions.length === 0) return;

        const headers = ['Date', 'Category', 'Description', 'Amount', 'Currency', 'Type'];
        const csvContent = [
            headers.join(','),
            ...transactions.map(t => {
                const description = t.note ? `"${t.note.replace(/"/g, '""')}"` : '';
                return [
                    t.date,
                    t.category,
                    description,
                    Math.abs(t.amount),
                    currency.code,
                    t.type
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `kore_transactions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [transactions, currency]);

    const exportToPDF = useCallback(() => {
        if (!transactions || transactions.length === 0) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const today = new Date().toISOString().split('T')[0];

        // --- Header ---
        // Logo (Assuming /logo.png exists, otherwise fallback to text)
        try {
            const img = new Image();
            img.src = '/logo.png';
            doc.addImage(img, 'PNG', 14, 10, 12, 12);
        } catch (e) {
            // Fallback if image fails
        }

        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text("Financial Report", 30, 18);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${today}`, pageWidth - 14, 18, { align: 'right' });

        doc.setDrawColor(200, 200, 200);
        doc.line(14, 25, pageWidth - 14, 25);

        // --- Summary Section ---
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);

        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);

        const netBalance = totalIncome - totalExpense;

        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.text("Summary", 14, 35);

        // Summary Box
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(14, 40, pageWidth - 28, 25, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Total Income", 30, 48);
        doc.text("Total Expense", pageWidth / 2, 48, { align: 'center' });
        doc.text("Net Balance", pageWidth - 30, 48, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");

        doc.setTextColor(16, 185, 129); // Emerald
        doc.text(formatCurrency(totalIncome), 30, 58);

        doc.setTextColor(239, 68, 68); // Rose
        doc.text(formatCurrency(totalExpense), pageWidth / 2, 58, { align: 'center' });

        doc.setTextColor(netBalance >= 0 ? 16 : 239, netBalance >= 0 ? 185 : 68, netBalance >= 0 ? 129 : 68);
        doc.text(formatCurrency(netBalance), pageWidth - 30, 58, { align: 'right' });

        // --- Table ---
        const tableColumn = ["Date", "Category", "Description", "Amount", "Type"];
        const tableRows = transactions.map(t => [
            t.date,
            t.category,
            t.note || '-',
            formatCurrency(Math.abs(t.amount)),
            t.type.toUpperCase()
        ]);

        autoTable(doc, {
            startY: 75,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59], // Slate 800
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                textColor: [51, 65, 85] // Slate 700
            },
            columnStyles: {
                0: { cellWidth: 30 }, // Date
                1: { cellWidth: 30 }, // Category
                2: { cellWidth: 'auto' }, // Description
                3: { cellWidth: 30, halign: 'right' }, // Amount
                4: { cellWidth: 25, halign: 'center' } // Type
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate 50
            },
            didParseCell: function (data) {
                // Colorize Amount column based on type
                if (data.section === 'body' && data.column.index === 3) {
                    const type = data.row.raw[4]; // Access Type column
                    if (type === 'EXPENSE') {
                        data.cell.styles.textColor = [239, 68, 68];
                    } else {
                        data.cell.styles.textColor = [16, 185, 129];
                    }
                }
            }
        });

        doc.save(`kore_report_${today}.pdf`);
    }, [transactions, currency]);

    return { exportToCSV, exportToPDF };
};
