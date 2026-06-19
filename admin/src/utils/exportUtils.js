import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

// Helper to load image as Base64 for PDF
const getBase64ImageFromUrl = async (imageUrl) => {
    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener("load", function () {
                resolve(reader.result);
            }, false);
            reader.onerror = () => reject(this);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Error loading image for PDF", e);
        return null;
    }
};

/**
 * Export array of objects to an Excel (.xlsx) file
 * @param {Array<Object>} data - Array of JSON objects
 * @param {string} fileName - Base file name (without .xlsx)
 */
export const exportToExcel = (data, fileName = "export", title = "Exported Data") => {
    if (!data || data.length === 0) return;
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Create worksheet data with title row
    const columns = Object.keys(data[0] || {});
    const wsData = [
        [title],
        [],
        columns,
        ...data.map(item => columns.map(col => item[col]))
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Add some basic column widths
    const wscols = columns.map(() => ({ wch: 20 }));
    ws['!cols'] = wscols;
    
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
export const exportToPDF = async (columns, data, fileName = "export", title = "Exported Data") => {
    if (!data || data.length === 0) return;

    const doc = new jsPDF('landscape');
    
    const logoBase64 = await getBase64ImageFromUrl("/thearcschoollogo.jpeg");
    let startYOffset = 20;

    if (logoBase64) {
        doc.addImage(logoBase64, 'JPEG', 14, 10, 15, 15);
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("The Arc School", 34, 18);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(title, 34, 24);
        startYOffset = 32;
    } else {
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(title, 14, 15);
    }
    
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
                if (text === 'PUBLIC HOLIDAY' || text === 'HOLIDAY') {
                    data.cell.styles.fillColor = [209, 250, 229]; 
                    data.cell.styles.textColor = [16, 185, 129]; 
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.halign = 'center';
                } else if (text === 'WEEK OFF') {
                    data.cell.styles.fillColor = [224, 231, 255]; 
                    data.cell.styles.textColor = [99, 102, 241]; 
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.halign = 'center';
                } else if (text === 'Break / Lunch' || text === 'BREAK / LUNCH') {
                    data.cell.styles.fillColor = [254, 243, 199]; 
                    data.cell.styles.textColor = [245, 158, 11]; 
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.halign = 'center';
                }
            }
        }
    });
    
    doc.save(`${fileName}.pdf`);
};
