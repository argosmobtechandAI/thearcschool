import React, { useEffect, useState } from "react";
import { Clock, CheckCircle, Printer, Bus, Edit2, Save, X, Trash2 } from "lucide-react";
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

        {/* Transport Settings Section */}
        {!student.fee_exempted && (
          <div style={{ marginBottom: "2rem", padding: "1rem", background: "rgba(0,0,0,0.02)", borderRadius: "8px", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "0.5rem", borderRadius: "50%" }}>
                <Bus size={20} />
              </div>
              <div>
                <div style={{ fontWeight: "600", fontSize: "0.875rem", color: "var(--text-primary)" }}>Transport & Bus Fee</div>
                {!isEditingTransport ? (
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {studentDetails.bus_fee > 0 ? (
                      <>Fee: ₹{studentDetails.bus_fee}/month | Start: {studentDetails.bus_start_date ? new Date(studentDetails.bus_start_date).toLocaleDateString() : "N/A"}</>
                    ) : (
                      <>Not using transport service</>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
                    <input 
                      type="number" 
                      placeholder="Bus Fee (₹)" 
                      className="input-glass" 
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", width: "100px", minHeight: "30px" }} 
                      value={transportForm.bus_fee} 
                      onChange={(e) => setTransportForm({...transportForm, bus_fee: e.target.value})} 
                    />
                    <input 
                      type="date" 
                      className="input-glass" 
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", minHeight: "30px" }} 
                      value={transportForm.bus_start_date} 
                      onChange={(e) => setTransportForm({...transportForm, bus_start_date: e.target.value})} 
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {!isEditingTransport ? (
                <button onClick={() => setIsEditingTransport(true)} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "4px", color: "var(--text-secondary)" }}>
                  <Edit2 size={14} /> Edit
                </button>
              ) : (
                <>
                  <button onClick={() => setIsEditingTransport(false)} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "4px", color: "var(--text-secondary)" }}>
                    <X size={14} /> Cancel
                  </button>
                  <button onClick={handleUpdateTransport} disabled={updatingTransport} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
                    <Save size={14} /> {updatingTransport ? "Saving..." : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

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
                      <div key={f.id} style={{ padding: "1rem", background: "rgba(0,0,0,0.02)", borderRadius: "8px", border: "1px solid var(--glass-border)", borderLeft: "4px solid #ef4444", position: "relative" }}>
                        
                        {f.id?.startsWith("physical-") && (
                          <button 
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to permanently delete the fee: ${f.fee?.title}?`)) {
                                setFeeDeleting(f.id);
                                try {
                                  const dbId = f.id.replace("physical-", "");
                                  const res = await api.delete(`/finance_panel/studentFee/${dbId}`);
                                  if (res.data.success) {
                                    alert("Fee deleted successfully!");
                                    fetchLedger(student.id); // Reload the modal's ledger
                                  }
                                } catch (error) {
                                  alert(error.response?.data?.message || "Failed to delete fee");
                                } finally {
                                  setFeeDeleting(null);
                                }
                              }
                            }}
                            disabled={feeDeleting === f.id}
                            style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.25rem", display: "flex", alignItems: "center", justifyContent: "center", opacity: feeDeleting === f.id ? 0.5 : 0.6 }}
                            title="Delete Fee"
                            className="hover-opacity-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", alignItems: "flex-start", paddingRight: f.id?.startsWith("physical-") ? "1.5rem" : "0" }}>
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
                    
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn-ghost" style={{ position: "absolute", bottom: "1rem", right: "1rem", padding: "0.5rem", color: "var(--accent-primary)" }} title="Print Receipt"
                        onClick={() => generateReceiptPDF(p, student, p.receipts)}
                      >
                        <Printer size={16} />
                      </button>
                    </div>
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
