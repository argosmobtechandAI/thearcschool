import React, { useEffect, useState } from "react";
import { Clock, CheckCircle, Printer } from "lucide-react";
import { generateReceiptPDF } from "../utils/exportUtils";
import api from "../services/api";
import { toast } from "react-toastify";

const StudentLedgerModal = ({ isOpen, onClose, student }) => {
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [studentLedger, setStudentLedger] = useState({ fees: [], payments: [] });

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
      }
    } catch (error) {
      toast.error("Failed to load student ledger");
    } finally {
      setLedgerLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "800px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>{student.name}'s Ledger</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>Adm No: {student.admission_number || "N/A"}</p>
          </div>
          {student.fee_exempted && (
            <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "6px 12px", borderRadius: "8px", fontWeight: "600", fontSize: "0.875rem" }}>
              Fee Exempted
            </span>
          )}
        </div>

        {ledgerLoading ? (
          <p style={{ textAlign: "center", padding: "2rem" }}>Loading ledger...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            {/* Kanban Style Pending Dues */}
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Clock size={18} color="var(--accent-primary)"/> Pending Dues</h3>
              {!student.fee_exempted ? (
                (studentLedger?.fees || []).filter(f => f.status !== "paid").length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {(studentLedger?.fees || []).filter(f => f.status !== "paid").map(f => (
                      <div key={f.id} style={{ padding: "1rem", background: "rgba(0,0,0,0.02)", borderRadius: "8px", border: "1px solid var(--glass-border)", borderLeft: "4px solid #ef4444" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>{f.fee?.title || "Unknown Fee"}</div>
                            {f.fee?.due_date && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Due Date: <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>{new Date(f.fee.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>}
                          </div>
                          <span style={{ fontWeight: "700", color: "#ef4444", whiteSpace: "nowrap" }}>₹{Number(f.fee?.amount || 0) - Number(f.total_paid_amount || 0)} due</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                          <span>Base Fee: ₹{Number(f.fee?.amount || 0) - Number(f.fee?.penalty || 0)}</span>
                          {f.fee?.penalty ? <span style={{color: "#ef4444"}}>Late Fee: +₹{f.fee.penalty}</span> : null}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.25rem", borderTop: f.fee?.penalty ? "1px dashed rgba(0,0,0,0.1)" : "none", paddingTop: f.fee?.penalty ? "0.25rem" : "0" }}>
                          <span style={{ fontWeight: f.fee?.penalty ? "600" : "normal" }}>Total: ₹{f.fee?.amount}</span>
                          <span>Paid: ₹{f.total_paid_amount || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", padding: "1rem", background: "rgba(16, 185, 129, 0.05)", borderRadius: "8px", border: "1px dashed #10b981", textAlign: "center" }}>No pending dues. All clear!</p>
                )
              ) : (
                <p style={{ color: "#10b981", fontSize: "0.875rem", fontWeight: "500", padding: "1rem", background: "rgba(16, 185, 129, 0.05)", borderRadius: "8px", textAlign: "center" }}>Student is fee exempted.</p>
              )}
            </div>

            {/* Kanban Style Payment History */}
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><CheckCircle size={18} color="#10b981"/> Payment History</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto", paddingRight: "0.5rem" }}>
                {(studentLedger?.payments || []).length > 0 ? (studentLedger?.payments || []).map(p => (
                  <div key={p.id} style={{ padding: "1rem", background: p.payment_mode === "Concession" ? "rgba(147, 51, 234, 0.05)" : "rgba(16, 185, 129, 0.05)", borderRadius: "8px", border: `1px solid ${p.payment_mode === "Concession" ? "rgba(147, 51, 234, 0.2)" : "rgba(16, 185, 129, 0.2)"}`, borderLeft: `4px solid ${p.payment_mode === "Concession" ? "#9333ea" : "#10b981"}`, position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: "600" }}>{p.description || "Fee Payment"}</span>
                      <span style={{ fontWeight: "700", color: p.payment_mode === "Concession" ? "#9333ea" : "#10b981" }}>+ ₹{p.amount_paid}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                      <span style={{ background: p.payment_mode === "Concession" ? "#f3e8ff" : "white", color: p.payment_mode === "Concession" ? "#9333ea" : "inherit", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--glass-border)", fontWeight: "500" }}>{p.payment_mode}</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      Collected by: {p.collected_by?.name || "Admin"}
                    </div>
                    {p.remarks && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem", fontStyle: "italic" }}>Note: {p.remarks}</div>}
                    
                    <button 
                      onClick={() => generateReceiptPDF(p, student)}
                      className="btn-ghost" 
                      style={{ position: "absolute", bottom: "1rem", right: "1rem", padding: "4px", color: "var(--accent-primary)" }}
                      title="Download Receipt"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                )) : (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", padding: "1rem", background: "rgba(0, 0, 0, 0.02)", borderRadius: "8px", border: "1px dashed var(--glass-border)", textAlign: "center" }}>No payments recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem" }}>
          <button type="button" onClick={onClose} className="btn btn-ghost">Close</button>
        </div>
      </div>
    </div>
  );
};

export default StudentLedgerModal;
