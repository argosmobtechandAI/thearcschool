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
        
        // Create a notification channel (required for Android)
        await notifee.requestPermission();
        const channelId = await notifee.createChannel({
            id: 'downloads',
            name: 'Downloads Channel',
            importance: AndroidImportance.HIGH,
        });

        // Trigger local notification
        await notifee.displayNotification({
            title: 'Download Complete',
            body: `Tap to open ${title}`,
            data: { filePath: savePath },
            android: {
                channelId,
                smallIcon: 'ic_launcher', // Use default app icon
                pressAction: {
                    id: 'default',
                },
            },
        });

    } catch (error) {
        console.error("Error generating PDF: ", error);
        throw error;
    }
};
