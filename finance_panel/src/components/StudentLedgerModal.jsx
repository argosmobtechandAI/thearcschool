import React, { useEffect, useState } from "react";
import { Clock, CheckCircle2, Printer, Bus, Edit2, Save, X, Trash2, User } from "lucide-react";
import { generateReceiptPDF } from "../utils/exportUtils";
import api from "../services/api";
import { toast } from "react-toastify";

const StudentLedgerModal = ({ isOpen, onClose, student }) => {
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [studentLedger, setStudentLedger] = useState({ fees: [], payments: [] });
  const [studentDetails, setStudentDetails] = useState({});
  const [isEditingTransport, setIsEditingTransport] = useState(false);
  const [transportForm, setTransportForm] = useState({ bus_fee: "", bus_start_date: "" });
  const [updatingTransport, setUpdatingTransport] = useState(false);
  const [feeDeleting, setFeeDeleting] = useState(null);

  useEffect(() => {
    if (isOpen && student?.id) {
      fetchLedger(student.id);
    }
  }, [isOpen, student]);

  const fetchLedger = async (studentId) => {
    try {
      setLedgerLoading(true);
      const response = await api.get(`/finance_panel/getStudentLedger/${studentId}`);
      if (response.data.success) {
        setStudentLedger(response.data.data);
        if (response.data.data.studentDetails) {
          setStudentDetails(response.data.data.studentDetails);
          setTransportForm({
            bus_fee: response.data.data.studentDetails.bus_fee || "",
            bus_start_date: response.data.data.studentDetails.bus_start_date || ""
          });
        }
      }
    } catch (error) {
      toast.error("Failed to load student ledger");
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleUpdateTransport = async () => {
    try {
      setUpdatingTransport(true);
      const res = await api.put(`/finance_panel/student/${student.id}/busFee`, transportForm);
      if (res.data.success) {
        toast.success("Transport details updated");
        setIsEditingTransport(false);
        fetchLedger(student.id);
      }
    } catch (error) {
      toast.error("Failed to update transport details");
    } finally {
      setUpdatingTransport(false);
    }
  };

  if (!isOpen || !student) return null;

  const pendingDues = (studentLedger?.fees || []).filter(f => f.status !== "paid");
  const paymentHistory = studentLedger?.payments || [];

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
          maxWidth: "760px", 
          maxHeight: "88vh", 
          padding: "1.5rem", 
          borderRadius: "14px", 
          border: "1px solid var(--glass-border)", 
          background: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          display: "flex", 
          flexDirection: "column",
          gap: "1.15rem"
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.85rem", borderBottom: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "1.1rem" }}>
              {student.name?.charAt(0) || "S"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>
                  {student.name}'s Financial Ledger
                </h2>
                {student.fee_exempted && (
                  <span style={{ background: "rgba(16, 185, 129, 0.12)", color: "#059669", padding: "2px 8px", borderRadius: "6px", fontWeight: "700", fontSize: "0.72rem" }}>
                    Fee Exempted
                  </span>
                )}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                Admission No: <strong>{student.admission_number || "N/A"}</strong>
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

        {/* Scrollable Body */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.15rem", overflowY: "auto", paddingRight: "0.25rem" }}>
          
          {/* Transport Settings Section */}
          {!student.fee_exempted && (
            <div style={{ padding: "0.85rem 1rem", background: "rgba(248, 250, 252, 0.8)", borderRadius: "10px", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ background: "rgba(124, 58, 237, 0.12)", color: "#7c3aed", padding: "0.5rem", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bus size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "0.84rem", color: "var(--text-primary)" }}>Bus & Transport Facility</div>
                  {!isEditingTransport ? (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {studentDetails.bus_fee > 0 ? (
                        <>Monthly Fee: <strong style={{ color: "#7c3aed" }}>₹{studentDetails.bus_fee}</strong> • Start: {studentDetails.bus_start_date ? new Date(studentDetails.bus_start_date).toLocaleDateString() : "Active"}</>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>Not enrolled in transport</span>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
                      <input 
                        type="number" 
                        placeholder="Bus Fee (₹)" 
                        className="input-glass" 
                        style={{ height: "30px", fontSize: "0.78rem", width: "100px", margin: 0 }} 
                        value={transportForm.bus_fee} 
                        onChange={(e) => setTransportForm({...transportForm, bus_fee: e.target.value})} 
                      />
                      <input 
                        type="date" 
                        className="input-glass" 
                        style={{ height: "30px", fontSize: "0.78rem", margin: 0 }} 
                        value={transportForm.bus_start_date} 
                        onChange={(e) => setTransportForm({...transportForm, bus_start_date: e.target.value})} 
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "0.35rem" }}>
                {!isEditingTransport ? (
                  <button onClick={() => setIsEditingTransport(true)} className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.76rem", padding: "0.3rem 0.6rem", borderRadius: "6px", color: "#6366f1", border: "1px solid var(--glass-border)" }}>
                    <Edit2 size={13} /> Edit Transport
                  </button>
                ) : (
                  <>
                    <button onClick={() => setIsEditingTransport(false)} className="btn btn-ghost" style={{ fontSize: "0.76rem", padding: "0.3rem 0.6rem", borderRadius: "6px" }}>
                      Cancel
                    </button>
                    <button onClick={handleUpdateTransport} disabled={updatingTransport} className="btn btn-primary" style={{ fontSize: "0.76rem", padding: "0.3rem 0.75rem", borderRadius: "6px", background: "#7c3aed", borderColor: "#7c3aed" }}>
                      <Save size={13} /> {updatingTransport ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {ledgerLoading ? (
            <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Loading ledger data...
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.15rem" }}>
              {/* Pending Dues Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ fontSize: "0.92rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-primary)" }}>
                    <Clock size={16} color="#d97706" /> Pending Dues ({pendingDues.length})
                  </h3>
                </div>

                {!student.fee_exempted ? (
                  pendingDues.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: "360px", overflowY: "auto", paddingRight: "0.2rem" }}>
                      {pendingDues.map(f => {
                        const dueAmount = Number(f.fee?.amount || 0) - Number(f.total_paid_amount || 0);
                        return (
                          <div 
                            key={f.id} 
                            style={{ 
                              padding: "0.75rem 0.85rem", 
                              background: "#fff", 
                              borderRadius: "9px", 
                              border: "1px solid var(--glass-border)", 
                              borderLeft: "4px solid #ef4444", 
                              position: "relative" 
                            }}
                          >
                            {f.id?.startsWith("physical-") && (
                              <button 
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to delete fee: ${f.fee?.title}?`)) {
                                    setFeeDeleting(f.id);
                                    try {
                                      const dbId = f.id.replace("physical-", "");
                                      const res = await api.delete(`/finance_panel/studentFee/${dbId}`);
                                      if (res.data.success) {
                                        toast.success("Fee deleted");
                                        fetchLedger(student.id);
                                      }
                                    } catch (error) {
                                      toast.error(error.response?.data?.message || "Failed to delete fee");
                                    } finally {
                                      setFeeDeleting(null);
                                    }
                                  }
                                }}
                                disabled={feeDeleting === f.id}
                                style={{ position: "absolute", top: "0.6rem", right: "0.6rem", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0.2rem" }}
                                title="Delete Custom Fee"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}

                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", alignItems: "flex-start", paddingRight: f.id?.startsWith("physical-") ? "1.5rem" : "0" }}>
                              <div>
                                <div style={{ fontWeight: "700", fontSize: "0.84rem", color: "var(--text-primary)" }}>{f.fee?.title || "Fee Item"}</div>
                                {f.fee?.due_date && (
                                  <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "1px" }}>
                                    Due: <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>{new Date(f.fee.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                                  </div>
                                )}
                              </div>
                              <span style={{ fontWeight: "800", color: "#dc2626", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                                ₹{dueAmount.toLocaleString()} due
                              </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem", borderTop: "1px dashed var(--glass-border)", paddingTop: "0.35rem" }}>
                              <span>Total: ₹{Number(f.fee?.amount || 0).toLocaleString()}</span>
                              <span style={{ color: "#059669", fontWeight: "600" }}>Paid: ₹{Number(f.total_paid_amount || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: "#059669", fontSize: "0.82rem", fontWeight: "600", padding: "1.5rem 1rem", background: "rgba(16, 185, 129, 0.05)", borderRadius: "9px", border: "1px dashed rgba(16, 185, 129, 0.4)", textAlign: "center" }}>
                      ✓ No pending dues. All clear!
                    </div>
                  )
                ) : (
                  <div style={{ color: "#6366f1", fontSize: "0.82rem", fontWeight: "600", padding: "1.5rem 1rem", background: "rgba(99, 102, 241, 0.05)", borderRadius: "9px", border: "1px dashed rgba(99, 102, 241, 0.3)", textAlign: "center" }}>
                    Student is fee exempted.
                  </div>
                )}
              </div>

              {/* Payment History Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ fontSize: "0.92rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-primary)" }}>
                    <CheckCircle2 size={16} color="#059669" /> Payment History ({paymentHistory.length})
                  </h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: "360px", overflowY: "auto", paddingRight: "0.2rem" }}>
                  {paymentHistory.length > 0 ? (
                    paymentHistory.map(p => (
                      <div 
                        key={p.id} 
                        style={{ 
                          padding: "0.75rem 0.85rem", 
                          background: "#fff", 
                          borderRadius: "9px", 
                          border: "1px solid var(--glass-border)", 
                          borderLeft: `4px solid ${p.payment_mode === "Concession" ? "#9333ea" : "#10b981"}`, 
                          position: "relative" 
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", alignItems: "center" }}>
                          <span style={{ fontWeight: "700", fontSize: "0.84rem", color: "var(--text-primary)" }}>{p.description || "Fee Payment"}</span>
                          <span style={{ fontWeight: "800", color: p.payment_mode === "Concession" ? "#9333ea" : "#059669", fontSize: "0.85rem" }}>
                            + ₹{Number(p.amount_paid).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                          <span>{new Date(p.created_at).toLocaleDateString()}</span>
                          <span style={{ background: p.payment_mode === "Concession" ? "#f3e8ff" : "rgba(16, 185, 129, 0.1)", color: p.payment_mode === "Concession" ? "#9333ea" : "#059669", padding: "1px 6px", borderRadius: "4px", fontWeight: "700", fontSize: "0.7rem" }}>
                            {p.payment_mode}
                          </span>
                        </div>
                        
                        {p.remarks && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem", fontStyle: "italic" }}>
                            Note: {p.remarks}
                          </div>
                        )}
                        
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.35rem" }}>
                          <button 
                            className="btn btn-ghost" 
                            style={{ padding: "0.2rem 0.45rem", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "0.25rem", color: "#2563eb" }} 
                            title="Print Receipt"
                            onClick={() => generateReceiptPDF(p, student, p.receipts)}
                          >
                            <Printer size={12} /> Receipt
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", padding: "1.5rem 1rem", background: "rgba(248, 250, 252, 0.8)", borderRadius: "9px", border: "1px dashed var(--glass-border)", textAlign: "center" }}>
                      No payments recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.85rem", borderTop: "1px solid var(--glass-border)" }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-ghost"
            style={{ padding: "0.45rem 1.25rem", fontSize: "0.82rem", fontWeight: "700", border: "1px solid var(--glass-border)", background: "#f8fafc" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentLedgerModal;
