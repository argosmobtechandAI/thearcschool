import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import api from "../services/api";
import { Search, Filter, Download, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import TableFilterHeader from "../components/TableFilterHeader";
import DateRangePicker from "../components/DateRangePicker";
import { useSortableData } from "../hooks/useSortableData";

const Reports = () => {
  const dispatch = useDispatch();
  const { users, classes, loadingUsers, loadingClasses } = useSelector((state) => state.data);

  const [balancesMap, setBalancesMap] = useState({});

  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedColumns, setSelectedColumns] = useState([
    "sno", "student_name", "admission_number", "class_name", "fee_title", "total_due", "total_paid", "balance", "due_date", "status"
  ]);

  const exportColumnsList = [
    { key: "sno", label: "S.No" },
    { key: "studentName", label: "Student Name" },
    { key: "admissionNumber", label: "Admission No" },
    { key: "className", label: "Class" },
    { key: "feeTitle", label: "Fee Title" },
    { key: "totalDue", label: "Total Due" },
    { key: "totalPaid", label: "Total Paid" },
    { key: "balance", label: "Balance" },
    { key: "dueDate", label: "Due Date" },
    { key: "status", label: "Status" }
  ];

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchClasses());
  }, [dispatch]);

  const students = useMemo(() => users.filter(u => u.type === "student" && !u.fee_exempted), [users]);

  useEffect(() => {
    if (students.length > 0) {
      api.post("/finance_panel/studentBalances", { students: students.map(s => ({ id: s.id, type: s.type, fee_exempted: s.fee_exempted, classes: s.classes, bus_fee: s.bus_fee })) })
        .then(res => {
          if (res.data.success) {
            const bMap = {};
            res.data.data.forEach(b => bMap[b.student_id] = b);
            setBalancesMap(bMap);
          }
        })
        .catch(console.error);
    }
  }, [students]);

  // Join data
  const reportData = useMemo(() => {
    let data = [];
    
    students.forEach(student => {
      // Find class name
      let className = "N/A";
      if (student.classes && student.classes.length > 0) {
        const cls = classes.find(c => c.id === student.classes[0]);
        if (cls) className = `${cls.name} ${cls.section || ''}`.trim();
      }

      // Process their fees
      const studentBalance = balancesMap[student.id];
      if (studentBalance && studentBalance.feeBreakdown) {
        studentBalance.feeBreakdown.forEach((feeItem, idx) => {
          const totalDue = Number(feeItem.amount) || 0;
          const totalPaid = Number(feeItem.paid) || 0;
          const balance = Math.max(0, totalDue - totalPaid);
          const dueDate = feeItem.dueDate ? new Date(feeItem.dueDate) : null;
          
          let status = feeItem.status || "Pending";
          if (status !== "Paid" && balance > 0 && dueDate && dueDate < new Date()) {
            status = "Overdue";
          }

          data.push({
            id: `${student.id}-${idx}`,
            studentName: student.name,
            admissionNumber: student.admission_number || "N/A",
            className: className,
            feeTitle: feeItem.title,
            totalDue,
            totalPaid,
            balance,
            dueDate: feeItem.dueDate,
            status
          });
        });
      }
    });

    return data;
  }, [students, classes, balancesMap]);

  // Apply Filters
  const filteredData = useMemo(() => {
    return reportData.filter(item => {
      const matchSearch = item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = !classFilter || item.className === classFilter;
      const matchStatus = !statusFilter || item.status === statusFilter;
      
      let matchDate = true;
      if (startDate || endDate) {
        if (item.dueDate) {
          const dDate = new Date(item.dueDate);
          if (startDate && dDate < new Date(startDate)) matchDate = false;
          if (endDate && dDate > new Date(endDate)) matchDate = false;
        } else {
          matchDate = false; // Exclude fees without due date if a date filter is active
        }
      }

      return matchSearch && matchClass && matchStatus && matchDate;
    });
  }, [reportData, searchTerm, classFilter, statusFilter, startDate, endDate]);

  const { items: sortedData, requestSort, sortConfig } = useSortableData(filteredData);

  const renderSortIndicator = (key) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const handleExportExcel = () => {
    const dataToExport = sortedData.map(item => ({
      "Student Name": item.studentName,
      "Admission No": item.admissionNumber,
      "Class": item.className,
      "Fee Title": item.feeTitle,
      "Total Due": item.totalDue,
      "Total Paid": item.totalPaid,
      "Balance": item.balance,
      "Due Date": item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "N/A",
      "Status": item.status
    }));
    exportToExcel(dataToExport, "Fee_Reports");
  };

  const handleExportPDF = () => {
    const columns = ["Student Name", "Admission No", "Class", "Fee Title", "Total Due", "Total Paid", "Balance", "Due Date", "Status"];
    const rows = filteredData.map(item => [
      item.studentName,
      item.admissionNumber,
      item.className,
      item.feeTitle,
      `Rs. ${item.totalDue}`,
      `Rs. ${item.totalPaid}`,
      `Rs. ${item.balance}`,
      item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "N/A",
      item.status
    ]);
    exportToPDF(columns, rows, "Fee_Reports", "Fee Collections Report");
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case "Paid":
        return <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}><CheckCircle size={12}/> Paid</span>;
      case "Partial":
        return <span style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}><Clock size={12}/> Partial</span>;
      case "Overdue":
        return <span style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}><AlertCircle size={12}/> Overdue</span>;
      default:
        return <span style={{ background: "rgba(107, 114, 128, 0.1)", color: "#6b7280", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}><Clock size={12}/> Pending</span>;
    }
  };

  if (loadingUsers || loadingClasses) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Reports...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>Fee Reports</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Analyze and filter fee collections across all students.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <TableFilterHeader
          searchQuery={searchTerm}
          setSearchQuery={setSearchTerm}
          searchPlaceholder="Search by student name or admission no..."
          filters={[
            {
              label: "All Classes",
              value: classFilter,
              onChange: setClassFilter,
              options: classes.map(c => ({
                label: `${c.name} ${c.section || ''}`.trim(),
                value: `${c.name} ${c.section || ''}`.trim()
              }))
            },
            {
              label: "All Statuses",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { label: "Paid", value: "Paid" },
                { label: "Partial", value: "Partial" },
                { label: "Pending", value: "Pending" },
                { label: "Overdue", value: "Overdue" }
              ]
            }
          ]}
          columns={exportColumnsList}
          selectedColumns={selectedColumns}
          setSelectedColumns={setSelectedColumns}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        >
          <DateRangePicker 
            startDate={startDate} 
            endDate={endDate} 
            setStartDate={setStartDate} 
            setEndDate={setEndDate} 
            defaultRange="mtd" 
          />
        </TableFilterHeader>
      </div>

      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                {selectedColumns.includes("sno") && <th style={{ padding: "1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>S.No</th>}
                {selectedColumns.includes("student_name") && <th style={{ padding: "1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("studentName")}>Student{renderSortIndicator("studentName")}</th>}
                {selectedColumns.includes("class_name") && <th style={{ padding: "1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("className")}>Class{renderSortIndicator("className")}</th>}
                {selectedColumns.includes("fee_title") && <th style={{ padding: "1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("feeTitle")}>Fee Title{renderSortIndicator("feeTitle")}</th>}
                {selectedColumns.includes("total_due") && <th style={{ padding: "1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("totalDue")}>Amount Due{renderSortIndicator("totalDue")}</th>}
                {selectedColumns.includes("total_paid") && <th style={{ padding: "1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("totalPaid")}>Amount Paid{renderSortIndicator("totalPaid")}</th>}
                {selectedColumns.includes("balance") && <th style={{ padding: "1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("balance")}>Balance{renderSortIndicator("balance")}</th>}
                {selectedColumns.includes("due_date") && <th style={{ padding: "1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("dueDate")}>Due Date{renderSortIndicator("dueDate")}</th>}
                {selectedColumns.includes("status") && <th style={{ padding: "1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("status")}>Status{renderSortIndicator("status")}</th>}
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? sortedData.map((row, idx) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--glass-border)" }} className="hover-row">
                  {selectedColumns.includes("sno") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "500" }}>{idx + 1}</td>}
                  {selectedColumns.includes("student_name") && (
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{row.studentName}</div>
                      {selectedColumns.includes("admission_number") && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{row.admissionNumber}</div>}
                    </td>
                  )}
                  {selectedColumns.includes("class_name") && <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{row.className}</td>}
                  {selectedColumns.includes("fee_title") && <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{row.feeTitle}</td>}
                  {selectedColumns.includes("total_due") && <td style={{ padding: "1rem", fontWeight: "600" }}>₹{row.totalDue}</td>}
                  {selectedColumns.includes("total_paid") && <td style={{ padding: "1rem", fontWeight: "600", color: "#10b981" }}>₹{row.totalPaid}</td>}
                  {selectedColumns.includes("balance") && (
                    <td style={{ padding: "1rem", color: row.balance > 0 ? "#ef4444" : "#10b981", fontWeight: "600" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", padding: "0.25rem 0.5rem", borderRadius: "12px", background: row.balance > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)" }}>
                        ₹{row.balance}
                      </div>
                    </td>
                  )}
                  {selectedColumns.includes("due_date") && (
                    <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}
                    </td>
                  )}
                  {selectedColumns.includes("status") && (
                    <td style={{ padding: "1rem" }}>
                      {getStatusBadge(row.status)}
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    No fee records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
