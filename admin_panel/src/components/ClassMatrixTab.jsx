import React, { useState, useMemo } from "react";
import TableFilterHeader from "./TableFilterHeader";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { letterheadBase64 } from "../utils/letterhead";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

const ClassMatrixTab = ({ results }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  const terms = useMemo(() => [...new Set(results?.map(r => r.term) || [])].sort(), [results]);
  const classes = useMemo(() => [...new Set(results?.map(r => r.class) || [])].sort(), [results]);
  
  const availableSections = useMemo(() => {
    if (!classFilter) return [];
    return [...new Set(results?.filter(r => r.class === classFilter).map(r => r.section) || [])].sort();
  }, [results, classFilter]);

  const filteredResults = useMemo(() => {
    return (results || []).filter((r) => {
      const matchSearch = r.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTerm = termFilter ? r.term === termFilter : true;
      const matchClass = classFilter ? r.class === classFilter : true;
      const matchSection = sectionFilter ? r.section === sectionFilter : true;
      return matchSearch && matchTerm && matchClass && matchSection;
    });
  }, [results, searchQuery, termFilter, classFilter, sectionFilter]);

  const uniqueSubjects = useMemo(() => {
    const subs = new Map(); // Keep track of max marks per subject
    filteredResults.forEach(r => {
      r.subjects?.forEach(s => {
        if (!subs.has(s.subject) || s.maxMarks > subs.get(s.subject)) {
          subs.set(s.subject, s.maxMarks);
        }
      });
    });
    return Array.from(subs.entries()).map(([subject, maxMarks]) => ({ subject, maxMarks })).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [filteredResults]);

  const handleExportPDF = () => {
    if (filteredResults.length === 0) {
      toast.warn("No results to export");
      return;
    }
    const doc = new jsPDF("landscape");
    doc.addImage(letterheadBase64, "PNG", 0, 0, 297, 40);
    
    doc.setFontSize(14);
    doc.text(`Consolidated Class Matrix`, 14, 50);
    doc.setFontSize(10);
    doc.text(`Term: ${termFilter || "All"} | Class: ${classFilter || "All"} ${sectionFilter ? `(${sectionFilter})` : ""}`, 14, 58);

    const head = [
      ["Class", "Admission No", "Student Name", ...uniqueSubjects.map(sub => `${sub.subject}\n(Max: ${sub.maxMarks})`), "Total Marks", "Grade"]
    ];

    const body = filteredResults.map(student => [
      `${student.class} ${student.section ? `(${student.section})` : ""}`,
      student.admissionNumber || "N/A",
      student.studentName,
      ...uniqueSubjects.map(sub => {
        const markData = student.subjects?.find(s => s.subject === sub.subject);
        return markData?.marksObtained ?? "-";
      }),
      `${student.totalMarksObtained} / ${student.totalMaxMarks}`,
      student.grade
    ]);

    autoTable(doc, {
      head: head,
      body: body,
      startY: 65,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Class_Matrix_${classFilter || "All"}_${termFilter || "All"}.pdf`);
  };

  const handleExportExcel = () => {
    if (filteredResults.length === 0) {
      toast.warn("No results to export");
      return;
    }
    const data = filteredResults.map(student => {
      const row = {
        "Class": `${student.class} ${student.section ? `(${student.section})` : ""}`,
        "Admission No": student.admissionNumber || "N/A",
        "Student Name": student.studentName,
      };
      
      uniqueSubjects.forEach(sub => {
        const markData = student.subjects?.find(s => s.subject === sub.subject);
        row[`${sub.subject} (Max: ${sub.maxMarks})`] = markData?.marksObtained ?? "-";
      });
      
      row["Total Marks"] = `${student.totalMarksObtained} / ${student.totalMaxMarks}`;
      row["Grade"] = student.grade;
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Class Matrix");
    XLSX.writeFile(workbook, `Class_Matrix_${classFilter || "All"}_${termFilter || "All"}.xlsx`);
  };

  return (
    <div>
      <TableFilterHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search students by name or admission..."
        filters={[
          {
            label: "All Terms",
            value: termFilter,
            onChange: setTermFilter,
            options: terms.map(t => ({ value: t, label: t }))
          },
          {
            label: "All Classes",
            value: classFilter,
            onChange: (val) => { setClassFilter(val); setSectionFilter(""); },
            options: classes.map(c => ({ value: c, label: c }))
          },
          ...(classFilter ? [{
            label: "All Sections",
            value: sectionFilter,
            onChange: setSectionFilter,
            options: availableSections.map(s => ({ value: s, label: s }))
          }] : [])
        ]}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
      />

      <div className="glass-panel" style={{ marginTop: "1rem" }}>
        {filteredResults.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No results match your criteria. Select a term and class to view the matrix.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.03)", textAlign: "left", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", width: "80px" }}>Class</th>
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", width: "120px" }}>Admission No</th>
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", minWidth: "200px" }}>Student Name</th>
                  {uniqueSubjects.map((sub, idx) => (
                    <th key={idx} style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", textAlign: "center", minWidth: "120px" }}>
                      {sub.subject} <br />
                      <span style={{ fontSize: "0.75rem", fontWeight: "normal" }}>(Max: {sub.maxMarks})</span>
                    </th>
                  ))}
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", textAlign: "center", minWidth: "100px" }}>Total Marks</th>
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", textAlign: "center", minWidth: "80px" }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((student, sIdx) => (
                  <tr key={sIdx} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", fontSize: "0.875rem" }}>
                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                      {student.class} {student.section ? `(${student.section})` : ""}
                    </td>
                    <td style={{ padding: "1rem" }}>{student.admissionNumber || "N/A"}</td>
                    <td style={{ padding: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{student.studentName}</td>
                    {uniqueSubjects.map((sub, idx) => {
                      const markData = student.subjects?.find(s => s.subject === sub.subject);
                      const displayMark = markData?.marksObtained;
                      const isFailing = displayMark !== null && displayMark !== undefined && displayMark < (sub.maxMarks * 0.4);
                      
                      return (
                        <td key={idx} style={{ padding: "1rem", textAlign: "center", color: isFailing ? "#ef4444" : "inherit" }}>
                          {displayMark !== null && displayMark !== undefined ? (
                            <span style={{ fontWeight: "600" }}>{displayMark}</span>
                          ) : (
                            <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>-</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ padding: "1rem", textAlign: "center", fontWeight: "700", color: "#3b82f6" }}>
                      {student.totalMarksObtained} <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>/ {student.totalMaxMarks}</span>
                    </td>
                    <td style={{ padding: "1rem", textAlign: "center", fontWeight: "700", color: student.gradeColor || "#ef4444" }}>
                      {student.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassMatrixTab;
