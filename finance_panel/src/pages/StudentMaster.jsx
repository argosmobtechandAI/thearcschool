import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import TableFilterHeader from "../components/TableFilterHeader";
import { useSortableData } from "../hooks/useSortableData";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { Link } from "react-router-dom";

const StudentMaster = () => {
  const dispatch = useDispatch();
  const { users, classes, loadingUsers, loadingClasses } = useSelector((state) => state.data);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("");
  const [selectedColumns, setSelectedColumns] = useState([
    "sno", "name", "admission_number", "doj", "class_name", "gender", "phone"
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 100;

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchClasses());
  }, [dispatch]);

  const students = useMemo(() => users.filter(u => u.type === "student"), [users]);

  const processedData = useMemo(() => {
    return students.map(s => {
      let className = "N/A";
      let baseClassName = "N/A";
      if (s.classes && s.classes.length > 0) {
        const cls = classes.find(c => String(c.id) === String(s.classes[0]));
        if (cls) {
          className = `${cls.name} ${cls.section || ''}`.trim();
          baseClassName = cls.name;
        }
      }
      return {
        ...s,
        className,
        baseClassName,
        section: s.classes && s.classes.length > 0 && classes.find(c => String(c.id) === String(s.classes[0]))?.section ? classes.find(c => String(c.id) === String(s.classes[0])).section : "",
        doj: s.admission_date ? new Date(s.admission_date).toLocaleDateString() : (s.created_at ? new Date(s.created_at).toLocaleDateString() : "N/A")
      };
    });
  }, [students, classes]);

  const filteredData = useMemo(() => {
    return processedData.filter(item => 
      ((item.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
      (item.admission_number?.toLowerCase() || "").includes(searchTerm.toLowerCase())) &&
      (!selectedClassFilter || item.baseClassName === selectedClassFilter) &&
      (!selectedSectionFilter || item.section === selectedSectionFilter)
    );
  }, [processedData, searchTerm, selectedClassFilter, selectedSectionFilter]);

  const { items: sortedData, requestSort, sortConfig } = useSortableData(filteredData);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClassFilter, selectedSectionFilter, sortedData.length]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const renderSortIndicator = (key) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const exportColumnsList = [
    { key: "sno", label: "S.No" },
    { key: "name", label: "Name" },
    { key: "admission_number", label: "Admission No" },
    { key: "doj", label: "Date of Joining" },
    { key: "class_name", label: "Class" },
    { key: "gender", label: "Gender" },
    { key: "phone", label: "Phone" },
    { key: "father_name", label: "Father's Name" },
    { key: "mother_name", label: "Mother's Name" },
    { key: "address", label: "Address" }
  ];

  const handleExportPDF = () => {
    const columns = exportColumnsList.filter(c => selectedColumns.includes(c.key)).map(c => c.label);
    const rows = sortedData.map((item, index) => {
      const row = [];
      if (selectedColumns.includes("sno")) row.push(index + 1);
      if (selectedColumns.includes("name")) row.push(item.name);
      if (selectedColumns.includes("admission_number")) row.push(item.admission_number || "-");
      if (selectedColumns.includes("doj")) row.push(item.doj);
      if (selectedColumns.includes("class_name")) row.push(item.className);
      if (selectedColumns.includes("gender")) row.push(item.gender || "-");
      if (selectedColumns.includes("phone")) row.push(item.phone || "-");
      if (selectedColumns.includes("father_name")) row.push(item.father_name || "-");
      if (selectedColumns.includes("mother_name")) row.push(item.mother_name || "-");
      if (selectedColumns.includes("address")) row.push(item.address || "-");
      return row;
    });
    exportToPDF(columns, rows, "Student_Master", "Student Master List");
  };

  const handleExportExcel = () => {
    const data = sortedData.map((item, index) => {
      const row = {};
      if (selectedColumns.includes("sno")) row["S.No"] = index + 1;
      if (selectedColumns.includes("name")) row["Name"] = item.name;
      if (selectedColumns.includes("admission_number")) row["Admission No"] = item.admission_number || "-";
      if (selectedColumns.includes("doj")) row["Date of Joining"] = item.doj;
      if (selectedColumns.includes("class_name")) row["Class"] = item.className;
      if (selectedColumns.includes("gender")) row["Gender"] = item.gender || "-";
      if (selectedColumns.includes("phone")) row["Phone"] = item.phone || "-";
      if (selectedColumns.includes("father_name")) row["Father's Name"] = item.father_name || "-";
      if (selectedColumns.includes("mother_name")) row["Mother's Name"] = item.mother_name || "-";
      if (selectedColumns.includes("address")) row["Address"] = item.address || "-";
      return row;
    });
    exportToExcel(data, "Student_Master");
  };

  if (loadingUsers || loadingClasses) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Student Master...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ padding: "1rem 2rem", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>Student Master</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>View all enrolled students and their details.</p>
      </div>

      <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flexShrink: 0, padding: "1.5rem" }}>
          <TableFilterHeader
            searchQuery={searchTerm}
            setSearchQuery={setSearchTerm}
            searchPlaceholder="Search by student name or admission no..."
            filters={[
              {
                label: "All Classes",
                value: selectedClassFilter,
                onChange: setSelectedClassFilter,
                options: Array.from(new Set(classes.map(c => c.name))).filter(Boolean).map(name => ({ label: name, value: name }))
              },
              {
                label: "All Sections",
                value: selectedSectionFilter,
                onChange: setSelectedSectionFilter,
                options: Array.from(new Set(classes.map(c => c.section))).filter(Boolean).map(sec => ({ label: sec, value: sec }))
              }
            ]}
            exportColumns={exportColumnsList}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
          />
        </div>

        <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", borderTop: "1px solid var(--glass-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--glass-bg)", zIndex: 10 }}>
              <tr style={{ borderBottom: "2px solid var(--glass-border)" }}>
                {selectedColumns.includes("sno") && <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>S.NO</th>}
                {selectedColumns.includes("name") && <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("name")}>STUDENT{renderSortIndicator("name")}</th>}
                {selectedColumns.includes("admission_number") && <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("admission_number")}>ADM NO{renderSortIndicator("admission_number")}</th>}
                {selectedColumns.includes("doj") && <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("doj")}>DATE OF JOINING{renderSortIndicator("doj")}</th>}
                {selectedColumns.includes("class_name") && <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("className")}>CLASS{renderSortIndicator("className")}</th>}
                {selectedColumns.includes("gender") && <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("gender")}>GENDER{renderSortIndicator("gender")}</th>}
                {selectedColumns.includes("phone") && <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("phone")}>PHONE{renderSortIndicator("phone")}</th>}
                {selectedColumns.includes("father_name") && <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("father_name")}>FATHER NAME{renderSortIndicator("father_name")}</th>}
                {selectedColumns.includes("mother_name") && <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("mother_name")}>MOTHER NAME{renderSortIndicator("mother_name")}</th>}
                {selectedColumns.includes("address") && <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("address")}>ADDRESS{renderSortIndicator("address")}</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? paginatedData.map((s, idx) => {
                const actualIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s" }} className="hover-row">
                    {selectedColumns.includes("sno") && <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{actualIdx + 1}</td>}
                    {selectedColumns.includes("name") && (
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <Link to={`/student-master/${s.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "0.875rem" }}>
                              {s.name?.charAt(0) || "S"}
                            </div>
                            <div style={{ fontWeight: "600", color: "#3b82f6" }}>{s.name}</div>
                          </div>
                        </Link>
                      </td>
                    )}
                    {selectedColumns.includes("admission_number") && <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.admission_number || "-"}</td>}
                    {selectedColumns.includes("doj") && <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.doj}</td>}
                    {selectedColumns.includes("class_name") && <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.className}</td>}
                    {selectedColumns.includes("gender") && <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem", textTransform: "capitalize" }}>{s.gender || "-"}</td>}
                    {selectedColumns.includes("phone") && <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.phone || "-"}</td>}
                    {selectedColumns.includes("father_name") && <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.father_name || "-"}</td>}
                    {selectedColumns.includes("mother_name") && <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.mother_name || "-"}</td>}
                    {selectedColumns.includes("address") && <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.address || "-"}</td>}
                  </tr>
                );
              }) : (
                <tr><td colSpan="10" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderTop: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.01)" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} of {sortedData.length} entries
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="btn-ghost"
                style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="btn-ghost"
                style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentMaster;
