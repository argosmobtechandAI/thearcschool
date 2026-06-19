import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFeeStructures, updateFeeStructure } from "../features/dataSlice";
import { Edit, Save, X } from "lucide-react";
import { toast } from "react-toastify";

const FeeStructures = () => {
  const dispatch = useDispatch();
  const { feeStructures, loadingFeeStructures } = useSelector(state => state.data);
  const { user } = useSelector(state => state.auth);
  const isFinanceTeam = user?.type === 'finance' || user?.type === 'accountant';

  const getCurrentAcademicYear = () => {
    const today = new Date();
    const month = today.getMonth();
    let year = today.getFullYear();
    if (month < 3) year -= 1;
    return `${year}-${year + 1}`;
  };

  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());

  useEffect(() => {
    dispatch(fetchFeeStructures(academicYear));
  }, [dispatch, academicYear]);

  const handleEditClick = (struct) => {
    setEditingId(struct.id);
    setEditAmount(struct.amount);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
  };

  const handleSave = async (id) => {
    if (!editAmount || isNaN(editAmount)) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      await dispatch(updateFeeStructure({ id, amount: Number(editAmount) })).unwrap();
      toast.success("Fee structure updated");
      setEditingId(null);
      setEditAmount("");
    } catch (err) {
      toast.error(err.message || "Failed to update fee structure");
    }
  };

  const formatCategory = (cat) => {
    return cat.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>Fee Structures Configuration</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage master amounts for tuition, transport, and admissions</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Academic Year</label>
          <select 
            value={academicYear} 
            onChange={e => setAcademicYear(e.target.value)} 
            className="input-glass"
            style={{ minWidth: "150px" }}
          >
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
            <option value="2027-2028">2027-2028</option>
          </select>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        {loadingFeeStructures ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>Loading structures...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <th style={{ padding: "0.5rem 1rem" }}>Category</th>
                  <th style={{ padding: "0.5rem 1rem" }}>Class / Identifier</th>
                  <th style={{ padding: "0.5rem 1rem" }}>Amount (₹)</th>
                  <th style={{ padding: "0.5rem 1rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feeStructures.map(struct => (
                  <tr key={struct.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }} className="hover-row">
                    <td style={{ padding: "1rem", fontWeight: "500" }}>{formatCategory(struct.fee_category)}</td>
                    <td style={{ padding: "1rem" }}>{struct.class_name || "-"}</td>
                    <td style={{ padding: "1rem" }}>
                      {editingId === struct.id ? (
                        <input
                          type="number"
                          className="input-glass"
                          style={{ padding: "0.25rem 0.5rem", width: "100px" }}
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                        />
                      ) : (
                        `₹${struct.amount}`
                      )}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right" }}>
                      {isFinanceTeam && (
                        editingId === struct.id ? (
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            <button onClick={() => handleSave(struct.id)} className="btn-ghost" style={{ display: "flex", alignItems: "center", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
                              <Save size={14} />
                            </button>
                            <button onClick={handleCancelEdit} className="btn-ghost" style={{ display: "flex", alignItems: "center", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleEditClick(struct)} className="btn-ghost" style={{ display: "flex", alignItems: "center", color: "#3b82f6", background: "rgba(59, 130, 246, 0.1)", padding: "0.25rem 0.5rem", borderRadius: "4px", marginLeft: "auto" }}>
                            <Edit size={14} style={{ marginRight: "0.25rem" }}/> Edit
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
                {feeStructures.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                      No fee structures found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeStructures;
