import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import api from "../services/api";
import { ChevronLeft, Phone, Mail, Hash, Calendar, MapPin, Receipt, CheckCircle, Clock, Bus, Edit2, Save, X } from "lucide-react";
import { toast } from "react-toastify";

const StudentFinanceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { users, classes } = useSelector((state) => state.data);

  const [studentLedger, setStudentLedger] = useState({ fees: [], payments: [] });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [balanceData, setBalanceData] = useState({ totalDue: 0, totalPaid: 0, balance: 0 });

  const [studentDetails, setStudentDetails] = useState({});
  const [isEditingTransport, setIsEditingTransport] = useState(false);
  const [transportForm, setTransportForm] = useState({ bus_fee: "", bus_start_date: "" });
  const [updatingTransport, setUpdatingTransport] = useState(false);

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
    if (classes.length === 0) dispatch(fetchClasses());
  }, [dispatch, users.length, classes.length]);

  const activeStudent = useMemo(() => users.find(u => u.id === id), [users, id]);

  const studentClassName = useMemo(() => {
    if (!activeStudent || !activeStudent.classes || activeStudent.classes.length === 0) return "N/A";
    const cls = classes.find(c => String(c.id) === String(activeStudent.classes[0]));
    return cls ? `${cls.name} ${cls.section || ""}`.trim() : "N/A";
  }, [activeStudent, classes]);

  useEffect(() => {
    if (activeStudent) {
      setLedgerLoading(true);
      Promise.all([
        api.post("/finance_panel/studentBalances", { students: [{ id: activeStudent.id, type: activeStudent.type, fee_exempted: activeStudent.fee_exempted, classes: activeStudent.classes, bus_fee: activeStudent.bus_fee }] }),
        api.get(`/finance_panel/getStudentLedger/${activeStudent.id}`)
      ]).then(([balanceRes, ledgerRes]) => {
        if (balanceRes.data.success && balanceRes.data.data.length > 0) {
          setBalanceData(balanceRes.data.data[0]);
        }
        if (ledgerRes.data.success) {
          setStudentLedger(ledgerRes.data.data);
          if (ledgerRes.data.data.studentDetails) {
            setStudentDetails(ledgerRes.data.data.studentDetails);
            setTransportForm({
                bus_fee: ledgerRes.data.data.studentDetails.bus_fee || "",
                bus_start_date: ledgerRes.data.data.studentDetails.bus_start_date || ""
            });
          }
        }
      }).catch(err => {
        toast.error("Failed to load finance details");
      }).finally(() => {
        setLedgerLoading(false);
      });
    }
  }, [activeStudent]);

  const handleUpdateTransport = async () => {
    if (!activeStudent) return;
    try {
        setUpdatingTransport(true);
        const res = await api.put(`/finance_panel/student/${activeStudent.id}/busFee`, transportForm);
        if (res.data.success) {
            toast.success("Transport details updated");
            setIsEditingTransport(false);
            
            // Reload just ledger and balance
            setLedgerLoading(true);
            const [balanceRes, ledgerRes] = await Promise.all([
              api.post("/finance_panel/studentBalances", { students: [{ id: activeStudent.id, type: activeStudent.type, fee_exempted: activeStudent.fee_exempted, classes: activeStudent.classes, bus_fee: transportForm.bus_fee }] }),
              api.get(`/finance_panel/getStudentLedger/${activeStudent.id}`)
            ]);
            
            if (balanceRes.data.success && balanceRes.data.data.length > 0) {
              setBalanceData(balanceRes.data.data[0]);
            }
            if (ledgerRes.data.success) {
              setStudentLedger(ledgerRes.data.data);
              if (ledgerRes.data.data.studentDetails) {
                setStudentDetails(ledgerRes.data.data.studentDetails);
                setTransportForm({
                    bus_fee: ledgerRes.data.data.studentDetails.bus_fee || "",
                    bus_start_date: ledgerRes.data.data.studentDetails.bus_start_date || ""
                });
              }
            }
        }
    } catch (error) {
        toast.error("Failed to update transport details");
    } finally {
        setUpdatingTransport(false);
        setLedgerLoading(false);
    }
  };

  if (!activeStudent) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading student details...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ padding: "1rem 2rem", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ padding: "8px" }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: "700", color: "white" }}>
            {activeStudent.name.charAt(0)}
          </div>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", lineHeight: 1 }}>{activeStudent.name}</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>Student Details & Financial Ledger</p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Personal Information</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Admission No</label>
              <div style={{ fontWeight: "500", display: "flex", alignItems: "center", gap: "0.5rem" }}><Hash size={14} /> {activeStudent.admission_number || "-"}</div>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Class</label>
              <div style={{ fontWeight: "500" }}>{studentClassName}</div>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Gender</label>
              <div style={{ fontWeight: "500", textTransform: "capitalize" }}>{activeStudent.gender || "-"}</div>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Date of Joining</label>
              <div style={{ fontWeight: "500", display: "flex", alignItems: "center", gap: "0.5rem" }}><Calendar size={14} /> {activeStudent.admission_date ? new Date(activeStudent.admission_date).toLocaleDateString() : (activeStudent.created_at ? new Date(activeStudent.created_at).toLocaleDateString() : "-")}</div>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Email</label>
              <div style={{ fontWeight: "500", display: "flex", alignItems: "center", gap: "0.5rem", wordBreak: "break-all" }}><Mail size={14} /> {activeStudent.email || "-"}</div>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Phone</label>
              <div style={{ fontWeight: "500", display: "flex", alignItems: "center", gap: "0.5rem" }}><Phone size={14} /> {activeStudent.phone || "-"}</div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Address</label>
              <div style={{ fontWeight: "500", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}><MapPin size={14} style={{ marginTop: "2px" }} /> {activeStudent.address || "-"}</div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Financial Overview</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", flex: 1 }}>
            
            <div style={{ background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.875rem", color: "#3b82f6", fontWeight: "600", textTransform: "uppercase" }}>Total Fees Due</p>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#3b82f6", margin: 0 }}>₹{balanceData.totalDue.toLocaleString()}</h3>
              </div>
              <Receipt size={32} color="#3b82f6" opacity={0.5} />
            </div>

            <div style={{ background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.875rem", color: "#10b981", fontWeight: "600", textTransform: "uppercase" }}>Total Fees Paid</p>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#10b981", margin: 0 }}>₹{balanceData.totalPaid.toLocaleString()}</h3>
              </div>
              <CheckCircle size={32} color="#10b981" opacity={0.5} />
            </div>

            <div style={{ background: balanceData.balance > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)", borderRadius: "8px", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.875rem", color: balanceData.balance > 0 ? "#ef4444" : "#10b981", fontWeight: "600", textTransform: "uppercase" }}>Pending Balance</p>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: balanceData.balance > 0 ? "#ef4444" : "#10b981", margin: 0 }}>₹{balanceData.balance.toLocaleString()}</h3>
              </div>
              <Clock size={32} color={balanceData.balance > 0 ? "#ef4444" : "#10b981"} opacity={0.5} />
            </div>

            {activeStudent.fee_exempted && (
              <div style={{ padding: "0.75rem", textAlign: "center", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", color: "#10b981", fontWeight: "600" }}>
                Student is fully fee exempted.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transport Settings Section */}
      {!activeStudent.fee_exempted && (
        <div style={{ marginBottom: "1.5rem", padding: "1.5rem", background: "var(--glass-bg)", borderRadius: "12px", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "0.75rem", borderRadius: "50%" }}>
              <Bus size={24} />
            </div>
            <div>
              <div style={{ fontWeight: "600", fontSize: "1.1rem", color: "var(--text-primary)" }}>Transport & Bus Fee</div>
              {!isEditingTransport ? (
                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {studentDetails.bus_fee > 0 ? (
                    <>Fee: <span style={{fontWeight: 600}}>₹{studentDetails.bus_fee}/month</span> | Start Date: <span style={{fontWeight: 600}}>{studentDetails.bus_start_date ? new Date(studentDetails.bus_start_date).toLocaleDateString() : "N/A"}</span></>
                  ) : (
                    <>Not using transport service</>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", alignItems: "center" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "2px" }}>Monthly Bus Fee (₹)</label>
                    <input 
                      type="number" 
                      placeholder="Bus Fee" 
                      className="input-glass" 
                      style={{ padding: "0.5rem", fontSize: "0.875rem", width: "120px" }} 
                      value={transportForm.bus_fee} 
                      onChange={(e) => setTransportForm({...transportForm, bus_fee: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "2px" }}>Start Date</label>
                    <input 
                      type="date" 
                      className="input-glass" 
                      style={{ padding: "0.5rem", fontSize: "0.875rem" }} 
                      value={transportForm.bus_start_date} 
                      onChange={(e) => setTransportForm({...transportForm, bus_start_date: e.target.value})} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {!isEditingTransport ? (
              <button onClick={() => setIsEditingTransport(true)} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "8px", color: "var(--text-secondary)" }}>
                <Edit2 size={16} /> Edit Transport
              </button>
            ) : (
              <>
                <button onClick={() => setIsEditingTransport(false)} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "8px", color: "var(--text-secondary)" }}>
                  <X size={16} /> Cancel
                </button>
                <button onClick={handleUpdateTransport} disabled={updatingTransport} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "8px" }}>
                  <Save size={16} /> {updatingTransport ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ flex: 1, padding: "1.5rem", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Payment History</h2>
        
        <div style={{ overflowY: "auto", flex: 1 }}>
          {ledgerLoading ? (
             <div style={{ padding: "2rem", textAlign: "center" }}>Loading payments...</div>
          ) : studentLedger.payments.length === 0 ? (
             <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No payment history found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--glass-bg)", zIndex: 10 }}>
                <tr style={{ borderBottom: "2px solid var(--glass-border)" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>DATE</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>RECEIPT NO</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>FEE TITLE</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>AMOUNT PAID</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>MODE</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {studentLedger.payments.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s" }} className="hover-row">
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem", fontFamily: "monospace" }}>
                      RCT-{String(p.id).substring(0,8).toUpperCase()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", fontWeight: "500" }}>
                      {p.fee?.title || "-"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#10b981", fontSize: "0.875rem", fontWeight: "600" }}>
                      ₹{p.amount_paid}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      {p.payment_mode || "Cash"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      {p.remarks || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentFinanceDetails;
