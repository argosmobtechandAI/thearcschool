import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { letterheadBase64 } from "./letterhead";

export const generateReportCardPDF = (studentResult) => {
  if (!studentResult) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Add Official Letterhead
  if (letterheadBase64) {
    doc.addImage(letterheadBase64, "PNG", 0, 0, pageWidth, 40);
  }

  // 2. Add Student Information Header
  doc.setFontSize(16);
  doc.setTextColor(27, 139, 59); // Official Green
  doc.text("STUDENT REPORT CARD", pageWidth / 2, 50, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  const startY = 60;
  doc.text(`Student Name: ${studentResult.studentName}`, 14, startY);
  doc.text(`Admission No: ${studentResult.admissionNumber}`, 14, startY + 6);
  
  doc.text(`Class: ${studentResult.class} ${studentResult.section ? `- ${studentResult.section}` : ""}`, 140, startY);
  doc.text(`Term: ${studentResult.term}`, 140, startY + 6);

  // 3. Prepare Subject Breakdown Table
  const tableData = studentResult.subjects.map((sub, index) => [
    index + 1,
    sub.subject,
    sub.maxMarks,
    sub.marksObtained,
    ((sub.marksObtained / sub.maxMarks) * 100).toFixed(1) + "%"
  ]);

  // 4. Render Table
  autoTable(doc, {
    startY: startY + 15,
    head: [["S.No", "Subject", "Max Marks", "Marks Obtained", "Percentage"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [27, 139, 59], // Official green header
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });

  // 5. Add Final Summary / Footer
  const finalY = doc.lastAutoTable.finalY + 15;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Marks: ${studentResult.totalMarksObtained} / ${studentResult.totalMaxMarks}`, 14, finalY);
  doc.text(`Overall Percentage: ${studentResult.percentage.toFixed(2)}%`, 14, finalY + 8);
  
  doc.setFontSize(14);
  doc.setTextColor(27, 139, 59);
  doc.text(`Final Grade: ${studentResult.grade}`, 14, finalY + 18);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("This is a computer-generated document. No signature is required.", pageWidth / 2, 280, { align: "center" });

  // 6. Save PDF
  const filename = `${studentResult.studentName.replace(/\\s+/g, "_")}_${studentResult.term}_ReportCard.pdf`;
  doc.save(filename);
};
