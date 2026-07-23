import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { letterheadBase64 } from './letterhead';

/**
 * Export array of objects to an Excel (.xlsx) file
 * @param {Array<Object>} data - Array of JSON objects
 * @param {string} fileName - Base file name (without .xlsx)
 */
export const exportToExcel = (data, fileName = "export") => {
    try {
        if (!data || data.length === 0) return;
        
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        // Convert data to a worksheet
        const ws = XLSX.utils.json_to_sheet(data);
        // Append worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        // Save the file
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } catch (error) {
        console.error("Error exporting to Excel", error);
        alert("Failed to export Excel: " + error.message);
    }
};

/**
 * Export data to a PDF file with a table
 * @param {Array<string>} columns - Array of column headers
 * @param {Array<Array<any>>} data - 2D array of row data
 * @param {string} fileName - Base file name (without .pdf)
 * @param {string} title - Title to print at the top of the PDF
 */
export const exportToPDF = (columns, data, fileName = "export", title = "Exported Data") => {
    try {
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
    } catch (error) {
        console.error("Error exporting to PDF", error);
        alert("Failed to export PDF: " + error.message);
    }
};

/**
 * Generate a PDF receipt for a fee payment
 * @param {Object|Array} paymentsInput - Payment details object or array of payment objects
 * @param {Object} student - Student details object
 */
export const generateReceiptPDF = async (paymentsInput, student, receipt) => {
    try {
        if (!paymentsInput || !student) return;

        // Normalize to array
        const payments = Array.isArray(paymentsInput) ? paymentsInput : [paymentsInput];
        if (payments.length === 0) return;

        const firstPayment = payments[0];

        const doc = new jsPDF('landscape', 'mm', 'a4');
        const halfWidth = 297 / 2; // 148.5

        const sanitize = (str) => str ? str.replace(/₹/g, 'Rs. ') : str;

        const tableData = payments.flatMap(p => {
            let title = p.fee?.title || p.fee_title || (p.remarks && p.remarks.startsWith("Fee Payment: ") ? p.remarks.replace("Fee Payment: ", "").trim() : "General Fee");
            title = title.replace(/\(\+₹0 Late Fee\)/g, "").replace(/\(\+Rs\. 0 Late Fee\)/g, "").trim();
            
            let amount = p.amount_paid || 0;
            return [[sanitize(title), amount, "", sanitize(title), amount]];
        });

        const totalAmountPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
        const paymentMode = sanitize(firstPayment.payment_mode || 'Cash');

        // Add Total, Mode, Remarks at the bottom
        tableData.push([
            { content: 'Total Amount Paid:', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `Rs. ${totalAmountPaid}/-`, styles: { fontStyle: 'bold', halign: 'right' } },
            "",
            { content: 'Total Amount Paid:', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `Rs. ${totalAmountPaid}/-`, styles: { fontStyle: 'bold', halign: 'right' } }
        ]);
        tableData.push([
            { content: 'Payment Mode:', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: paymentMode, styles: { halign: 'right' } },
            "",
            { content: 'Payment Mode:', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: paymentMode, styles: { halign: 'right' } }
        ]);
        
        let remarksText = receipt?.remarks ? sanitize(receipt.remarks) : "";
        if (!remarksText) {
            const customRemarks = payments.map(p => p.remarks).filter(r => r && !r.startsWith("Fee Payment: "));
            if (customRemarks.length > 0) {
                remarksText = sanitize([...new Set(customRemarks)].join("; "));
            }
        }

        if (remarksText) {
            tableData.push([
                { content: 'Remarks:', styles: { fontStyle: 'bold', halign: 'right' } },
                { content: remarksText, styles: { halign: 'right' } },
                "",
                { content: 'Remarks:', styles: { fontStyle: 'bold', halign: 'right' } },
                { content: remarksText, styles: { halign: 'right' } }
            ]);
        }

        const drawHeadersAndFooter = (data) => {
            const pageDoc = data.doc;
            
            // Draw Dashed Line in Middle
            pageDoc.setLineWidth(0.5);
            pageDoc.setLineDashPattern([2, 2], 0);
            pageDoc.line(halfWidth, 5, halfWidth, 205);
            pageDoc.setLineDashPattern([], 0); // reset
            
            const drawSideHeader = (offsetX, isSchoolCopy) => {
                // Letterhead
                pageDoc.addImage(letterheadBase64, 'PNG', offsetX, 0, halfWidth, 40);

                // Receipt Title
                pageDoc.setFontSize(14);
                pageDoc.setTextColor(0);
                pageDoc.text("FEE RECEIPT", offsetX + halfWidth / 2, 50, { align: "center" });
                
                // Subtitle
                pageDoc.setFontSize(10);
                pageDoc.setTextColor(100);
                pageDoc.text(isSchoolCopy ? "(School Copy)" : "(Parent Copy)", offsetX + halfWidth / 2, 55, { align: "center" });
                
                pageDoc.setLineWidth(0.5);
                pageDoc.line(offsetX + 10, 60, offsetX + halfWidth - 10, 60);

                // Receipt details
                pageDoc.setFontSize(10);
                pageDoc.setTextColor(0);
                const receiptIdText = receipt?.receipt_number ? `REC-${String(receipt.receipt_number).padStart(6, '0')}` : `RCT-${String(firstPayment.id || '').substring(0, 8).toUpperCase() || Date.now()}`;
                pageDoc.text(`Receipt No: ${receiptIdText}`, offsetX + 10, 70);
                pageDoc.text(`Date: ${new Date(receipt?.created_at || firstPayment.created_at || Date.now()).toLocaleDateString()}`, offsetX + halfWidth - 10, 70, { align: 'right' });
                
                let safeName = student.name || 'N/A';
                if (safeName.length > 35) {
                    safeName = safeName.substring(0, 32) + '...';
                }
                pageDoc.text(`Student Name: ${safeName}`, offsetX + 10, 80);
                pageDoc.text(`Admission No: ${student.admission_number || 'N/A'}`, offsetX + halfWidth - 10, 80, { align: 'right' });
                
                pageDoc.setFontSize(8);
                pageDoc.setTextColor(150);
                pageDoc.text("This is a computer generated receipt.", offsetX + halfWidth / 2, 200, { align: "center" });
            };
            
            drawSideHeader(0, true);
            drawSideHeader(halfWidth, false);
            
            // Draw Signature on every page
            pageDoc.setFontSize(10);
            pageDoc.setFont("helvetica", "normal");
            pageDoc.setTextColor(0);
            
            pageDoc.text("Authorized Signatory", halfWidth - 10, 190, { align: 'right' });
            pageDoc.line(halfWidth - 50, 185, halfWidth - 10, 185);
            
            pageDoc.text("Authorized Signatory", 297 - 10, 190, { align: 'right' });
            pageDoc.line(297 - 50, 185, 297 - 10, 185);
        };

        autoTable(doc, {
            startY: 85,
            head: [["Fee Name", "Amount", "", "Fee Name", "Amount"]],
            body: tableData,
            theme: 'grid',
            styles: { cellPadding: 2, fontSize: 9, textColor: [0, 0, 0] },
            headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 10, halign: 'center' },
            bodyStyles: { textColor: [0, 0, 0] },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 28.5, halign: 'right' },
                2: { cellWidth: 20 },
                3: { cellWidth: 100 },
                4: { cellWidth: 28.5, halign: 'right' }
            },
            margin: { top: 85, left: 10, right: 10, bottom: 30 }, // explicitly set top margin so subsequent pages don't overlap header
            didDrawPage: drawHeadersAndFooter,
            willDrawCell: (data) => {
                // Hide borders and background for the gap column
                if (data.column.index === 2) {
                    data.cell.styles.lineWidth = 0;
                    data.cell.styles.fillColor = [255, 255, 255];
                    // Ensure text is also hidden just in case
                    data.cell.styles.textColor = [255, 255, 255];
                }
            }
        });

        doc.save(`Receipt_${student.name || 'Student'}_${String(firstPayment.id || '').substring(0,6) || ''}.pdf`);
    } catch (error) {
        console.error("Error generating Receipt PDF", error);
        alert("Failed to generate PDF: " + error.message);
    }
};
