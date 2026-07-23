import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Receipt, PlusCircle, Printer, Trash2, Edit } from "lucide-react";
import TableFilterHeader from "../components/TableFilterHeader";
import { useSortableData } from "../hooks/useSortableData";
import { exportToExcel, exportToPDF, generateReceiptPDF } from "../utils/exportUtils";
import StudentLedgerModal from "../components/StudentLedgerModal";
import PaymentSelectionModal from "../components/PaymentSelectionModal";
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
    "sno", "name", "admission_number", "doj", "class_name", "total_due", "total_paid", "balance", "actions"
  ]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [studentLedger, setStudentLedger] = useState({ fees: [], payments: [] });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ feeIds: [], amount: "", paymentMode: "Cash", remarks: "" });
  const [isPaying, setIsPaying] = useState(false);

  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const [paymentsData, setPaymentsData] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [balancesMap, setBalancesMap] = useState({});
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 100;

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchClasses());
  }, [dispatch]);

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
  }, [students, refreshTrigger]);

  useEffect(() => {
    if (currentView === "collected") {
      setSelectedColumns(["sno", "date", "studentName", "admissionNumber", "class_name", "feeTitle", "amount", "mode", "actions"]);
    } else {
      setSelectedColumns(["sno", "name", "admission_number", "doj", "class_name", "total_due", "total_paid", "balance", "actions"]);
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
            const grouped = res.data.payments.reduce((acc, curr) => {
              if (curr.receipt_id) {
                if (!acc[curr.receipt_id]) {
                  acc[curr.receipt_id] = {
                    ...curr,
                    amount_paid: 0,
                    remarks: [],
                    isGrouped: true,
                    groupedPayments: []
                  };
                }
                acc[curr.receipt_id].amount_paid += Number(curr.amount_paid || 0);
                
                let title = 'General Fee';
                if (curr.fee?.title) title = curr.fee.title;
                else if (curr.fee_title) title = curr.fee_title;
                else if (curr.remarks && curr.remarks.startsWith("Fee Payment: ")) {
                   title = curr.remarks.replace("Fee Payment: ", "").trim();
                }
                title = title.replace(/\(\+₹0 Late Fee\)/g, "").replace(/\(\+Rs\. 0 Late Fee\)/g, "").trim();
                if (title.includes(",")) {
                   // legacy
                   acc[curr.receipt_id].remarks.push(...title.split(",").map(s => s.trim()));
                } else {
                   acc[curr.receipt_id].remarks.push(title);
                }
                
                acc[curr.receipt_id].groupedPayments.push(curr);
              } else {
                acc[`no-receipt-${curr.id}`] = curr;
              }
              return acc;
            }, {});

            const processedPayments = Object.values(grouped).map(p => {
              if (p.isGrouped) {
                return {
                  ...p,
                  remarks: [...new Set(p.remarks)].join(", ")
                };
              }
              return p;
            }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

            setPaymentsData(processedPayments);
          }
        } catch (error) {
          toast.error("Failed to load payments ledger");
        } finally {
          setLoadingPayments(false);
        }
      };
      fetchPayments();
    }
  }, [currentView, startDate, endDate, refreshTrigger]);



  const viewOptions = [
    { id: "students", label: "Active Students" },
    { id: "exempted", label: "Exempted Students" },
    { id: "dues", label: "Pending Dues" },
    { id: "collected", label: "Total Collected" }
  ];

  // Process data based on view
  const processedData = useMemo(() => {
    let data = users.filter(u => u.type === "student");

    // Removed date filtering for students/exempted so it doesn't hide students
    // when a date range (like "Today") is selected for checking payments.

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
        section: s.classes && s.classes.length > 0 && classes.find(c => c.id === s.classes[0])?.section ? classes.find(c => c.id === s.classes[0]).section : "",
        totalDue: b.totalDue,
        totalPaid: b.totalPaid,
        balance: s.fee_exempted ? 0 : b.balance,
        doj: s.admission_date ? new Date(s.admission_date).toLocaleDateString() : (s.created_at ? new Date(s.created_at).toLocaleDateString() : "N/A")
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
  }, [users, classes, currentView, startDate, endDate, balancesMap]);

  const filteredData = useMemo(() => {
    return processedData.filter(item => 
      ((item.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
      (item.admission_number?.toLowerCase() || "").includes(searchTerm.toLowerCase())) &&
      (!selectedClassFilter || item.baseClassName === selectedClassFilter) &&
      (!selectedSectionFilter || item.section === selectedSectionFilter)
    );
  }, [processedData, searchTerm, selectedClassFilter, selectedSectionFilter]);

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
      return { ...item, className, baseClassName };
    }).filter(item => {
      const s = item.student;
      const matchesSearch = (s?.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
             (s?.admission_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
             (item.fee?.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
             (item.remarks?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesMode = !selectedPaymentMode || item.payment_mode === selectedPaymentMode;
      const matchesClass = !selectedClassFilter || item.baseClassName === selectedClassFilter;
      const matchesSection = !selectedSectionFilter || item.section === selectedSectionFilter;
      return matchesSearch && matchesMode && matchesClass && matchesSection;
    });
  }, [paymentsData, searchTerm, selectedPaymentMode, users, classes, selectedClassFilter, selectedSectionFilter]);

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
  ] : [
    { key: "sno", label: "S.No" },
    { key: "name", label: "Name" },
    { key: "admission_number", label: "Admission No" },
    { key: "doj", label: "Date of Joining" },
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
          item.className,
          item.fee?.title || item.remarks || "N/A",
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
          "Class": item.className,
          "Fee Title": item.fee?.title || item.remarks || "N/A",
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
    if (!paymentForm.feeIds || paymentForm.feeIds.length === 0 || !paymentForm.amount) {
      return toast.error("Please select at least one fee and enter an amount");
    }

    setIsPaying(true);
    try {
        let remainingAmount = Number(paymentForm.amount);
        let totalPaymentAmount = 0;
        const feeTitles = [];
        
        for (const feeId of paymentForm.feeIds) {
            const feeObj = studentLedger.fees.find(f => f.id === feeId);
            if (!feeObj) continue;
            
            const dueAmount = Number(feeObj.fee?.amount || 0) - Number(feeObj.total_paid_amount || 0);
            if (remainingAmount <= 0) break;
            
            const paymentAmount = Math.min(remainingAmount, dueAmount);
            totalPaymentAmount += paymentAmount;
            feeTitles.push(feeObj.fee?.title || "Fee");
            remainingAmount -= paymentAmount;
        }

        if (totalPaymentAmount === 0) {
            setIsPaying(false);
            return toast.error("Invalid payment configuration");
        }

        const paymentsPayload = [];
        let tempRemaining = Number(paymentForm.amount);
        
        for (const feeId of paymentForm.feeIds) {
            const feeObj = studentLedger.fees.find(f => f.id === feeId);
            if (!feeObj) continue;
            
            const dueAmount = Number(feeObj.fee?.amount || 0) - Number(feeObj.total_paid_amount || 0);
            if (tempRemaining <= 0) break;
            
            const paymentAmount = Math.min(tempRemaining, dueAmount);
            
            paymentsPayload.push({
                feeId: feeId,
                amount: paymentAmount,
                title: feeObj.fee?.title || "Fee"
            });
            
            tempRemaining -= paymentAmount;
        }

      const res = await api.post("/finance_panel/logPayment", {
        data: {
          studentId: selectedStudent.id,
          paymentMode: paymentForm.paymentMode,
          remarks: paymentForm.remarks,
          payments: paymentsPayload
        }
      });
      if (res.data.success) {
        toast.success("Payment recorded successfully");
        setRefreshTrigger(prev => prev + 1);
        
        const completePayments = res.data.payments.map((p, idx) => ({
            ...p,
            fee_title: paymentsPayload[idx]?.title || p.remarks,
            fee: { title: paymentsPayload[idx]?.title || "Fee" }
        }));
        generateReceiptPDF(completePayments, selectedStudent, res.data.receipt);

        setPaymentForm({ feeIds: [], amount: "", paymentMode: "Cash", remarks: "" });
        setIsPaymentModalOpen(false);
        dispatch(fetchUsers());
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log payment");
    } finally {
      setIsPaying(false);
    }
  };

  const handleDeletePayment = async (p) => {
    if (!window.confirm("Are you sure you want to delete this payment? This action cannot be undone and will recalculate dues.")) return;
    try {
      if (p.isGrouped) {
        for (const payment of p.groupedPayments) {
           await api.delete(`/finance_panel/payments/${payment.id}`);
        }
      } else {
        await api.delete(`/finance_panel/payments/${p.id}`);
      }
      toast.success("Payment deleted successfully");
      setRefreshTrigger(prev => prev + 1);
      dispatch(fetchUsers());
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete payment");
    }
  };

  const handleEditPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!editingPayment.isGrouped && !editingPayment.amount_paid) return toast.error("Amount is required");

    setIsPaying(true);
    try {
      if (editingPayment.isGrouped) {
        await Promise.all(editingPayment.groupedPayments.map(p => 
          api.put(`/finance_panel/payments/${p.id}`, {
            amount_paid: Number(p.amount_paid),
            payment_mode: editingPayment.payment_mode,
            remarks: p.remarks
          })
        ));
      } else {
        await api.put(`/finance_panel/payments/${editingPayment.id}`, {
          amount_paid: Number(editingPayment.amount_paid),
          payment_mode: editingPayment.payment_mode,
          remarks: editingPayment.remarks
        });
      }
      toast.success("Payment updated successfully");
      setIsEditPaymentModalOpen(false);
      setEditingPayment(null);
      setRefreshTrigger(prev => prev + 1);
      dispatch(fetchUsers());
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update payment");
    } finally {
      setIsPaying(false);
    }
  };

  if (loadingUsers || loadingClasses) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Metrics...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
        <button onClick={() => navigate("/dashboard")} className="btn btn-ghost" style={{ padding: "0.25rem 0.5rem" }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0" }}>Dashboard Metrics</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", margin: "0" }}>Detailed breakdown of financial metrics.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
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
        <div style={{ flexShrink: 0 }}>
          <TableFilterHeader
          searchQuery={searchTerm}
          setSearchQuery={setSearchTerm}
          searchPlaceholder="Search by student name or admission no..."
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

        {(currentView === "collected" || currentView === "dues") && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.875rem" }}>
            {currentView === "collected" && (
              <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "0.35rem 0.75rem", borderRadius: "6px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                Total Displayed Amount: ₹{sortedData.reduce((acc, curr) => acc + Number(curr.amount_paid || 0), 0).toLocaleString()}
              </div>
            )}
            {currentView === "dues" && (
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
        )}

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
                  {selectedColumns.includes("actions") && <th style={{ padding: "0.5rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>RECEIPT</th>}
                </tr>
              ) : (
                <tr style={{ borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)" }}>
                  {selectedColumns.includes("sno") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>S.NO</th>}
                  {selectedColumns.includes("name") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("name")}>STUDENT{renderSortIndicator("name")}</th>}
                  {selectedColumns.includes("admission_number") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("admission_number")}>ADM NO{renderSortIndicator("admission_number")}</th>}
                  {selectedColumns.includes("doj") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("doj")}>DATE OF JOINING{renderSortIndicator("doj")}</th>}
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
                    {selectedColumns.includes("feeTitle") && (
                      <td 
                        style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={p.fee?.title || p.remarks || "N/A"}
                      >
                        {(() => {
                           let text = p.fee?.title || p.remarks || "N/A";
                           if (typeof text === 'string' && text.startsWith("Fee Payment: ")) text = text.replace("Fee Payment: ", "");
                           return text;
                        })()}
                      </td>
                    )}
                    {selectedColumns.includes("amount") && <td style={{ padding: "0.5rem 1rem", color: "#10b981", fontWeight: "500" }}>₹{p.amount_paid}</td>}
                    {selectedColumns.includes("mode") && (
                      <td style={{ padding: "0.5rem 1rem" }}>
                        <span style={{ background: "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "500" }}>{p.payment_mode}</span>
                      </td>
                    )}
                    {selectedColumns.includes("actions") && (
                      <td style={{ padding: "0.5rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button onClick={() => generateReceiptPDF(p.isGrouped ? p.groupedPayments : p, p.student, p.receipts)} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.875rem", color: "var(--accent-primary)", fontWeight: "500" }}>
                            <Printer size={16} style={{ marginRight: "0.5rem" }} /> Print Receipt
                          </button>
                          {isFinanceTeam && (
                            <>
                              <button onClick={() => { setEditingPayment(p); setIsEditPaymentModalOpen(true); }} className="btn-ghost" style={{ padding: "0.5rem", color: "#3b82f6", borderRadius: "6px" }} title="Edit Payment">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDeletePayment(p)} className="btn-ghost" style={{ padding: "0.5rem", color: "#ef4444", borderRadius: "6px" }} title="Delete Payment">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
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
                    {selectedColumns.includes("doj") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.doj}</td>}
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
                        {!s.fee_exempted && s.balance > 0 && isFinanceTeam && (
                          <button onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(s); }} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.875rem", fontWeight: "500" }}>
                            <PlusCircle size={16} style={{ marginRight: "0.5rem" }} /> Log Payment
                          </button>
                        )}
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
                    // Show limited pages (first, last, and around current)
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

      {/* New sophisticated Payment Modal */}
      <PaymentSelectionModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        selectedStudent={selectedStudent} 
        onPaymentSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />
      {/* Edit Payment Modal */}
      {isEditPaymentModalOpen && editingPayment && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div className="glass-panel modal-content animate-fade-in" style={{ width: "100%", maxWidth: "800px", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: "2rem", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexShrink: 0 }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Edit Payment</h2>
              <button onClick={() => { setIsEditPaymentModalOpen(false); setEditingPayment(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "var(--text-secondary)" }}>&times;</button>
            </div>
            <form onSubmit={handleEditPaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", overflow: "hidden", flex: 1 }}>
              {editingPayment.isGrouped ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflow: "hidden", flex: 1 }}>
                  <div style={{ padding: "1rem", background: "rgba(0,0,0,0.02)", borderRadius: "8px", border: "1px solid var(--glass-border)", flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                      <label style={{ fontSize: "0.875rem", fontWeight: "600", margin: 0 }}>Global Payment Mode</label>
                      <select className="input-glass" style={{ width: "100%", maxWidth: "250px" }} value={editingPayment.payment_mode} onChange={e => setEditingPayment({...editingPayment, payment_mode: e.target.value})}>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Online">Online / UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Concession">Concession / Discount</option>
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.5rem", flex: 1 }}>
                    {editingPayment.groupedPayments.map((gp, idx) => (
                      <div key={gp.id} style={{ padding: "1rem", border: "1px solid var(--glass-border)", borderRadius: "8px", background: "rgba(0,0,0,0.02)" }}>
                        <p style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-primary)" }}>
                          {gp.fee?.title || gp.remarks || "Fee Item"}
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>Amount Paid (₹)</label>
                            <input 
                              type="number" required min="0" className="input-glass" style={{ width: "100%", padding: "0.5rem" }} 
                              value={gp.amount_paid} 
                              onChange={e => {
                                const newGrouped = [...editingPayment.groupedPayments];
                                newGrouped[idx] = { ...newGrouped[idx], amount_paid: e.target.value };
                                setEditingPayment({ ...editingPayment, groupedPayments: newGrouped });
                              }} 
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>Remarks</label>
                            <input 
                              type="text" className="input-glass" style={{ width: "100%", padding: "0.5rem" }} 
                              value={gp.remarks || ""} 
                              onChange={e => {
                                const newGrouped = [...editingPayment.groupedPayments];
                                newGrouped[idx] = { ...newGrouped[idx], remarks: e.target.value };
                                setEditingPayment({ ...editingPayment, groupedPayments: newGrouped });
                              }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", paddingRight: "0.5rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Amount Paid (₹)</label>
                      <input type="number" required min="1" className="input-glass" style={{ width: "100%" }} value={editingPayment.amount_paid} onChange={e => setEditingPayment({...editingPayment, amount_paid: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Payment Mode</label>
                      <select className="input-glass" style={{ width: "100%" }} value={editingPayment.payment_mode} onChange={e => setEditingPayment({...editingPayment, payment_mode: e.target.value})}>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Online">Online / UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Concession">Concession / Discount</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Remarks</label>
                    <input type="text" className="input-glass" style={{ width: "100%" }} value={editingPayment.remarks || ""} onChange={e => setEditingPayment({...editingPayment, remarks: e.target.value})} />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexShrink: 0 }}>
                <button type="button" onClick={() => { setIsEditPaymentModalOpen(false); setEditingPayment(null); }} className="btn btn-ghost" style={{ flex: 1, justifyContent: "center", border: "1px solid var(--glass-border)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={isPaying} className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                  {isPaying ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
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
