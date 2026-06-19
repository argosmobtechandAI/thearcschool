import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

/**
 * Export array of objects to an Excel (.xlsx) file
 * @param {Array<Object>} data - Array of JSON objects
 * @param {string} fileName - Base file name (without .xlsx)
 */
export const exportToExcel = (data, fileName = "export") => {
    if (!data || data.length === 0) return;
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    // Convert data to a worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    // Append worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    // Save the file
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

/**
 * Export data to a PDF file with a table
 * @param {Array<string>} columns - Array of column headers
 * @param {Array<Array<any>>} data - 2D array of row data
 * @param {string} fileName - Base file name (without .pdf)
 * @param {string} title - Title to print at the top of the PDF
 */
export const exportToPDF = (columns, data, fileName = "export", title = "Exported Data") => {
    if (!data || data.length === 0) return;

    const doc = new jsPDF();
    
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    
    autoTable(doc, {
        startY: 20,
        head: [columns],
        body: data,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [27, 139, 59] } // Using primary green color
    });
    
    doc.save(`${fileName}.pdf`);
};
