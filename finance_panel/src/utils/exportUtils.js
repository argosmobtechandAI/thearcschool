import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { letterheadBase64 } from './letterhead';

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
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(letterheadBase64, 'PNG', 0, 0, pageWidth, 40);
    
    doc.setFontSize(14);
    doc.text(title, 14, 50);
    
    autoTable(doc, {
        startY: 55,
        head: [columns],
        body: data,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [27, 139, 59] } // Using primary green color
    });
    
    doc.save(`${fileName}.pdf`);
};

/**
 * Generate a PDF receipt for a fee payment
 * @param {Object} payment - Payment details object
 * @param {Object} student - Student details object
 */
export const generateReceiptPDF = async (payment, student) => {
    if (!payment || !student) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(letterheadBase64, 'PNG', 0, 0, pageWidth, 40);

    // Receipt Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("FEE RECEIPT", 105, 50, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(14, 55, 196, 55);

    // Receipt details
    doc.setFontSize(11);
    doc.text(`Receipt No: RCT-${payment.id?.substring(0, 8).toUpperCase() || Date.now()}`, 14, 65);
    doc.text(`Date: ${new Date(payment.created_at || Date.now()).toLocaleDateString()}`, 140, 65);
    
    doc.text(`Student Name: ${student.name || 'N/A'}`, 14, 80);
    doc.text(`Admission No: ${student.admission_number || 'N/A'}`, 140, 80);
    
    const sanitize = (str) => str ? str.replace(/₹/g, 'Rs. ') : str;

    const tableData = [
        ["Fee Type:", sanitize(payment.fee?.title || 'General Fee')],
        ["Payment Mode:", sanitize(payment.payment_mode || 'Cash')],
        ["Amount Paid:", `Rs. ${payment.amount_paid}/-`],
    ];
    if (payment.remarks) {
        tableData.push(["Remarks:", sanitize(payment.remarks)]);
    }

    autoTable(doc, {
        startY: 90,
        head: [["Payment Details", ""]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 12 },
        bodyStyles: { fontSize: 11, textColor: [0, 0, 0] },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
            1: { cellWidth: 140 }
        },
        margin: { left: 14, right: 14 }
    });

    const finalY = (doc.lastAutoTable?.finalY || doc.previousAutoTable?.finalY || 140) + 40;
    
    // Footer signature
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signatory", 150, finalY);
    doc.line(140, finalY - 5, 190, finalY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("This is a computer generated receipt.", 105, 280, { align: "center" });

    doc.save(`Receipt_${student.name || 'Student'}_${payment.id?.substring(0,6) || ''}.pdf`);
};
