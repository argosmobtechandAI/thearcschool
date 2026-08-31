import React, { useEffect, useState, useMemo } from "react";
import { Search, X, Check, CalendarClock, IndianRupee, CreditCard } from "lucide-react";
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
      const paymentsPayload = [];
      
      for (const feeId of paymentForm.feeIds) {
        const feeObj = studentLedger.fees.find(f => f.id === feeId);
        if (!feeObj) continue;
        
        const dueAmount = Number(feeObj.fee?.amount || 0) - Number(feeObj.total_paid_amount || 0);
        if (remainingAmount <= 0) break;

        const payForThisFee = Math.min(remainingAmount, dueAmount);
        paymentsPayload.push({
          feeId: feeId,
          amount: payForThisFee,
          title: feeObj.fee?.title
        });
        remainingAmount -= payForThisFee;
      }

      if (remainingAmount > 0 && paymentsPayload.length > 0) {
        paymentsPayload[paymentsPayload.length - 1].amount += remainingAmount;
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
    <div 
      className="animate-fade-in" 
      style={{ 
        position: "fixed", 
        inset: 0, 
        background: "rgba(15, 23, 42, 0.55)", 
        backdropFilter: "blur(6px)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        zIndex: 1000, 
        padding: "1rem" 
      }} 
      onClick={onClose}
    >
      <div 
        className="glass-panel modal-content" 
        style={{ 
          width: "100%", 
          maxWidth: "840px", 
          maxHeight: "88vh", 
          display: "flex", 
          flexDirection: "column", 
          borderRadius: "14px", 
          background: "#ffffff",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          overflow: "hidden" 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: "rgba(5, 150, 105, 0.12)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>Log Student Payment</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                Student: <strong>{selectedStudent.name}</strong> • Adm: {selectedStudent.admission_number || "N/A"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-ghost" 
            style={{ width: "32px", height: "32px", padding: 0, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", padding: "1.25rem 1.5rem", gap: "1rem" }}>
          
          {ledgerLoading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Checking fee records...
            </div>
          ) : selectedStudent.fee_exempted ? (
            <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", background: "rgba(16, 185, 129, 0.05)", borderRadius: "10px", border: "1px dashed rgba(16, 185, 129, 0.4)", color: "#059669", margin: "auto" }}>
              <p style={{ fontWeight: "700", fontSize: "1.05rem" }}>Student is fee exempted.</p>
              <p style={{ fontSize: "0.82rem", marginTop: "0.35rem", color: "var(--text-secondary)" }}>No fee dues are active for this account.</p>
            </div>
          ) : studentLedger.fees?.filter(f => f.status !== "paid").length === 0 ? (
            <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", background: "rgba(16, 185, 129, 0.05)", borderRadius: "10px", border: "1px dashed rgba(16, 185, 129, 0.4)", color: "var(--text-primary)", margin: "auto" }}>
              <Check size={36} color="#059669" style={{ margin: "0 auto 0.5rem auto" }} />
              <p style={{ fontWeight: "700", fontSize: "1.05rem" }}>No Pending Dues!</p>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>All fee components for this student are fully settled.</p>
            </div>
          ) : (
            <>
              {/* Filter Toolbar */}
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: "240px", flex: 1 }}>
                  <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input
                    type="text"
                    className="input-glass"
                    placeholder="Search by fee title or due date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", paddingLeft: "32px", fontSize: "0.82rem", height: "34px", margin: 0 }}
                  />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.78rem", color: showFuture ? "#2563eb" : "var(--text-secondary)", fontWeight: "600", userSelect: "none" }}>
                  <CalendarClock size={14} />
                  Include Future Dues
                  <input
                    type="checkbox"
                    checked={showFuture}
                    onChange={() => setShowFuture(!showFuture)}
                    style={{ cursor: "pointer", accentColor: "#2563eb" }}
                  />
                </label>
              </div>

              {/* Dues Selection Table */}
              <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", background: "#fff" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 10, borderBottom: "2px solid var(--glass-border)" }}>
                    <tr>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "center", width: "40px" }}>
                        <input 
                          type="checkbox" 
                          checked={pendingDues.length > 0 && paymentForm.feeIds.length === pendingDues.length}
                          onChange={handleSelectAll}
                          style={{ cursor: "pointer", accentColor: "#059669" }}
                        />
                      </th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontSize: "0.72rem" }}>S.No</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontSize: "0.72rem" }}>Fee Title</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontSize: "0.72rem" }}>Due Date</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontSize: "0.72rem" }}>Total Amount</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontSize: "0.72rem" }}>Balance Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDues.length > 0 ? pendingDues.map((f, idx) => {
                      const amount = Number(f.fee?.amount || 0);
                      const paid = Number(f.total_paid_amount || 0);
                      const due = amount - paid;
                      const isChecked = paymentForm.feeIds.includes(f.id);
                      
                      return (
                        <tr 
                          key={f.id} 
                          style={{ borderBottom: "1px solid var(--glass-border)", background: isChecked ? "rgba(5, 150, 105, 0.04)" : "transparent", cursor: "pointer" }}
                          onClick={(e) => {
                            if (e.target.tagName !== 'INPUT') {
                              handleSelectRow({ target: { checked: !isChecked } }, f);
                            }
                          }}
                        >
                          <td style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => handleSelectRow(e, f)}
                              style={{ cursor: "pointer", accentColor: "#059669" }}
                            />
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>{idx + 1}</td>
                          <td style={{ padding: "0.6rem 0.75rem", fontWeight: "600", color: "var(--text-primary)" }}>
                            {f.fee?.title || "-"}
                            {f.is_future && (
                              <span style={{ marginLeft: "0.4rem", padding: "1px 5px", borderRadius: "4px", background: "rgba(59, 130, 246, 0.1)", color: "#2563eb", fontSize: "0.65rem", fontWeight: "700" }}>ADVANCE</span>
                            )}
                          </td>
                          <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>{f.fee?.due_date ? new Date(f.fee.due_date).toLocaleDateString("en-IN") : "-"}</td>
                          <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "var(--text-secondary)" }}>₹{amount.toLocaleString()}</td>
                          <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: "800", color: "#dc2626" }}>₹{due.toLocaleString()}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="6" style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-secondary)" }}>
                          No dues match your filter query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Checkout Form Card */}
              <div style={{ padding: "1rem 1.15rem", background: "rgba(248, 250, 252, 0.9)", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
                <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.5fr", gap: "0.85rem", alignItems: "end" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.3rem", textTransform: "uppercase" }}>Amount Paying (₹) *</label>
                      <input 
                        type="number" 
                        required 
                        className="input-glass" 
                        placeholder="Amount (₹)"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                        style={{ width: "100%", fontSize: "0.95rem", fontWeight: "700", height: "36px", margin: 0 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.3rem", textTransform: "uppercase" }}>Payment Mode</label>
                      <select 
                        className="input-glass" 
                        value={paymentForm.paymentMode} 
                        onChange={(e) => setPaymentForm({...paymentForm, paymentMode: e.target.value})}
                        style={{ width: "100%", height: "36px", margin: 0, fontSize: "0.82rem", fontWeight: "600" }}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Online">Online / UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Concession">Concession / Discount</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.3rem", textTransform: "uppercase" }}>Remarks / Ref No</label>
                      <input 
                        type="text" 
                        className="input-glass" 
                        placeholder="Receipt reference, check no..."
                        value={paymentForm.remarks} 
                        onChange={(e) => setPaymentForm({...paymentForm, remarks: e.target.value})}
                        style={{ width: "100%", height: "36px", margin: 0, fontSize: "0.82rem" }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid var(--glass-border)" }}>
                    <div>
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>Selected Total: </span>
                      <span style={{ fontWeight: "800", fontSize: "1.1rem", color: "#059669" }}>
                        ₹{Number(paymentForm.amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.65rem" }}>
                      <button type="button" onClick={onClose} className="btn btn-ghost" style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", border: "1px solid var(--glass-border)" }}>
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={isPaying || !paymentForm.amount} 
                        className="btn btn-primary" 
                        style={{ padding: "0.4rem 1.25rem", fontSize: "0.82rem", fontWeight: "700", background: "#059669", borderColor: "#059669" }}
                      >
                        {isPaying ? "Recording..." : "Record & Print Receipt"}
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
