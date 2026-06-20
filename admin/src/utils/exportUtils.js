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

/**
 * Generate a PDF receipt for a fee payment
 * @param {Object} payment - Payment details object
 * @param {Object} student - Student details object
 */
export const generateReceiptPDF = async (payment, student) => {
    if (!payment || !student) return;

    const doc = new jsPDF();
    
    // Load Logo
    const imgData = await new Promise((resolve) => {
      const img = new Image();
      img.src = "/thearcschoollogo.jpeg";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg"));
      };
      img.onerror = () => resolve(null);
    });

    if (imgData) {
      doc.addImage(imgData, 'JPEG', 14, 10, 25, 25);
    }

    // Header
    doc.setFontSize(22);
    doc.setTextColor(27, 139, 59);
    doc.text("THE ARC SCHOOL", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Sadatpur, Old Motihari Road, Muzaffarpur, Bihar – 843108", 105, 28, { align: "center" });
    doc.text("Email: info@thearcschool.com", 105, 34, { align: "center" });
    
    // Receipt Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("FEE RECEIPT", 105, 45, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(14, 50, 196, 50);

    // Receipt details
    doc.setFontSize(11);
    doc.text(`Receipt No: RCT-${payment.id?.substring(0, 8).toUpperCase() || Date.now()}`, 14, 60);
    doc.text(`Date: ${new Date(payment.created_at || Date.now()).toLocaleDateString()}`, 140, 60);
    
    doc.text(`Student Name: ${student.name || 'N/A'}`, 14, 75);
    doc.text(`Admission No: ${student.admission_number || 'N/A'}`, 140, 75);
    
    // Payment Details Box
    doc.setDrawColor(200);
    doc.rect(14, 85, 182, 50); // x, y, w, h
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Details", 20, 95);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Fee Type: ${payment.fee?.title || 'General Fee'}`, 20, 105);
    doc.text(`Payment Mode: ${payment.payment_mode || 'Cash'}`, 20, 115);
    if (payment.remarks) {
        doc.text(`Remarks: ${payment.remarks}`, 20, 125);
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Amount Paid: Rs. ${payment.amount_paid}/-`, 120, 115);
    
    // Footer signature
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signatory", 150, 160);
    doc.line(140, 155, 190, 155);
    
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("This is a computer generated receipt.", 105, 280, { align: "center" });

    doc.save(`Receipt_${student.name || 'Student'}_${payment.id?.substring(0,6) || ''}.pdf`);
};

