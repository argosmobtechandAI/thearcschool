import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import api from "../services/api";
import { toast } from "react-toastify";
import TableFilterHeader from "../components/TableFilterHeader";
import { useSortableData } from "../hooks/useSortableData";
import { Eye, Receipt, PlusCircle, CheckCircle, Clock, Printer } from "lucide-react";
import { exportToExcel, exportToPDF, generateReceiptPDF } from "../utils/exportUtils";
import StudentLedgerModal from "../components/StudentLedgerModal";

const Ledger = () => {
  const dispatch = useDispatch();
  const { users, classes: globalClasses, loading } = useSelector((state) => state.data);

  const [studentSearch, setStudentSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedColumns, setSelectedColumns] = useState([
    "sno", "name", "admission_number", "class", "total_due", "total_paid", "balance", "fee_exempted", "actions"
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentLedger, setStudentLedger] = useState({ fees: [], payments: [] });
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    feeId: "",
    amount: "",
    paymentMode: "Cash",
    remarks: ""
  });
  const [isPaying, setIsPaying] = useState(false);

  const [balancesMap, setBalancesMap] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchClasses());
  }, [dispatch]);

  const students = useMemo(() => users.filter(u => u.type === "student"), [users]);

  useEffect(() => {
    if (students.length > 0) {
      // Fetch student balances in batch
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

  // Derive class options
  const classes = useMemo(() => {
    if (!globalClasses || globalClasses.length === 0) return [];
    
    // We only want to show classes that actually have students (or we can show all classes)
    // Let's show all available classes that are mapped to current students
    const classSet = new Set();
    students.forEach(s => {
      if (s.classes && s.classes.length > 0) {
        s.classes.forEach(c => classSet.add(c));
      }
    });

    return globalClasses
      .filter(c => classSet.has(c.id))
      .map(c => ({ value: c.id, label: `${c.name} ${c.section || ''}`.trim() }));
  }, [students, globalClasses]);

  const filteredStudents = useMemo(() => {
    let result = students;
    if (classFilter) {
      result = result.filter(s => s.classes?.some(c => String(c) === String(classFilter)));
    }
    if (studentSearch) {
      const search = studentSearch.toLowerCase();
      result = result.filter(s => 
        (s.name && s.name.toLowerCase().includes(search)) || 
        (s.admission_number && String(s.admission_number).toLowerCase().includes(search))
      );
    }
    return result;
  }, [students, classFilter, studentSearch]);

  const enrichedStudents = useMemo(() => {
    let enriched = filteredStudents.map(s => {
      const b = balancesMap[s.id] || { totalDue: 0, totalPaid: 0, balance: 0 };
      
      return {
        ...s,
        className: globalClasses.find(c => String(c.id) === String(s.classes?.[0]))?.name || "N/A",
        total_due: b.totalDue,
        total_paid: b.totalPaid,
        balance: b.balance
      };
    });

    if (statusFilter !== "All") {
      enriched = enriched.filter(s => {
        if (statusFilter === "Exempted") return s.fee_exempted;
        if (statusFilter === "Pending") return !s.fee_exempted && s.balance > 0;
        if (statusFilter === "Paid") return !s.fee_exempted && s.balance === 0;
        return true;
      });
    }

    return enriched;
  }, [filteredStudents, globalClasses, statusFilter]);

  const { items: sortedData, requestSort, sortConfig } = useSortableData(enrichedStudents);

  const renderSortIndicator = (key) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const handleOpenLedger = async (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
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
        // Automatically generate receipt
        const feeDetails = studentLedger.fees.find(f => f.id === paymentForm.feeId)?.fee;
        const res = await api.post("/finance_panel/logPayment", {
          data: {
            studentId: selectedStudent.id,
            paymentMode: paymentForm.paymentMode,
            remarks: paymentForm.remarks,
            payments: [{
                feeId: paymentForm.feeId,
                amount: Number(paymentForm.amount),
                title: feeDetails?.title
            }]
          }
        });
      if (res.data.success) {
        toast.success("Payment recorded successfully");
        
        const completePayment = {
            ...res.data.payments[0],
            fee: feeDetails,
            fee_title: feeDetails?.title
        };
        generateReceiptPDF(completePayment, selectedStudent);

        setPaymentForm({ feeId: "", amount: "", paymentMode: "Cash", remarks: "" });
        setIsPaymentModalOpen(false); // Close payment modal after success
        // Refresh ledger if the big modal is still somehow open
        if (isModalOpen) handleOpenLedger(selectedStudent);
        dispatch(fetchUsers());
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log payment");
    } finally {
      setIsPaying(false);
    }
  };

  const exportColumnsList = [
    { key: "sno", label: "S.No" },
    { key: "name", label: "Name" },
    { key: "admission_number", label: "Admission No" },
    { key: "total_due", label: "Total Due" },
    { key: "total_paid", label: "Total Paid" },
    { key: "balance", label: "Balance" },
    { key: "fee_exempted", label: "Fee Exempted" }
  ];

  const handleExportExcel = () => {
    const dataToExport = sortedData.map((item, index) => ({
      "S.No": index + 1,
      "Name": item.name,
      "Admission No": item.admission_number || "-",
      "Class": item.className,
      "Total Due": item.total_due,
      "Total Paid": item.total_paid,
      "Balance": item.balance,
      "Fee Exempted": item.fee_exempted ? "Yes" : "No"
    }));
    exportToExcel(dataToExport, "Student_Ledger");
  };

  const handleExportPDF = () => {
    const columns = ["S.No", "Name", "Admission No", "Class", "Total Due", "Total Paid", "Balance", "Fee Exempted"];
    const rows = sortedData.map((item, index) => [
      index + 1,
      item.name,
      item.admission_number || "-",
      item.className,
      `Rs. ${item.total_due}`,
      `Rs. ${item.total_paid}`,
      `Rs. ${item.balance}`,
      item.fee_exempted ? "Yes" : "No"
    ]);
    exportToPDF(columns, rows, "Student_Ledger", "Student Ledger Report");
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>Student Ledger</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage fee collections and student accounts</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ flexShrink: 0 }}>
          <TableFilterHeader
          searchQuery={studentSearch}
          setSearchQuery={setStudentSearch}
          searchPlaceholder="Search by name or admission no..."
          filters={[
            {
              label: "All Classes",
              value: classFilter,
              onChange: setClassFilter,
              options: classes
            },
            {
              label: "Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "All", label: "All Students" },
                { value: "Pending", label: "Pending Dues" },
                { value: "Paid", label: "Fully Paid" },
                { value: "Exempted", label: "Fee Exempted" }
              ]
            }
          ]}
          columns={exportColumnsList}
          selectedColumns={selectedColumns}
          setSelectedColumns={setSelectedColumns}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.875rem" }}>
          <div style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "0.35rem 0.75rem", borderRadius: "6px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            Total Displayed Due: ₹{sortedData.reduce((acc, curr) => acc + Number(curr.total_due || 0), 0).toLocaleString()}
          </div>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "0.35rem 0.75rem", borderRadius: "6px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            Total Displayed Paid: ₹{sortedData.reduce((acc, curr) => acc + Number(curr.total_paid || 0), 0).toLocaleString()}
          </div>
          <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "0.35rem 0.75rem", borderRadius: "6px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            Total Displayed Balance: ₹{sortedData.reduce((acc, curr) => acc + Number(curr.balance || 0), 0).toLocaleString()}
          </div>
        </div>

        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)" }}>
                {selectedColumns.includes("sno") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>S.NO</th>}
                <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("name")}>
                  STUDENT{renderSortIndicator("name")}
                </th>
                {selectedColumns.includes("admission_number") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("admission_number")}>ADM NO{renderSortIndicator("admission_number")}</th>}
                {selectedColumns.includes("total_due") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("total_due")}>TOTAL DUE{renderSortIndicator("total_due")}</th>}
                {selectedColumns.includes("total_paid") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("total_paid")}>TOTAL PAID{renderSortIndicator("total_paid")}</th>}
                {selectedColumns.includes("balance") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("balance")}>BALANCE{renderSortIndicator("balance")}</th>}
                {selectedColumns.includes("fee_exempted") && <th style={{ padding: "0.5rem 1rem", textAlign: "center", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>EXEMPTED</th>}
                <th style={{ padding: "0.5rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: "2rem", textAlign: "center" }}>Loading...</td></tr>
              ) : sortedData.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No students found.</td></tr>
              ) : (
                sortedData.map((s, idx) => (
                  <tr key={s.id} onClick={() => handleOpenLedger(s)} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s", cursor: "pointer" }} className="hover-row">
                    {selectedColumns.includes("sno") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "500" }}>{idx + 1}</td>}
                    <td style={{ padding: "0.5rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "0.875rem" }}>
                          {s.name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <div style={{ fontWeight: "500", color: "var(--text-primary)" }}>{s.name}</div>
                        </div>
                      </div>
                    </td>
                    {selectedColumns.includes("admission_number") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.admission_number || "-"}</td>}
                    {selectedColumns.includes("total_due") && <td style={{ padding: "0.5rem 1rem", color: "var(--text-primary)", fontWeight: "500" }}>₹{s.total_due}</td>}
                    {selectedColumns.includes("total_paid") && <td style={{ padding: "0.5rem 1rem", color: "#10b981", fontWeight: "500" }}>₹{s.total_paid}</td>}
                    {selectedColumns.includes("balance") && (
                      <td style={{ padding: "0.5rem 1rem", color: s.balance > 0 ? "#ef4444" : "#10b981", fontWeight: "600" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", padding: "0.25rem 0.5rem", borderRadius: "12px", background: s.balance > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)" }}>
                          ₹{s.balance}
                        </div>
                      </td>
                    )}
                    {selectedColumns.includes("fee_exempted") && (
                      <td style={{ padding: "0.5rem 1rem", textAlign: "center" }}>
                        {s.fee_exempted ? <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>YES</span> : "-"}
                      </td>
                    )}
                    <td style={{ padding: "0.5rem 1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenLedger(s); }} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", padding: "0.5rem 1rem", color: "var(--accent-primary)", background: "var(--accent-light)", borderRadius: "6px", fontSize: "0.875rem", fontWeight: "500" }}>
                        <Receipt size={16} style={{ marginRight: "0.5rem" }} /> View Ledger
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(s); }} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.875rem", fontWeight: "500" }}>
                        <PlusCircle size={16} style={{ marginRight: "0.5rem" }} /> Log Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StudentLedgerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        student={selectedStudent} 
      />
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
            ) : studentLedger.fees.filter(f => f.status !== "paid").length === 0 ? (
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
                    {studentLedger.fees.filter(f => f.status !== "paid").map(f => (
                      <option key={f.id} value={f.id}>{f.fee?.title} (Due: ₹{Number(f.fee?.amount || 0) - Number(f.total_paid_amount || 0)})</option>
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
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="btn btn-ghost" style={{ flex: 1, justifyContent: "center", border: "1px solid var(--glass-border)" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isPaying} className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                    {isPaying ? "Processing..." : "Submit Payment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Ledger;
