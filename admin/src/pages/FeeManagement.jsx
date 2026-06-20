import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses, fetchFees } from "../features/dataSlice";
import TableFilterHeader from "../components/TableFilterHeader";
import { useSortableData } from "../hooks/useSortableData";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import DateRangePicker from "../components/DateRangePicker";
import { toast } from "react-toastify";
import api from "../services/api";
import { IndianRupee, Receipt } from "lucide-react";
import StudentLedgerModal from "../components/StudentLedgerModal";

const FeeManagement = () => {
  const dispatch = useDispatch();

  const { users, classes, loadingUsers, loadingClasses } = useSelector((state) => state.data);

  const [currentView, setCurrentView] = useState("students"); // 'students', 'collected', 'structures'
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const { start: startDate, end: endDate } = dateRange;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColumns, setSelectedColumns] = useState([
    "sno", "name", "admission_number", "class_name", "total_due", "total_paid", "balance", "actions"
  ]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  const [paymentsData, setPaymentsData] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [feeStructures, setFeeStructures] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [balancesMap, setBalancesMap] = useState({});
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 100;

  const getCurrentAcademicYear = () => {
    const today = new Date();
    const month = today.getMonth();
    let year = today.getFullYear();
    if (month < 3) year -= 1;
    return `${year}-${year + 1}`;
  };

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchClasses());
  }, [dispatch]);

  useEffect(() => {
    if (currentView === "structures" && feeStructures.length === 0) {
      setLoadingStructures(true);
      const academicYear = getCurrentAcademicYear();
      api.get(`/finance_panel/feeStructures?academic_year=${academicYear}`)
        .then(res => {
          if (res.data.success) {
            setFeeStructures(res.data.structures);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingStructures(false));
    }
  }, [currentView, feeStructures.length]);

  const students = useMemo(() => users.filter(u => u.type === "student"), [users]);

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

  useEffect(() => {
    if (currentView === "collected") {
      setSelectedColumns(["sno", "date", "studentName", "admissionNumber", "class_name", "feeTitle", "amount", "mode"]);
    } else if (currentView === "students") {
      setSelectedColumns(["sno", "name", "admission_number", "class_name", "total_due", "total_paid", "balance", "actions"]);
    } else if (currentView === "structures") {
      setSelectedColumns(["category", "class", "amount"]);
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === "collected") {
      const fetchPayments = async () => {
        setLoadingPayments(true);
        try {
          const params = new URLSearchParams();
          if (startDate) params.append("startDate", startDate);
          if (endDate) params.append("endDate", endDate);
          const res = await api.get(`/finance_panel/getAllPayments?${params.toString()}`);
          if (res.data.success) {
            setPaymentsData(res.data.payments);
          }
        } catch (error) {
          toast.error("Failed to load payments ledger");
        } finally {
          setLoadingPayments(false);
        }
      };
      fetchPayments();
    }
  }, [currentView, startDate, endDate]);

  const viewOptions = [
    { id: "students", label: "Class View (Dues & Balances)" },
    { id: "collected", label: "Ledger (Payment History)" },
    { id: "structures", label: "Fee Structures" }
  ];

  // Process data based on view
  const processedData = useMemo(() => {
    if (currentView === "structures") return feeStructures;

    let data = users.filter(u => u.type === "student");

    const enriched = data.map(s => {
      let className = "N/A";
      let baseClassName = "N/A";
      if (s.classes && s.classes.length > 0) {
        const cls = classes.find(c => c.id === s.classes[0]);
        if (cls) {
          className = `${cls.name} ${cls.section || ''}`.trim();
          baseClassName = cls.name;
        }
      }

      const b = balancesMap[s.id] || { totalDue: 0, totalPaid: 0, balance: 0 };

      return {
        ...s,
        className,
        baseClassName,
        totalDue: b.totalDue,
        totalPaid: b.totalPaid,
        balance: s.fee_exempted ? 0 : b.balance
      };
    });

    return enriched;
  }, [users, classes, currentView, balancesMap, feeStructures]);

  const formatCategory = (cat) => {
    if (!cat) return "Unknown";
    return cat.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const filteredData = useMemo(() => {
    if (currentView === "structures") {
      return processedData.filter(f => formatCategory(f.fee_category).toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return processedData.filter(item => 
      ((item.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
      (item.admission_number?.toLowerCase() || "").includes(searchTerm.toLowerCase())) &&
      (!selectedClassFilter || item.baseClassName === selectedClassFilter)
    );
  }, [processedData, searchTerm, selectedClassFilter, currentView]);

  const filteredPayments = useMemo(() => {
    return paymentsData.map(item => {
      const u = users.find(u => u.id === item.student_id);
      let className = "N/A";
      let baseClassName = "N/A";
      if (u && u.classes && u.classes.length > 0) {
        const cls = classes.find(c => c.id === u.classes[0]);
        if (cls) {
          className = `${cls.name} ${cls.section || ''}`.trim();
          baseClassName = cls.name;
        }
      }
      return { ...item, student: u, className, baseClassName };
    }).filter(item => {
      const s = item.student;
      const matchesSearch = (s?.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
             (s?.admission_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
             (item.fee?.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
             (item.remarks?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesMode = !selectedPaymentMode || item.payment_mode === selectedPaymentMode;
      const matchesClass = !selectedClassFilter || item.baseClassName === selectedClassFilter;
      return matchesSearch && matchesMode && matchesClass;
    });
  }, [paymentsData, searchTerm, selectedPaymentMode, users, classes, selectedClassFilter]);

  const { items: sortedData, requestSort, sortConfig } = useSortableData(
    currentView === "collected" ? filteredPayments : filteredData
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [currentView, searchTerm, selectedClassFilter, selectedPaymentMode, sortedData.length]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const renderSortIndicator = (key) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const exportColumnsList = currentView === "collected" ? [
    { key: "sno", label: "S.No" },
    { key: "date", label: "Date" },
    { key: "studentName", label: "Student Name" },
    { key: "admissionNumber", label: "Admission No" },
    { key: "class_name", label: "Class" },
    { key: "feeTitle", label: "Fee Title" },
    { key: "amount", label: "Amount Paid" },
    { key: "mode", label: "Mode" }
  ] : currentView === "students" ? [
    { key: "sno", label: "S.No" },
    { key: "name", label: "Name" },
    { key: "admission_number", label: "Admission No" },
    { key: "class_name", label: "Class" },
    { key: "total_due", label: "Total Due" },
    { key: "total_paid", label: "Total Paid" },
    { key: "balance", label: "Balance" }
  ] : [
    { key: "category", label: "Fee Category" },
    { key: "class", label: "Class / Identifier" },
    { key: "amount", label: "Amount (₹)" },
  ];

  const handleExportPDF = () => {
    const columns = exportColumnsList.filter(c => selectedColumns.includes(c.key)).map(c => c.label);
    let rows = [];
    if (currentView === "collected") {
      rows = sortedData.map((item, index) => {
        const row = [];
        if (selectedColumns.includes("sno")) row.push(index + 1);
        if (selectedColumns.includes("date")) row.push(new Date(item.created_at).toLocaleDateString());
        if (selectedColumns.includes("studentName")) row.push(item.student?.name || "N/A");
        if (selectedColumns.includes("admissionNumber")) row.push(item.student?.admission_number || "-");
        if (selectedColumns.includes("class_name")) row.push(item.className);
        if (selectedColumns.includes("feeTitle")) row.push(item.fee?.title || item.remarks || "N/A");
        if (selectedColumns.includes("amount")) row.push(`Rs. ${item.amount_paid}`);
        if (selectedColumns.includes("mode")) row.push(item.payment_mode);
        return row;
      });
    } else if (currentView === "students") {
      rows = sortedData.map((item, index) => {
        const row = [];
        if (selectedColumns.includes("sno")) row.push(index + 1);
        if (selectedColumns.includes("name")) row.push(item.name);
        if (selectedColumns.includes("admission_number")) row.push(item.admission_number || "-");
        if (selectedColumns.includes("class_name")) row.push(item.className);
        if (selectedColumns.includes("total_due")) row.push(`Rs. ${item.totalDue}`);
        if (selectedColumns.includes("total_paid")) row.push(`Rs. ${item.totalPaid}`);
        if (selectedColumns.includes("balance")) row.push(`Rs. ${item.balance}`);
        return row;
      });
    } else if (currentView === "structures") {
      rows = sortedData.map((item, index) => {
        const row = [];
        if (selectedColumns.includes("category")) row.push(formatCategory(item.fee_category));
        if (selectedColumns.includes("class")) row.push(item.class_name || "All Classes");
        if (selectedColumns.includes("amount")) row.push(`Rs. ${item.amount}`);
        return row;
      });
    }
    exportToPDF(columns, rows, `Fee_Management_${currentView}`, `Fee Management - ${currentView.toUpperCase()}`);
  };

  const handleExportExcel = () => {
    const data = sortedData.map((item, index) => {
      const row = {};
      if (currentView === "collected") {
        if (selectedColumns.includes("sno")) row["S.No"] = index + 1;
        if (selectedColumns.includes("date")) row["Date"] = new Date(item.created_at).toLocaleDateString();
        if (selectedColumns.includes("studentName")) row["Student Name"] = item.student?.name || "N/A";
        if (selectedColumns.includes("admissionNumber")) row["Admission No"] = item.student?.admission_number || "-";
        if (selectedColumns.includes("class_name")) row["Class"] = item.className;
        if (selectedColumns.includes("feeTitle")) row["Fee Title"] = item.fee?.title || item.remarks || "N/A";
        if (selectedColumns.includes("amount")) row["Amount Paid"] = `Rs. ${item.amount_paid}`;
        if (selectedColumns.includes("mode")) row["Mode"] = item.payment_mode;
      } else if (currentView === "students") {
        if (selectedColumns.includes("sno")) row["S.No"] = index + 1;
        if (selectedColumns.includes("name")) row["Name"] = item.name;
        if (selectedColumns.includes("admission_number")) row["Admission No"] = item.admission_number || "-";
        if (selectedColumns.includes("class_name")) row["Class"] = item.className;
        if (selectedColumns.includes("total_due")) row["Total Due"] = `Rs. ${item.totalDue}`;
        if (selectedColumns.includes("total_paid")) row["Total Paid"] = `Rs. ${item.totalPaid}`;
        if (selectedColumns.includes("balance")) row["Balance"] = `Rs. ${item.balance}`;
      } else if (currentView === "structures") {
        if (selectedColumns.includes("category")) row["Fee Category"] = formatCategory(item.fee_category);
        if (selectedColumns.includes("class")) row["Class / Identifier"] = item.class_name || "All Classes";
        if (selectedColumns.includes("amount")) row["Amount (₹)"] = `Rs. ${item.amount}`;
      }
      return row;
    });
    exportToExcel(data, `Fee_Management_${currentView}`);
  };

  if (loadingUsers || loadingClasses || loadingStructures) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Metrics...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Fee Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>High-level overview of school finances</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
        {viewOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setCurrentPage(1) || setCurrentView(opt.id)}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "0.875rem",
              background: currentView === opt.id ? "var(--accent-primary)" : "rgba(255, 255, 255, 0.05)",
              color: currentView === opt.id ? "white" : "var(--text-secondary)",
              border: "1px solid",
              borderColor: currentView === opt.id ? "var(--accent-primary)" : "var(--glass-border)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {currentView === "structures" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredData.length === 0 ? (
            <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
              No fee structures configured by finance team yet.
            </div>
          ) : (
            filteredData.map((fee, index) => {
              return (
                <div key={fee.id || index} className="glass-panel" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "4px" }}>{formatCategory(fee.fee_category)}</h3>
                    <div style={{ display: "flex", gap: "1.5rem", fontSize: "14px", color: "var(--text-secondary)", alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#a78bfa" }}><IndianRupee size={14} /> {fee.amount}</span>
                      <span>Class: {fee.class_name || "All Classes"}</span>
                      <span style={{ 
                        padding: "2px 8px", borderRadius: "12px", fontSize: "12px",
                        background: "rgba(16, 185, 129, 0.2)",
                        color: "#6ee7b7"
                      }}>
                        {fee.academic_year || "Active"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <TableFilterHeader
            searchQuery={searchTerm}
            setSearchQuery={setSearchTerm}
            searchPlaceholder={currentView === "collected" ? "Search payments..." : "Search students..."}
            filters={currentView === "collected" ? [
              {
                label: "All Payment Modes",
                value: selectedPaymentMode,
                onChange: setSelectedPaymentMode,
                options: [
                  { label: "Cash", value: "Cash" },
                  { label: "Online", value: "Online" },
                  { label: "Bank Transfer", value: "Bank Transfer" },
                  { label: "Cheque", value: "Cheque" }
                ]
              }
            ] : [
              {
                label: "All Classes",
                value: selectedClassFilter,
                onChange: setSelectedClassFilter,
                options: Array.from(new Set(classes.map(c => c.name))).filter(Boolean).map(name => ({ label: name, value: name }))
              }
            ]}
            exportColumns={exportColumnsList}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
          >
            {currentView === "collected" && (
              <DateRangePicker 
                startDate={startDate}
                endDate={endDate}
                onRangeChange={(range) => setDateRange(range)}
                setStartDate={(s) => setDateRange(prev => ({ ...prev, start: s }))}
                setEndDate={(e) => setDateRange(prev => ({ ...prev, end: e }))}
              />
            )}
          </TableFilterHeader>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.875rem" }}>
            {currentView === "collected" && (
              <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "0.35rem 0.75rem", borderRadius: "6px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                Total Displayed Amount: ₹{sortedData.reduce((acc, curr) => acc + Number(curr.amount_paid || 0), 0).toLocaleString()}
              </div>
            )}
            {currentView === "students" && (
              <>
                <div style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "0.35rem 0.75rem", borderRadius: "6px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  Total Displayed Due: ₹{sortedData.reduce((acc, curr) => acc + Number(curr.totalDue || 0), 0).toLocaleString()}
                </div>
                <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "0.35rem 0.75rem", borderRadius: "6px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  Total Displayed Paid: ₹{sortedData.reduce((acc, curr) => acc + Number(curr.totalPaid || 0), 0).toLocaleString()}
                </div>
                <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "0.35rem 0.75rem", borderRadius: "6px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  Total Displayed Balance: ₹{sortedData.reduce((acc, curr) => acc + Number(curr.balance || 0), 0).toLocaleString()}
                </div>
              </>
            )}
          </div>

          <div style={{ overflowX: "auto", marginTop: "1rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead>
                {currentView === "collected" ? (
                  <tr style={{ borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)" }}>
                    {selectedColumns.includes("sno") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>S.NO</th>}
                    {selectedColumns.includes("date") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("created_at")}>DATE{renderSortIndicator("created_at")}</th>}
                    {selectedColumns.includes("studentName") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("student.name")}>STUDENT</th>}
                    {selectedColumns.includes("admissionNumber") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("student.admission_number")}>ADM NO</th>}
                    {selectedColumns.includes("class_name") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("className")}>CLASS</th>}
                    {selectedColumns.includes("feeTitle") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("fee.title")}>FEE TITLE</th>}
                    {selectedColumns.includes("amount") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("amount_paid")}>AMOUNT PAID{renderSortIndicator("amount_paid")}</th>}
                    {selectedColumns.includes("mode") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("payment_mode")}>MODE{renderSortIndicator("payment_mode")}</th>}
                  </tr>
                ) : (
                  <tr style={{ borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)" }}>
                    {selectedColumns.includes("sno") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>S.NO</th>}
                    {selectedColumns.includes("name") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("name")}>STUDENT{renderSortIndicator("name")}</th>}
                    {selectedColumns.includes("admission_number") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("admission_number")}>ADM NO{renderSortIndicator("admission_number")}</th>}
                    {selectedColumns.includes("class_name") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("className")}>CLASS{renderSortIndicator("className")}</th>}
                    {selectedColumns.includes("total_due") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("totalDue")}>TOTAL DUE{renderSortIndicator("totalDue")}</th>}
                    {selectedColumns.includes("total_paid") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("totalPaid")}>TOTAL PAID{renderSortIndicator("totalPaid")}</th>}
                    {selectedColumns.includes("balance") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("balance")}>BALANCE{renderSortIndicator("balance")}</th>}
                    {selectedColumns.includes("actions") && <th style={{ padding: "0.5rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>ACTIONS</th>}
                  </tr>
                )}
              </thead>
              <tbody>
                {currentView === "collected" ? (
                  loadingPayments ? (
                    <tr><td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading Payments...</td></tr>
                  ) : paginatedData.length > 0 ? paginatedData.map((p, idx) => {
                    const actualIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                    return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s" }} className="hover-row">
                      {selectedColumns.includes("sno") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "500" }}>{actualIdx + 1}</td>}
                      {selectedColumns.includes("date") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{new Date(p.created_at).toLocaleDateString()}</td>}
                      {selectedColumns.includes("studentName") && <td style={{ padding: "0.5rem 1rem", fontWeight: "500", color: "var(--text-primary)" }}>{p.student?.name || "N/A"}</td>}
                      {selectedColumns.includes("admissionNumber") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{p.student?.admission_number || "-"}</td>}
                      {selectedColumns.includes("class_name") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{p.className || "-"}</td>}
                      {selectedColumns.includes("feeTitle") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)" }}>{p.fee?.title || p.remarks || "N/A"}</td>}
                      {selectedColumns.includes("amount") && <td style={{ padding: "0.5rem 1rem", color: "#10b981", fontWeight: "500" }}>₹{p.amount_paid}</td>}
                      {selectedColumns.includes("mode") && (
                        <td style={{ padding: "0.5rem 1rem" }}>
                          <span style={{ background: "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "500" }}>{p.payment_mode}</span>
                        </td>
                      )}
                    </tr>
                    );
                  }) : (
                    <tr><td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No payments recorded for this period.</td></tr>
                  )
                ) : (
                  paginatedData.length > 0 ? paginatedData.map((s, idx) => {
                    const actualIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                    return (
                    <tr key={s.id} onClick={() => { setSelectedStudent(s); setIsLedgerModalOpen(true); }} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s", cursor: "pointer" }} className="hover-row">
                      {selectedColumns.includes("sno") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "500" }}>{actualIdx + 1}</td>}
                      {selectedColumns.includes("name") && (
                        <td style={{ padding: "0.5rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "0.875rem" }}>
                              {s.name?.charAt(0) || "S"}
                            </div>
                            <div style={{ fontWeight: "500", color: "var(--text-primary)" }}>{s.name}</div>
                          </div>
                        </td>
                      )}
                      {selectedColumns.includes("admission_number") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.admission_number || "-"}</td>}
                      {selectedColumns.includes("class_name") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)" }}>{s.className}</td>}
                      {selectedColumns.includes("total_due") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-primary)", fontWeight: "500" }}>₹{s.totalDue}</td>}
                      {selectedColumns.includes("total_paid") && <td style={{ padding: "0.5rem 1rem", color: "#10b981", fontWeight: "500" }}>₹{s.totalPaid}</td>}
                      {selectedColumns.includes("balance") && (
                        <td style={{ padding: "0.5rem 1rem", color: s.balance > 0 ? "#ef4444" : "#10b981", fontWeight: "600" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", padding: "0.25rem 0.5rem", borderRadius: "12px", background: s.balance > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)" }}>
                            ₹{s.balance}
                          </div>
                        </td>
                      )}
                      {selectedColumns.includes("actions") && (
                        <td style={{ padding: "0.5rem 1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedStudent(s); setIsLedgerModalOpen(true); }} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.875rem", fontWeight: "500", color: "var(--text-secondary)" }}>
                            <Receipt size={16} style={{ marginRight: "0.5rem" }} /> View Ledger
                          </button>
                        </td>
                      )}
                    </tr>
                    );
                  }) : (
                    <tr><td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No data available for this metric.</td></tr>
                  )
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
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
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    {[...Array(totalPages)].map((_, i) => {
                      if (
                        i === 0 || 
                        i === totalPages - 1 || 
                        (i >= currentPage - 2 && i <= currentPage)
                      ) {
                        return (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            style={{
                              padding: "0.25rem 0.75rem",
                              borderRadius: "4px",
                              border: currentPage === i + 1 ? "none" : "1px solid var(--glass-border)",
                              background: currentPage === i + 1 ? "var(--accent-primary)" : "transparent",
                              color: currentPage === i + 1 ? "white" : "var(--text-primary)",
                              fontSize: "0.875rem",
                              cursor: "pointer"
                            }}
                          >
                            {i + 1}
                          </button>
                        );
                      } else if (i === currentPage - 3 || i === currentPage + 1) {
                        return <span key={i} style={{ color: "var(--text-secondary)", margin: "0 0.25rem" }}>...</span>;
                      }
                      return null;
                    })}
                  </div>
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
      )}
      <StudentLedgerModal 
        isOpen={isLedgerModalOpen} 
        onClose={() => setIsLedgerModalOpen(false)} 
        student={selectedStudent} 
      />
    </div>
  );
};

export default FeeManagement;
