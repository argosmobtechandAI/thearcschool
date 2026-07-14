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

        const feeTitlesArray = payments.flatMap(p => {
            let title = 'General Fee';
            if (p.fee?.title) {
                title = p.fee.title;
            } else if (p.fee_title) {
                title = p.fee_title;
            } else if (p.remarks && p.remarks.startsWith("Fee Payment: ")) {
                title = p.remarks.replace("Fee Payment: ", "").trim();
            }
            
            // Clean up any zero late fees from older generated data
            title = title.replace(/\(\+₹0 Late Fee\)/g, "").replace(/\(\+Rs\. 0 Late Fee\)/g, "").trim();
            
            // Handle legacy records that combined multiple fees with commas
            if (title.includes(",")) {
                return title.split(",").map(s => s.trim());
            }
            return [`${title} (Rs. ${p.amount_paid || 0})`];
        });

        const feeTitles = feeTitlesArray.map(s => `• ${sanitize(s)}`).join("\n");
        
        const totalAmountPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
        const paymentMode = sanitize(firstPayment.payment_mode || 'Cash');

        const tableData = [
            ["Fee Type(s):", feeTitles, "", "Fee Type(s):", feeTitles],
            ["Payment Mode:", paymentMode, "", "Payment Mode:", paymentMode],
            ["Amount Paid:", `Rs. ${totalAmountPaid}/-`, "", "Amount Paid:", `Rs. ${totalAmountPaid}/-`],
        ];
        
        let remarksText = receipt?.remarks ? sanitize(receipt.remarks) : "";
        if (!remarksText) {
            const customRemarks = payments.map(p => p.remarks).filter(r => r && !r.startsWith("Fee Payment: "));
            if (customRemarks.length > 0) {
                remarksText = sanitize([...new Set(customRemarks)].join("; "));
            }
        }

        if (remarksText) {
            tableData.push(["Remarks:", remarksText, "", "Remarks:", remarksText]);
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
                const receiptIdText = receipt?.receipt_number ? `REC-${String(receipt.receipt_number).padStart(6, '0')}` : `RCT-${firstPayment.id?.substring(0, 8).toUpperCase() || Date.now()}`;
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
        };

        autoTable(doc, {
            startY: 90,
            head: [["Payment Details", "", "", "Payment Details", ""]],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 11 },
            bodyStyles: { fontSize: 10, textColor: [0, 0, 0] },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 35 },
                1: { cellWidth: halfWidth - 20 - 35 }, // 93.5
                2: { cellWidth: 20 },
                3: { fontStyle: 'bold', cellWidth: 35 },
                4: { cellWidth: halfWidth - 20 - 35 } // 93.5
            },
            margin: { top: 90, left: 10, right: 10, bottom: 40 }, // explicitly set top margin so subsequent pages don't overlap header
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

        const finalY = (doc.lastAutoTable?.finalY || 140) + 20;
        
        // Ensure finalY doesn't overlap the footer message at Y=200
        const sigY = finalY > 190 ? 190 : finalY;
        
        // Footer signature on the very last page generated
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        doc.text("Authorized Signatory", halfWidth - 10, sigY, { align: 'right' });
        doc.line(halfWidth - 50, sigY - 5, halfWidth - 10, sigY - 5);
        
        doc.text("Authorized Signatory", 297 - 10, sigY, { align: 'right' });
        doc.line(297 - 50, sigY - 5, 297 - 10, sigY - 5);

        doc.save(`Receipt_${student.name || 'Student'}_${firstPayment.id?.substring(0,6) || ''}.pdf`);
    } catch (error) {
        console.error("Error generating Receipt PDF", error);
        alert("Failed to generate PDF: " + error.message);
    }
};
