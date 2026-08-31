import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import api from "../services/api";
import { toast } from "react-toastify";

const CloseYearModal = ({ isOpen, onClose, currentAcademicYear, generateAcademicYears }) => {
  const [loading, setLoading] = useState(false);
  const [newYear, setNewYear] = useState(
    generateAcademicYears().find(y => parseInt(y.split("-")[0]) === parseInt(currentAcademicYear.split("-")[0]) + 1) || ""
  );

  if (!isOpen) return null;

  const handleCloseYear = async () => {
    if (!newYear) return toast.error("Please select a target year for arrears.");
    if (newYear === currentAcademicYear) return toast.error("Target year must be different from current year.");

    if (!window.confirm(`Are you sure you want to close ${currentAcademicYear} and carry forward unpaid dues as Arrears to ${newYear}? This action cannot be undone.`)) return;

    setLoading(true);
    try {
      const res = await api.post("/finance_panel/closeFinancialYear", {
        currentAcademicYear,
        newAcademicYear: newYear
      });
      if (res.data.success) {
        toast.success(res.data.message);
        onClose();
      } else {
        toast.error(res.data.message || "Failed to close year");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred while closing the year");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="animate-fade-in" 
      style={{ 
        position: "fixed", 
        inset: 0, 
        zIndex: 9999, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        background: "rgba(15, 23, 42, 0.55)", 
        backdropFilter: "blur(6px)",
        padding: "1rem"
      }}
      onClick={onClose}
    >
      <div 
        className="glass-panel modal-content" 
        style={{ 
          width: "100%", 
          maxWidth: "460px", 
          padding: "1.5rem", 
          borderRadius: "14px", 
          background: "#ffffff", 
          border: "1px solid var(--glass-border)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "1.15rem"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.85rem" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "0.5rem", color: "#dc2626" }}>
            <AlertTriangle size={20} /> Close Financial Year
          </h3>
          <button 
            onClick={onClose} 
            className="btn btn-ghost" 
            style={{ width: "32px", height: "32px", padding: 0, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.5, margin: 0 }}>
            Closing the financial year will calculate all unpaid dues for <strong>{currentAcademicYear}</strong> and carry them forward as an "Arrears" fee item into the target academic session.
          </p>

          <div>
            <label style={{ display: "block", fontSize: "0.74rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Carry Forward Arrears To:
            </label>
            <select 
              className="input-glass" 
              value={newYear} 
              onChange={(e) => setNewYear(e.target.value)}
              style={{ width: "100%", height: "36px", margin: 0, fontSize: "0.84rem", fontWeight: "600" }}
            >
              <option value="">Select Target Year</option>
              {generateAcademicYears().map(year => (
                <option key={year} value={year} disabled={year === currentAcademicYear}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem", paddingTop: "0.85rem", borderTop: "1px solid var(--glass-border)" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading} style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", border: "1px solid var(--glass-border)" }}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleCloseYear} 
            disabled={loading} 
            style={{ padding: "0.4rem 1.25rem", fontSize: "0.8rem", fontWeight: "700", background: "#dc2626", borderColor: "#dc2626" }}
          >
            {loading ? "Processing..." : "Confirm & Close Year"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloseYearModal;
