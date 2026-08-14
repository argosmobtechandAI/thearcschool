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
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="glass-panel" style={{ width: "90%", maxWidth: "500px", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle className="text-warning" size={24} /> Close Financial Year
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem", lineHeight: 1.5 }}>
            Closing the financial year will calculate all unpaid dues for <strong>{currentAcademicYear}</strong> and carry them forward as an "Arrears" fee into the selected target year.
          </p>

          <div className="form-group">
            <label className="form-label">Carry Forward Arrears To:</label>
            <select 
              className="form-control" 
              value={newYear} 
              onChange={(e) => setNewYear(e.target.value)}
            >
              <option value="">Select Target Year</option>
              {generateAcademicYears().map(year => (
                <option key={year} value={year} disabled={year === currentAcademicYear}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCloseYear} disabled={loading} style={{ background: "#ef4444" }}>
            {loading ? "Processing..." : "Confirm & Close Year"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloseYearModal;
