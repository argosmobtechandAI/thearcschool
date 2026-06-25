import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import RNFS from 'react-native-fs';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { letterheadBase64 } from './letterhead';
import { Platform } from 'react-native';

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
        
        doc.addImage(letterheadBase64, 'PNG', 0, 0, pageWidth, 40);
        
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(title, 14, 50);

        let startYOffset = 55;
        
        autoTable(doc, {
            startY: startYOffset,
            head: [columns],
            body: data,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [27, 139, 59], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            didParseCell: function (data) {
                if (data.section === 'body') {
                    const text = data.cell.text[0] || '';
                    if (text.toUpperCase().includes('HOLIDAY')) {
                        data.cell.styles.fillColor = [209, 250, 229]; 
                        data.cell.styles.textColor = [16, 185, 129]; 
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.halign = 'center';
                    } else if (text === 'WEEK OFF') {
                        data.cell.styles.fillColor = [224, 231, 255]; 
                        data.cell.styles.textColor = [99, 102, 241]; 
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.halign = 'center';
                    } else if (text === 'Exam' || text === 'EXAM') {
                        data.cell.styles.fillColor = [254, 243, 199]; 
                        data.cell.styles.textColor = [245, 158, 11]; 
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.halign = 'center';
                    }
                }
            }
        });
        
        // Output PDF as base64 string
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        // Determine save path based on platform
        const dirPath = Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath;
        const savePath = `${dirPath}/${fileName}_${Date.now()}.pdf`;

        // Write the file
        await RNFS.writeFile(savePath, pdfBase64, 'base64');
        
        // Share the file natively
        import('react-native-share').then(ShareModule => {
            const Share = ShareModule.default;
            Share.open({
                title: `Share ${title}`,
                url: `file://${savePath}`,
                type: 'application/pdf',
                filename: fileName,
                showAppsToView: true
            }).catch(err => {
                if (err && err.message !== 'User did not share') {
                    console.log('Share error:', err);
                }
            });
        });

    } catch (error) {
        console.error("Error generating PDF: ", error);
        throw error;
    }
};

/**
 * Generate a PDF receipt for a fee payment
 * @param {Object} payment - Payment details object
 * @param {Object} student - Student details object
 */
export const generateReceiptPDF = async (payment, student) => {
    if (!payment || !student) return;

    try {
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
            ["Amount Paid:", `Rs. ${payment.amount_paid || payment.total_paid_amount || 0}/-`],
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

        // Output PDF as base64 string
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        // Determine save path based on platform
        const fileName = `Receipt_${student.name || 'Student'}_${payment.id?.substring(0,6) || ''}`;
        const dirPath = Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath;
        const savePath = `${dirPath}/${fileName}_${Date.now()}.pdf`;

        // Write the file
        await RNFS.writeFile(savePath, pdfBase64, 'base64');
        
        // Share the file natively
        import('react-native-share').then(ShareModule => {
            const Share = ShareModule.default;
            Share.open({
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
        });

    } catch (error) {
        console.error("Error generating receipt: ", error);
        throw error;
    }
};
