import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Receipt, PlusCircle, Printer } from "lucide-react";
import TableFilterHeader from "../components/TableFilterHeader";
import { useSortableData } from "../hooks/useSortableData";
import { exportToExcel, exportToPDF, generateReceiptPDF } from "../utils/exportUtils";
import StudentLedgerModal from "../components/StudentLedgerModal";
import { toast } from "react-toastify";
import api from "../services/api";

const DashboardMetrics = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get("view") || "students";

  const { users, classes, loadingUsers, loadingClasses, globalDateRange } = useSelector((state) => state.data);
  const { startDate, endDate } = globalDateRange;
  const { user } = useSelector((state) => state.auth);
  const isFinanceTeam = user?.type === 'finance' || user?.type === 'accountant';

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColumns, setSelectedColumns] = useState([
    "sno", "name", "admission_number", "class_name", "total_due", "total_paid", "balance", "actions"
  ]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [studentLedger, setStudentLedger] = useState({ fees: [], payments: [] });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ feeId: "", amount: "", paymentMode: "Cash", remarks: "" });
  const [isPaying, setIsPaying] = useState(false);

  const [paymentsData, setPaymentsData] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchClasses());
  }, [dispatch]);

  useEffect(() => {
    if (currentView === "collected") {
      setSelectedColumns(["sno", "date", "studentName", "admissionNumber", "feeTitle", "amount", "mode", "actions"]);
    } else {
      setSelectedColumns(["sno", "name", "admission_number", "class_name", "total_due", "total_paid", "balance", "actions"]);
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
    { id: "students", label: "Active Students" },
    { id: "exempted", label: "Exempted Students" },
    { id: "dues", label: "Pending Dues" },
    { id: "collected", label: "Total Collected" }
  ];

  // Process data based on view
  const processedData = useMemo(() => {
    let data = users.filter(u => u.type === "student");

    // Filter by createdAt for active students / exempted
    if ((currentView === "students" || currentView === "exempted") && (startDate || endDate)) {
      data = data.filter(s => {
        if (!s.created_at) return true;
        const d = new Date(s.created_at);
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
        return true;
      });
    }

    const enriched = data.map(s => {
      let className = "N/A";
      if (s.classes && s.classes.length > 0) {
        const cls = classes.find(c => c.id === s.classes[0]);
        if (cls) className = `${cls.name} ${cls.section || ''}`.trim();
      }

      let totalDue = 0;
      let totalPaid = 0;
      
      if (!s.fee_exempted) {
        if (s.fees && Array.isArray(s.fees)) {
          s.fees.forEach(f => {
            let isPending = true;
            if (endDate && f.fee?.dueDate) {
              const dDate = new Date(f.fee.dueDate);
              if (dDate > new Date(endDate)) isPending = false; // Exclude future fees
            }
            if (isPending) {
              totalDue += Number(f.fee?.amount || 0);
              totalPaid += Number(f.total_paid_amount || 0);
            }
          });
        }
      }

      return {
        ...s,
        className,
        totalDue,
        totalPaid,
        balance: s.fee_exempted ? 0 : Math.max(0, totalDue - totalPaid)
      };
    });

    switch (currentView) {
      case "exempted":
        return enriched.filter(s => s.fee_exempted);
      case "dues":
        return enriched.filter(s => !s.fee_exempted && s.balance > 0);
      case "collected":
        return enriched.filter(s => !s.fee_exempted && s.totalPaid > 0);
      case "students":
      default:
        return enriched; // All students
    }
  }, [users, classes, currentView, startDate, endDate]);

  const filteredData = useMemo(() => {
    return processedData.filter(item => 
      (item.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
      (item.admission_number?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );
  }, [processedData, searchTerm]);

  const filteredPayments = useMemo(() => {
    return paymentsData.filter(item => {
      const s = item.student;
      return (s?.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
             (s?.admission_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
             (item.fee?.title?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    });
  }, [paymentsData, searchTerm]);

  const { items: sortedData, requestSort, sortConfig } = useSortableData(
    currentView === "collected" ? filteredPayments : filteredData
  );

  const renderSortIndicator = (key) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const exportColumnsList = currentView === "collected" ? [
    { key: "sno", label: "S.No" },
    { key: "date", label: "Date" },
    { key: "studentName", label: "Student Name" },
    { key: "admissionNumber", label: "Admission No" },
    { key: "feeTitle", label: "Fee Title" },
    { key: "amount", label: "Amount Paid" },
    { key: "mode", label: "Mode" }
  ] : [
    { key: "sno", label: "S.No" },
    { key: "name", label: "Name" },
    { key: "admission_number", label: "Admission No" },
    { key: "class_name", label: "Class" },
    { key: "total_due", label: "Total Due" },
    { key: "total_paid", label: "Total Paid" },
    { key: "balance", label: "Balance" }
  ];

  const handleExportPDF = () => {
    const columns = exportColumnsList.map(c => c.label);
    const rows = sortedData.map((item, index) => {
      if (currentView === "collected") {
        return [
          index + 1,
          new Date(item.created_at).toLocaleDateString(),
          item.student?.name || "N/A",
          item.student?.admission_number || "-",
          item.fee?.title || "N/A",
          `Rs. ${item.amount_paid}`,
          item.payment_mode
        ];
      }
      return [
        index + 1,
        item.name,
        item.admission_number || "-",
        item.className,
        `Rs. ${item.totalDue}`,
        `Rs. ${item.totalPaid}`,
        `Rs. ${item.balance}`
      ];
    });
    exportToPDF(columns, rows, `Dashboard_Metrics_${currentView}`, `Dashboard Metrics - ${currentView.toUpperCase()}`);
  };

  const handleExportExcel = () => {
    const data = sortedData.map((item, index) => {
      if (currentView === "collected") {
        return {
          "S.No": index + 1,
          "Date": new Date(item.created_at).toLocaleDateString(),
          "Student Name": item.student?.name || "N/A",
          "Admission No": item.student?.admission_number || "-",
          "Fee Title": item.fee?.title || "N/A",
          "Amount Paid": `Rs. ${item.amount_paid}`,
          "Mode": item.payment_mode
        };
      }
      return {
        "S.No": index + 1,
        "Name": item.name,
        "Admission No": item.admission_number || "-",
        "Class": item.className,
        "Total Due": `Rs. ${item.totalDue}`,
        "Total Paid": `Rs. ${item.totalPaid}`,
        "Balance": `Rs. ${item.balance}`
      };
    });
    exportToExcel(data, `Dashboard_Metrics_${currentView}`);
  };

  const handleOpenPaymentModal = async (student) => {
    setSelectedStudent(student);
    setIsPaymentModalOpen(true);
    setLedgerLoading(true);
    try {
      const res = await api.get(`/finance_panel/getStudentLedger/${student.id}`);
      if (res.data.success) {
        setStudentLedger(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load ledger details");
    } finally {
      setLedgerLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.feeId || !paymentForm.amount) {
      return toast.error("Please fill all required fields");
    }

    setIsPaying(true);
    try {
      const res = await api.post("/finance_panel/logPayment", {
        data: {
          studentId: selectedStudent.id,
          feeId: paymentForm.feeId,
          amount: Number(paymentForm.amount),
          paymentMode: paymentForm.paymentMode,
          remarks: paymentForm.remarks
        }
      });
      if (res.data.success) {
        toast.success("Payment recorded successfully");
        
        const feeDetails = studentLedger.fees.find(f => f.fee_id === paymentForm.feeId)?.fee;
        const completePayment = { ...res.data.payment, fee: feeDetails };
        generateReceiptPDF(completePayment, selectedStudent);

        setPaymentForm({ feeId: "", amount: "", paymentMode: "Cash", remarks: "" });
        setIsPaymentModalOpen(false);
        dispatch(fetchUsers());
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log payment");
    } finally {
      setIsPaying(false);
    }
  };

  if (loadingUsers || loadingClasses) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Metrics...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => navigate("/dashboard")} className="btn btn-ghost" style={{ padding: "0.5rem" }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>Dashboard Metrics</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Detailed breakdown of financial metrics.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        {viewOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setSearchParams({ view: opt.id })}
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

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <TableFilterHeader
          searchQuery={searchTerm}
          setSearchQuery={setSearchTerm}
          searchPlaceholder="Search by student name or admission no..."
          exportColumns={exportColumnsList}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
          selectedColumns={selectedColumns}
          setSelectedColumns={setSelectedColumns}
        />

        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
            <thead>
              {currentView === "collected" ? (
                <tr style={{ borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)" }}>
                  {selectedColumns.includes("sno") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>S.NO</th>}
                  {selectedColumns.includes("date") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("created_at")}>DATE{renderSortIndicator("created_at")}</th>}
                  {selectedColumns.includes("studentName") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("student.name")}>STUDENT</th>}
                  {selectedColumns.includes("admissionNumber") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("student.admission_number")}>ADM NO</th>}
                  {selectedColumns.includes("feeTitle") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("fee.title")}>FEE TITLE</th>}
                  {selectedColumns.includes("amount") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("amount_paid")}>AMOUNT PAID{renderSortIndicator("amount_paid")}</th>}
                  {selectedColumns.includes("mode") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("payment_mode")}>MODE{renderSortIndicator("payment_mode")}</th>}
                  {selectedColumns.includes("actions") && <th style={{ padding: "1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>RECEIPT</th>}
                </tr>
              ) : (
                <tr style={{ borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)" }}>
                  {selectedColumns.includes("sno") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>S.NO</th>}
                  {selectedColumns.includes("name") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("name")}>STUDENT{renderSortIndicator("name")}</th>}
                  {selectedColumns.includes("admission_number") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("admission_number")}>ADM NO{renderSortIndicator("admission_number")}</th>}
                  {selectedColumns.includes("class_name") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("className")}>CLASS{renderSortIndicator("className")}</th>}
                  {selectedColumns.includes("total_due") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("totalDue")}>TOTAL DUE{renderSortIndicator("totalDue")}</th>}
                  {selectedColumns.includes("total_paid") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("totalPaid")}>TOTAL PAID{renderSortIndicator("totalPaid")}</th>}
                  {selectedColumns.includes("balance") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("balance")}>BALANCE{renderSortIndicator("balance")}</th>}
                  {selectedColumns.includes("actions") && <th style={{ padding: "1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>ACTIONS</th>}
                </tr>
              )}
            </thead>
            <tbody>
              {currentView === "collected" ? (
                loadingPayments ? (
                  <tr><td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading Payments...</td></tr>
                ) : sortedData.length > 0 ? sortedData.map((p, idx) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s" }} className="hover-row">
                    {selectedColumns.includes("sno") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "500" }}>{idx + 1}</td>}
                    {selectedColumns.includes("date") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{new Date(p.created_at).toLocaleDateString()}</td>}
                    {selectedColumns.includes("studentName") && <td style={{ padding: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{p.student?.name || "N/A"}</td>}
                    {selectedColumns.includes("admissionNumber") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{p.student?.admission_number || "-"}</td>}
                    {selectedColumns.includes("feeTitle") && <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{p.fee?.title || "N/A"}</td>}
                    {selectedColumns.includes("amount") && <td style={{ padding: "1rem", color: "#10b981", fontWeight: "500" }}>₹{p.amount_paid}</td>}
                    {selectedColumns.includes("mode") && (
                      <td style={{ padding: "1rem" }}>
                        <span style={{ background: "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "500" }}>{p.payment_mode}</span>
                      </td>
                    )}
                    {selectedColumns.includes("actions") && (
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <button onClick={() => generateReceiptPDF(p, p.student)} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.875rem", color: "var(--accent-primary)", fontWeight: "500" }}>
                          <Printer size={16} style={{ marginRight: "0.5rem" }} /> Print Receipt
                        </button>
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr><td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No payments recorded for this period.</td></tr>
                )
              ) : (
                sortedData.length > 0 ? sortedData.map((s, idx) => (
                  <tr key={s.id} onClick={() => { setSelectedStudent(s); setIsLedgerModalOpen(true); }} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s", cursor: "pointer" }} className="hover-row">
                    {selectedColumns.includes("sno") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "500" }}>{idx + 1}</td>}
                    {selectedColumns.includes("name") && (
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "0.875rem" }}>
                            {s.name?.charAt(0) || "S"}
                          </div>
                          <div style={{ fontWeight: "500", color: "var(--text-primary)" }}>{s.name}</div>
                        </div>
                      </td>
                    )}
                    {selectedColumns.includes("admission_number") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.admission_number || "-"}</td>}
                    {selectedColumns.includes("class_name") && <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{s.className}</td>}
                    {selectedColumns.includes("total_due") && <td style={{ padding: "1rem", color: "var(--text-primary)", fontWeight: "500" }}>₹{s.totalDue}</td>}
                    {selectedColumns.includes("total_paid") && <td style={{ padding: "1rem", color: "#10b981", fontWeight: "500" }}>₹{s.totalPaid}</td>}
                    {selectedColumns.includes("balance") && (
                      <td style={{ padding: "1rem", color: s.balance > 0 ? "#ef4444" : "#10b981", fontWeight: "600" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", padding: "0.25rem 0.5rem", borderRadius: "12px", background: s.balance > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)" }}>
                          ₹{s.balance}
                        </div>
                      </td>
                    )}
                    {selectedColumns.includes("actions") && (
                      <td style={{ padding: "1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                        {!s.fee_exempted && s.balance > 0 && isFinanceTeam && (
                          <button onClick={(e) => { e.stopPropagation(); setSelectedStudent(s); setIsPaymentModalOpen(true); }} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.875rem", fontWeight: "500" }}>
                            <PlusCircle size={16} style={{ marginRight: "0.5rem" }} /> Log Payment
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr><td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No data available for this metric.</td></tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedStudent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="glass-panel modal-content animate-fade-in" style={{ width: "100%", maxWidth: "500px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Log Payment for {selectedStudent.name}</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "var(--text-secondary)" }}>&times;</button>
            </div>

            {ledgerLoading ? (
              <p style={{ textAlign: "center", padding: "2rem" }}>Checking dues...</p>
            ) : selectedStudent.fee_exempted ? (
              <div style={{ padding: "2rem", textAlign: "center", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", color: "#10b981" }}>
                <p style={{ fontWeight: "600" }}>Student is fee exempted.</p>
                <button onClick={() => setIsPaymentModalOpen(false)} className="btn-ghost" style={{ marginTop: "1rem" }}>Close</button>
              </div>
            ) : studentLedger.fees.filter(f => f.payment_status !== "Paid").length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", background: "rgba(0, 0, 0, 0.02)", borderRadius: "8px", color: "var(--text-secondary)" }}>
                <p style={{ fontWeight: "500" }}>No pending dues. All clear!</p>
                <button onClick={() => setIsPaymentModalOpen(false)} className="btn-ghost" style={{ marginTop: "1rem" }}>Close</button>
              </div>
            ) : (
              <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Select Fee</label>
                  <select required className="input-glass" style={{ width: "100%" }} value={paymentForm.feeId} onChange={e => setPaymentForm({...paymentForm, feeId: e.target.value})}>
                    <option value="">-- Choose Fee --</option>
                    {studentLedger.fees.filter(f => f.payment_status !== "Paid").map(f => (
                      <option key={f.fee_id} value={f.fee_id}>{f.fee?.title} (Due: ₹{Number(f.fee?.amount || 0) - Number(f.total_paid_amount || 0)})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Amount Paying (₹)</label>
                    <input type="number" required min="1" className="input-glass" style={{ width: "100%" }} value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Payment Mode</label>
                      <select className="input-glass" style={{ width: "100%" }} value={paymentForm.paymentMode} onChange={e => setPaymentForm({...paymentForm, paymentMode: e.target.value})}>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Online">Online / UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Concession">Concession / Discount</option>
                      </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Remarks / Ref No (Optional)</label>
                  <input type="text" className="input-glass" style={{ width: "100%" }} value={paymentForm.remarks} onChange={e => setPaymentForm({...paymentForm, remarks: e.target.value})} />
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="btn-secondary" style={{ flex: 1, justifyContent: "center" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isPaying} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                    {isPaying ? "Processing..." : "Submit Payment"}
                  </button>
                </div>
              </form>
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

export default DashboardMetrics;
