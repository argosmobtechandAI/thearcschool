import React, { useState, useMemo } from "react";
import { Search, Download, UserCheck, ChevronRight } from "lucide-react";
import { generateReportCardPDF } from "../utils/reportCardPDF";
import TableFilterHeader from "./TableFilterHeader";
import StudentResultsModal from "./StudentResultsModal";

const ResultsTab = ({ results }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  // Extract unique values for dropdowns
  const availableTerms = useMemo(() => {
    return [...new Set(results?.map(r => r.term))].filter(Boolean).sort();
  }, [results]);

  const availableClasses = useMemo(() => {
    return [...new Set(results?.map(r => r.class))].filter(Boolean).sort();
  }, [results]);

  const availableSections = useMemo(() => {
    if (!classFilter) return [];
    const filteredByClass = results?.filter(r => r.class === classFilter);
    return [...new Set(filteredByClass?.map(r => r.section))].filter(Boolean).sort();
  }, [results, classFilter]);

  // Apply filters to data
  const filteredResults = useMemo(() => {
    if (!results) return [];
    
    return results.filter(item => {
      const matchesSearch = item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTerm = !termFilter || item.term === termFilter;
      const matchesClass = !classFilter || item.class === classFilter;
      const matchesSection = !sectionFilter || item.section === sectionFilter;

      return matchesSearch && matchesTerm && matchesClass && matchesSection;
    });
  }, [results, searchQuery, termFilter, classFilter, sectionFilter]);

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" }}>
      
      <TableFilterHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search Student Name or ID..."
        filters={[
          {
            label: "All Terms",
            value: termFilter,
            onChange: setTermFilter,
            options: availableTerms.map(t => ({ value: t, label: t }))
          },
          {
            label: "All Classes",
            value: classFilter,
            onChange: (val) => { setClassFilter(val); setSectionFilter(""); },
            options: availableClasses.map(c => ({ value: c, label: `Class ${c}` }))
          },
          ...(classFilter ? [{
            label: "All Sections",
            value: sectionFilter,
            onChange: setSectionFilter,
            options: availableSections.map(s => ({ value: s, label: `Section ${s}` }))
          }] : []),
        ]}
      />

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>Student Results Dashboard</h3>
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Showing {filteredResults.length} records
          </span>
        </div>

        {filteredResults.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No results found. Adjust your filters or select a different Term.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.03)", textAlign: "left" }}>
                  <th style={{ padding: "1rem", borderBottom: "2px solid rgba(0,0,0,0.05)" }}>Student</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid rgba(0,0,0,0.05)" }}>Class / Term</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid rgba(0,0,0,0.05)" }}>Total Marks</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid rgba(0,0,0,0.05)" }}>Percentage</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid rgba(0,0,0,0.05)" }}>Grade</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid rgba(0,0,0,0.05)", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((res, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedStudent(res)}
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", cursor: "pointer", transition: "background 0.2s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(59, 130, 246, 0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: "600", color: "#3b82f6" }}>{res.studentName}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>ID: {res.admissionNumber}</div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div>{res.class} {res.section ? `(${res.section})` : ""}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{res.term}</div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {res.totalMarksObtained} <span style={{ color: "var(--text-secondary)" }}>/ {res.totalMaxMarks}</span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: "12px", 
                        background: res.percentage >= 40 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: res.percentage >= 40 ? "#16a34a" : "#dc2626",
                        fontWeight: "600"
                      }}>
                        {res.percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: "1rem", fontWeight: "bold" }}>
                       {res.grade}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right" }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); generateReportCardPDF(res); }}
                        className="btn-ghost" 
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", color: "#2563eb", borderRadius: "8px", background: "rgba(37, 99, 235, 0.05)" }}
                      >
                        <Download size={16} /> PDF
                      </button>
                      <ChevronRight size={18} color="#94a3b8" style={{ marginLeft: "1rem", verticalAlign: "middle" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedStudent && (
        <StudentResultsModal 
          studentResult={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
        />
      )}
    </div>
  );
};

export default ResultsTab;
