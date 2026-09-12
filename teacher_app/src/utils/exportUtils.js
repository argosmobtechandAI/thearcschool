import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import RNFS from 'react-native-fs';
import { letterheadBase64 } from './letterhead';
import { Platform, Alert } from 'react-native';
import Share from 'react-native-share';
import FileViewer from 'react-native-file-viewer';

/**
 * Universal safe helper to invoke autoTable plugin on jsPDF instance
 */
const renderAutoTable = (doc, options) => {
    try {
        if (typeof doc.autoTable === 'function') {
            doc.autoTable(options);
        } else if (typeof autoTable === 'function') {
            autoTable(doc, options);
        } else if (autoTable && typeof autoTable.default === 'function') {
            autoTable.default(doc, options);
        } else if (autoTable && typeof autoTable.autoTable === 'function') {
            autoTable.autoTable(doc, options);
        } else {
            console.warn("Could not find autoTable function on doc or module");
        }
    } catch (e) {
        console.error("autoTable error: ", e);
    }
};

/**
 * Export data to a PDF file with a table and save it to device
 * @param {Array<string>} columns - Array of column headers
 * @param {Array<Array<any>>} data - 2D array of row data
 * @param {string} fileName - Base file name (without .pdf)
 * @param {string} title - Title to print at the top of the PDF
 */
export const exportToPDF = async (columns, data, fileName = "export", title = "Exported Data") => {
    if (!data || data.length === 0) return;

    try {
        const doc = new jsPDF('landscape');
        const pageWidth = doc.internal.pageSize.getWidth();
        
        if (letterheadBase64) {
            try {
                doc.addImage(letterheadBase64, 'PNG', 0, 0, pageWidth, 40);
            } catch (imgErr) {
                console.warn("Letterhead image add error: ", imgErr);
            }
        }
        
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(title || "Exported Data", 14, 50);

        let startYOffset = 55;
        
        renderAutoTable(doc, {
            startY: startYOffset,
            head: [columns],
            body: data,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [27, 139, 59], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            didParseCell: function (cellData) {
                if (cellData.section === 'body') {
                    const text = String(cellData.cell.text?.[0] || '');
                    if (text.toUpperCase().includes('HOLIDAY')) {
                        cellData.cell.styles.fillColor = [209, 250, 229]; 
                        cellData.cell.styles.textColor = [16, 185, 129]; 
                        cellData.cell.styles.fontStyle = 'bold';
                        cellData.cell.styles.halign = 'center';
                    } else if (text === 'WEEK OFF') {
                        cellData.cell.styles.fillColor = [224, 231, 255]; 
                        cellData.cell.styles.textColor = [99, 102, 241]; 
                        cellData.cell.styles.fontStyle = 'bold';
                        cellData.cell.styles.halign = 'center';
                    } else if (text === 'Exam' || text === 'EXAM') {
                        cellData.cell.styles.fillColor = [254, 243, 199]; 
                        cellData.cell.styles.textColor = [245, 158, 11]; 
                        cellData.cell.styles.fontStyle = 'bold';
                        cellData.cell.styles.halign = 'center';
                    }
                }
            }
        });
        
        // Output PDF as base64 string
        const outputUri = doc.output('datauristring');
        const pdfBase64 = outputUri && outputUri.includes(',') ? outputUri.split(',')[1] : '';
        if (!pdfBase64) {
            throw new Error("Failed to generate PDF document data");
        }
        
        const cleanName = `${String(fileName || 'export').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`;
        const dirPath = RNFS.CachesDirectoryPath;
        const savePath = `${dirPath}/${cleanName}`;

        await RNFS.writeFile(savePath, pdfBase64, 'base64');
        
        if (Platform.OS === 'android') {
            try {
                const downloadPath = `${RNFS.DownloadDirectoryPath}/${cleanName}`;
                await RNFS.writeFile(downloadPath, pdfBase64, 'base64');
            } catch (e) {
                // Scoped storage fallback - ignore
            }
        }

        try {
            await FileViewer.open(savePath, { showOpenWithDialog: true, showAppsSuggestions: true });
        } catch (viewerErr) {
            await Share.open({
                title: `Share ${title}`,
                url: `file://${savePath}`,
                type: 'application/pdf',
                filename: cleanName,
                showAppsToView: true
            }).catch(err => {
                if (err && err.message !== 'User did not share') {
                    console.log('Share error:', err);
                }
            });
        }
    } catch (error) {
        console.error("Error generating PDF: ", error);
        Alert.alert("PDF Export Error", String(error?.message || error || "Failed to generate PDF document."));
    }
};

/**
 * Generate a PDF receipt for a fee payment
 * @param {Object} payment - Payment details object
 * @param {Object} student - Student details object
 * @param {boolean} isShare - If true, directly open the share dialog
 */
export const generateReceiptPDF = async (payment, student, isShare = false) => {
    if (!payment) {
        Alert.alert("Receipt Notice", "Payment details not found for this receipt.");
        return;
    }

    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        if (letterheadBase64) {
            try {
                doc.addImage(letterheadBase64, 'PNG', 0, 0, pageWidth, 40);
            } catch (imgErr) {
                console.warn("Letterhead image add error: ", imgErr);
            }
        }

        // Receipt Title
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("FEE RECEIPT", 105, 50, { align: "center" });
        
        doc.setLineWidth(0.5);
        doc.line(14, 55, 196, 55);

        // Receipt details - safe String conversion
        const rawReceiptId = payment.display_id || payment.receipt_number || payment.id;
        const receiptCode = rawReceiptId != null 
            ? String(rawReceiptId).replace(/^RCT-?/i, '').slice(0, 10).toUpperCase()
            : String(Date.now()).slice(-8);

        const paymentDateStr = payment.payment_date || payment.created_at || payment.date;
        const formattedDate = paymentDateStr ? new Date(paymentDateStr).toLocaleDateString() : new Date().toLocaleDateString();

        doc.setFontSize(11);
        doc.text(`Receipt No: RCT-${receiptCode}`, 14, 65);
        doc.text(`Date: ${formattedDate}`, 140, 65);
        
        const studentName = student?.name || student?.student_name || 'Student';
        const admissionNo = student?.admission_number || student?.admission_no || student?.roll_number || 'N/A';
        doc.text(`Student Name: ${studentName}`, 14, 75);
        doc.text(`Admission No: ${admissionNo}`, 140, 75);
        
        const rawClass = student?.className || student?.class_name || student?.class || payment?.class_name || payment?.className || '';
        const safeClass = (typeof rawClass === 'object' && rawClass !== null ? rawClass.name || rawClass.className : rawClass) || 'N/A';
        doc.text(`Class: ${safeClass}`, 14, 83);
        
        const sanitize = (val) => {
            if (val == null) return '';
            return String(val).replace(/₹/g, 'Rs. ');
        };

        const feeTitle = payment.fee?.title || payment.title || payment.category || 'General Fee';
        const paymentMode = payment.payment_mode || payment.payment_method || 'Cash/Online';
        const amountValue = payment.amount_paid ?? payment.total_paid_amount ?? payment.amount ?? 0;

        const tableData = [
            ["Fee Type:", sanitize(feeTitle)],
            ["Payment Mode:", sanitize(paymentMode)],
            ["Amount Paid:", `Rs. ${amountValue}/-`],
        ];
        if (payment.remarks) {
            tableData.push(["Remarks:", sanitize(payment.remarks)]);
        }

        renderAutoTable(doc, {
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
        doc.text("Authorized Signatory", 150, Math.min(finalY, 260));
        doc.line(140, Math.min(finalY, 260) - 5, 190, Math.min(finalY, 260) - 5);
        
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("This is a computer generated receipt.", 105, 280, { align: "center" });

        // Output PDF as base64 string
        const outputUri = doc.output('datauristring');
        const pdfBase64 = outputUri && outputUri.includes(',') ? outputUri.split(',')[1] : '';
        if (!pdfBase64) {
            throw new Error("Failed to render receipt PDF");
        }
        
        // Safe filename construction
        const studentClean = String(studentName).replace(/[^a-zA-Z0-9_-]/g, '_');
        const paymentClean = String(receiptCode).replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `Receipt_${studentClean}_${paymentClean}_${Date.now()}.pdf`;
        const dirPath = RNFS.CachesDirectoryPath;
        const savePath = `${dirPath}/${fileName}`;

        // Write the file to internal cache
        await RNFS.writeFile(savePath, pdfBase64, 'base64');
        
        // Try saving to public Downloads folder on Android as well
        if (Platform.OS === 'android') {
            try {
                const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
                await RNFS.writeFile(downloadPath, pdfBase64, 'base64');
            } catch (e) {
                // Scoped storage fallback - continue with cache file
            }
        }

        if (isShare) {
            await Share.open({
                title: 'Share Receipt',
                url: `file://${savePath}`,
                type: 'application/pdf',
                filename: fileName,
                showAppsToView: true
            }).catch(err => {
                if (err && err.message !== 'User did not share') {
                    console.log('Share error:', err);
                }
            });
        } else {
            // Attempt direct viewer; if not supported or no default viewer, open Share sheet
            try {
                await FileViewer.open(savePath, { showOpenWithDialog: true, showAppsSuggestions: true });
            } catch (viewerErr) {
                await Share.open({
                    title: 'Fee Receipt',
                    url: `file://${savePath}`,
                    type: 'application/pdf',
                    filename: fileName,
                    showAppsToView: true
                }).catch(err => {
                    if (err && err.message !== 'User did not share') {
                        console.log('Share error:', err);
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error generating receipt: ", error);
        Alert.alert("Receipt Error", String(error?.message || error || "Failed to generate fee receipt."));
    }
};
