import React, { useEffect, useState, useMemo } from "react";
import { Search, X, Check, Filter, CalendarClock } from "lucide-react";
import api from "../services/api";
import { toast } from "react-toastify";
import { generateReceiptPDF } from "../utils/exportUtils";

const PaymentSelectionModal = ({ isOpen, onClose, selectedStudent, onPaymentSuccess }) => {
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [studentLedger, setStudentLedger] = useState({ fees: [], payments: [] });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showFuture, setShowFuture] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ feeIds: [], amount: "", paymentMode: "Cash", remarks: "" });
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (isOpen && selectedStudent?.id) {
      fetchLedger();
    }
  }, [isOpen, selectedStudent]);

  useEffect(() => {
    if (isOpen && selectedStudent?.id) {
      setPaymentForm({ feeIds: [], amount: "", paymentMode: "Cash", remarks: "" });
      fetchLedger();
    }
  }, [showFuture]);

  const fetchLedger = async () => {
    setLedgerLoading(true);
    try {
      const res = await api.get(`/finance_panel/getStudentLedger/${selectedStudent.id}?includeFuture=${showFuture}`);
      if (res.data.success) {
        setStudentLedger(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load ledger details");
    } finally {
      setLedgerLoading(false);
    }
  };

  const pendingDues = useMemo(() => {
    if (!studentLedger.fees) return [];
    let dues = studentLedger.fees.filter(f => f.status !== "paid");
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      dues = dues.filter(f => f.fee?.title?.toLowerCase().includes(lowerSearch) || f.fee?.due_date?.includes(lowerSearch));
    }
    return dues;
  }, [studentLedger.fees, searchTerm]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allFeeIds = pendingDues.map(f => f.id);
      let totalAmt = 0;
      allFeeIds.forEach(id => {
        const fObj = studentLedger.fees.find(fee => fee.id === id);
        if (fObj) totalAmt += (Number(fObj.fee?.amount || 0) - Number(fObj.total_paid_amount || 0));
      });
      setPaymentForm({ ...paymentForm, feeIds: allFeeIds, amount: totalAmt });
    } else {
      setPaymentForm({ ...paymentForm, feeIds: [], amount: "" });
    }
  };

  const handleSelectRow = (e, fee) => {
    const isChecked = e.target.checked;
    let newFeeIds = [...paymentForm.feeIds];
    if (isChecked) {
      newFeeIds.push(fee.id);
    } else {
      newFeeIds = newFeeIds.filter(id => id !== fee.id);
    }

    let totalAmt = 0;
    newFeeIds.forEach(id => {
      const fObj = studentLedger.fees.find(f => f.id === id);
      if (fObj) totalAmt += (Number(fObj.fee?.amount || 0) - Number(fObj.total_paid_amount || 0));
    });
    setPaymentForm({ ...paymentForm, feeIds: newFeeIds, amount: totalAmt > 0 ? totalAmt : "" });
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
        const paymentsPayload = [];
        
        for (const feeId of paymentForm.feeIds) {
            const feeObj = studentLedger.fees.find(f => f.id === feeId);
            if (!feeObj) continue;
            
            const dueAmount = Number(feeObj.fee?.amount || 0) - Number(feeObj.total_paid_amount || 0);
            if (remainingAmount <= 0) break;
            
            const paymentAmount = Math.min(remainingAmount, dueAmount);
            totalPaymentAmount += paymentAmount;
            
            paymentsPayload.push({
                feeId: feeId,
                amount: paymentAmount,
                title: feeObj.fee?.title || "Fee"
            });
            
            remainingAmount -= paymentAmount;
        }

        if (totalPaymentAmount === 0) {
            setIsPaying(false);
            return toast.error("Invalid payment configuration");
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
        
        const completePayments = res.data.payments.map((p, idx) => ({
            ...p,
            fee_title: paymentsPayload[idx]?.title || p.remarks,
            student_name: selectedStudent.name,
            admission_number: selectedStudent.admission_number,
            class_name: selectedStudent.className
        }));

        try {
            generateReceiptPDF(completePayments, selectedStudent, res.data.receipt);
        } catch (pdfErr) {
            console.error("PDF gen err", pdfErr);
            toast.error("Receipt generation failed, but payment was recorded.");
        }

        if (onPaymentSuccess) onPaymentSuccess();
        onClose();
      } else {
        toast.error(res.data.message || "Failed to record payment");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      setIsPaying(false);
    }
  };

  if (!isOpen || !selectedStudent) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "2rem" }}>
      <div className="glass-panel modal-content animate-fade-in" style={{ width: "100%", maxWidth: "1000px", height: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.02)" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>Log Payment</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>Select dues to clear for {selectedStudent.name} (Adm: {selectedStudent.admission_number || "-"})</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "1.5rem 2rem" }}>
          
          {ledgerLoading ? (
             <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>Checking dues...</div>
          ) : selectedStudent.fee_exempted ? (
            <div style={{ padding: "2rem", textAlign: "center", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", color: "#10b981", margin: "auto" }}>
              <p style={{ fontWeight: "600", fontSize: "1.1rem" }}>Student is fee exempted.</p>
              <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>No dues are generated for this student.</p>
            </div>
          ) : studentLedger.fees.filter(f => f.status !== "paid").length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", background: "rgba(0, 0, 0, 0.02)", borderRadius: "8px", color: "var(--text-secondary)", margin: "auto" }}>
              <Check size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.2 }} />
              <p style={{ fontWeight: "600", fontSize: "1.1rem" }}>No pending dues. All clear!</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" }}>
                <div style={{ position: "relative", width: "300px" }}>
                  <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input
                    type="text"
                    className="input-glass"
                    placeholder="Search by fee title or date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", paddingLeft: "35px", fontSize: "0.875rem" }}
                  />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginLeft: "auto", fontSize: "0.8125rem", color: showFuture ? "var(--accent-primary)" : "var(--text-secondary)", fontWeight: "500", userSelect: "none", transition: "color 0.2s" }}>
                  <CalendarClock size={15} />
                  Show Future Dues
                  <div
                    onClick={() => setShowFuture(!showFuture)}
                    style={{
                      width: "36px", height: "20px", borderRadius: "10px",
                      background: showFuture ? "var(--accent-primary)" : "rgba(0,0,0,0.15)",
                      position: "relative", cursor: "pointer", transition: "background 0.2s",
                      flexShrink: 0
                    }}
                  >
                    <div style={{
                      width: "16px", height: "16px", borderRadius: "50%",
                      background: "white", position: "absolute", top: "2px",
                      left: showFuture ? "18px" : "2px", transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                    }} />
                  </div>
                </label>
              </div>

              {/* Data Table */}
              <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", background: "var(--glass-bg)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
                  <thead style={{ position: "sticky", top: 0, background: "rgba(0,0,0,0.03)", backdropFilter: "blur(4px)", zIndex: 10 }}>
                    <tr style={{ borderBottom: "2px solid var(--glass-border)" }}>
                      <th style={{ padding: "0.75rem", textAlign: "center", width: "50px" }}>
                        <input 
                          type="checkbox" 
                          checked={pendingDues.length > 0 && paymentForm.feeIds.length === pendingDues.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>S.NO</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>FEE TITLE</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>DUE DATE</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>AMOUNT</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>BALANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDues.length > 0 ? pendingDues.map((f, idx) => {
                      const amount = Number(f.fee?.amount || 0);
                      const paid = Number(f.total_paid_amount || 0);
                      const due = amount - paid;
                      const isChecked = paymentForm.feeIds.includes(f.id);
                      
                      return (
                        <tr key={f.id} style={{ borderBottom: "1px solid var(--glass-border)", background: isChecked ? "rgba(59, 130, 246, 0.05)" : "transparent" }} className="hover-row">
                          <td style={{ padding: "0.75rem", textAlign: "center" }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => handleSelectRow(e, f)}
                            />
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{idx + 1}</td>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: "500", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                            {f.fee?.title || "-"}
                            {f.is_future && (
                              <span style={{ marginLeft: "0.5rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontSize: "0.625rem", fontWeight: "700", letterSpacing: "0.5px", verticalAlign: "middle" }}>ADVANCE</span>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{f.fee?.due_date ? new Date(f.fee.due_date).toLocaleDateString() : "-"}</td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--text-secondary)", fontSize: "0.875rem" }}>₹{amount.toLocaleString()}</td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "600", color: f.is_future ? "#3b82f6" : "#ef4444", fontSize: "0.875rem" }}>₹{due.toLocaleString()}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="6" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                          No dues match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Checkout Footer */}
              <div style={{ marginTop: "1.5rem", padding: "1.5rem", background: "rgba(0,0,0,0.02)", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                <form onSubmit={handlePaymentSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", alignItems: "end" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Amount Paying (₹)</label>
                      <input 
                        type="number" 
                        required 
                        className="input-glass" 
                        placeholder="Enter amount"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                        style={{ width: "100%", fontSize: "1.1rem", fontWeight: "600" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Payment Mode</label>
                      <select 
                        className="input-glass" 
                        value={paymentForm.paymentMode} 
                        onChange={(e) => setPaymentForm({...paymentForm, paymentMode: e.target.value})}
                        style={{ width: "100%" }}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Remarks / Ref No (Optional)</label>
                      <input 
                        type="text" 
                        className="input-glass" 
                        value={paymentForm.remarks} 
                        onChange={(e) => setPaymentForm({...paymentForm, remarks: e.target.value})}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--glass-border)" }}>
                    <div>
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Total Selected Fees: </span>
                      <span style={{ fontWeight: "700", fontSize: "1.25rem", color: "var(--accent-primary)" }}>
                        ₹{paymentForm.amount || 0}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button type="button" onClick={onClose} className="btn-ghost" style={{ padding: "0.75rem 1.5rem" }}>Cancel</button>
                      <button type="submit" disabled={isPaying || !paymentForm.amount} className="btn-primary" style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}>
                        {isPaying ? "Processing..." : "Submit Payment"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default PaymentSelectionModal;
