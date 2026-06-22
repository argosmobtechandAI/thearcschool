import React, { useState, useEffect } from "react";
import { X, Send, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

const ConsentReportModal = ({ isOpen, onClose, event }) => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && event?.id) {
      fetchReport();
    }
  }, [isOpen, event]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin_panel/planner/consent-report/${event.id}`);
      setReportData(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load consent report");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminders = async () => {
    try {
      await api.post(`/admin_panel/planner/consent-reminders/${event.id}`);
      toast.success("Reminders sent successfully!");
    } catch (error) {
      toast.error("Failed to send reminders");
    }
  };

  const handleMockConsent = async (consentId, status) => {
    try {
      await api.post(`/admin_panel/planner/mock-consent/${consentId}`, { status });
      toast.success(`Consent marked as ${status}`);
      fetchReport();
    } catch (error) {
      toast.error("Failed to update consent");
    }
  };

  if (!isOpen) return null;

  const approvedCount = reportData.filter(d => d.status === 'approved').length;
  const declinedCount = reportData.filter(d => d.status === 'declined').length;
  const pendingCount = reportData.filter(d => d.status === 'pending').length;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
    }}>
      <div className="glass-panel" style={{
        background: "var(--bg-primary)",
        width: "90%", maxWidth: "800px",
        borderRadius: "16px", padding: "2rem",
        maxHeight: "90vh", overflowY: "auto",
        position: "relative"
      }}>
        <button onClick={onClose} className="btn btn-ghost" style={{ position: "absolute", top: "1rem", right: "1rem", padding: "0.5rem" }}>
          <X size={20} />
        </button>

        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>Consent Report</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Event: {event?.title}</p>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px", padding: "1.5rem", textAlign: "center" }}>
            <CheckCircle size={32} color="#10b981" style={{ margin: "0 auto 0.5rem" }} />
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#10b981" }}>{approvedCount}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Approved</div>
          </div>
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "1.5rem", textAlign: "center" }}>
            <XCircle size={32} color="#ef4444" style={{ margin: "0 auto 0.5rem" }} />
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#ef4444" }}>{declinedCount}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Declined</div>
          </div>
          <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "12px", padding: "1.5rem", textAlign: "center" }}>
            <Clock size={32} color="#f59e0b" style={{ margin: "0 auto 0.5rem" }} />
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#f59e0b" }}>{pendingCount}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Pending</div>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Student List</h3>
          <button 
            onClick={handleSendReminders} 
            className="btn btn-primary" 
            disabled={pendingCount === 0}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Send size={16} /> Send Reminders ({pendingCount})
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>Loading report...</p>
        ) : reportData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed var(--glass-border)" }}>
            <p style={{ color: "var(--text-secondary)" }}>No students found for this event. Have you set the Target Classes?</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                  <th style={{ padding: "1rem 0.5rem", color: "var(--text-secondary)", fontWeight: "500" }}>Student Name</th>
                  <th style={{ padding: "1rem 0.5rem", color: "var(--text-secondary)", fontWeight: "500" }}>Status</th>
                  <th style={{ padding: "1rem 0.5rem", color: "var(--text-secondary)", fontWeight: "500", textAlign: "right" }}>Mock Action</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "1rem 0.5rem" }}>{row.student_name}</td>
                    <td style={{ padding: "1rem 0.5rem" }}>
                      <span style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        backgroundColor: 
                          row.status === 'approved' ? "rgba(16, 185, 129, 0.1)" : 
                          row.status === 'declined' ? "rgba(239, 68, 68, 0.1)" : 
                          "rgba(245, 158, 11, 0.1)",
                        color: 
                          row.status === 'approved' ? "#10b981" : 
                          row.status === 'declined' ? "#ef4444" : 
                          "#f59e0b"
                      }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 0.5rem", textAlign: "right" }}>
                      <select 
                        className="input-glass" 
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem", width: "auto", display: "inline-block" }}
                        value={row.status}
                        onChange={(e) => handleMockConsent(row.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approve</option>
                        <option value="declined">Decline</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsentReportModal;
