import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFeeStructures, updateFeeStructure, addFeeStructure, deleteFeeStructure, fetchClasses } from "../features/dataSlice";
import { Edit, Save, X, Plus, Trash } from "lucide-react";
import { toast } from "react-toastify";

const FeeStructures = () => {
  const dispatch = useDispatch();
  const { feeStructures, loadingFeeStructures, classes: globalClasses } = useSelector(state => state.data);
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

  const [isCustomFeeModalOpen, setIsCustomFeeModalOpen] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [customClass, setCustomClass] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customFrequency, setCustomFrequency] = useState("monthly");
  const [isAddingCustomFee, setIsAddingCustomFee] = useState(false);
  
  const availableClasses = feeStructures ? [...new Set(feeStructures.map(f => f.class_name).filter(Boolean))].sort() : [];
  
  // Extract unique class names (ignoring sections) for the dropdown
  const uniqueClassNames = globalClasses ? [...new Set(globalClasses.map(c => c.name))].sort() : [];

  useEffect(() => {
    dispatch(fetchFeeStructures(academicYear));
    dispatch(fetchClasses());
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

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this fee structure?")) {
      try {
        await dispatch(deleteFeeStructure(id)).unwrap();
        toast.success("Fee structure deleted successfully");
      } catch (err) {
        toast.error(err.message || "Failed to delete fee structure");
      }
    }
  };



  const handleAddCustomFee = async (e) => {
    e.preventDefault();
    if (!customCategory || !customAmount) {
      return toast.error("Category and Amount are required");
    }
    setIsAddingCustomFee(true);
    try {
      const finalCategory = customCategory.trim().replace(/\s+/g, '_') + '_' + customFrequency;
      await dispatch(addFeeStructure({
        fee_category: finalCategory,
        class_name: customClass || null,
        amount: Number(customAmount),
        academic_year: academicYear
      })).unwrap();
      toast.success("Custom fee structure added successfully");
      setIsCustomFeeModalOpen(false);
      setCustomCategory("");
      setCustomClass("");
      setCustomAmount("");
      setCustomFrequency("monthly");
    } catch (err) {
      toast.error(err.message || "Failed to add custom fee");
    } finally {
      setIsAddingCustomFee(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-secondary)" }}>Academic Year:</label>
          <select 
            value={academicYear} 
            onChange={e => setAcademicYear(e.target.value)} 
            className="input-glass"
            style={{ height: "34px", fontSize: "0.82rem", fontWeight: "600", minWidth: "140px", margin: 0 }}
          >
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
            <option value="2027-2028">2027-2028</option>
          </select>
        </div>
        
        {isFinanceTeam && (
          <button 
            onClick={() => setIsCustomFeeModalOpen(true)} 
            className="btn btn-primary" 
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: "700", background: "#7c3aed", borderColor: "#7c3aed" }}
          >
            <Plus size={16} strokeWidth={2.4} /> Add Custom Fee
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        {loadingFeeStructures ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>Loading structures...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <th style={{ padding: "0.5rem 1rem", width: "50px" }}>S.No.</th>
                  <th style={{ padding: "0.5rem 1rem" }}>Category</th>
                  <th style={{ padding: "0.5rem 1rem" }}>Class / Identifier</th>
                  <th style={{ padding: "0.5rem 1rem" }}>Amount (₹)</th>
                  <th style={{ padding: "0.5rem 1rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feeStructures.map((struct, index) => (
                  <tr key={struct.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }} className="hover-row">
                    <td style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: "500" }}>{index + 1}</td>
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
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            <button onClick={() => handleEditClick(struct)} className="btn-ghost" style={{ display: "flex", alignItems: "center", color: "#3b82f6", background: "rgba(59, 130, 246, 0.1)", padding: "0.25rem 0.5rem", borderRadius: "4px", marginLeft: "auto" }}>
                              <Edit size={14} style={{ marginRight: "0.25rem" }}/> Edit
                            </button>
                            <button onClick={() => handleDelete(struct.id)} className="btn-ghost" style={{ display: "flex", alignItems: "center", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
                              <Trash size={14} />
                            </button>
                          </div>
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

      {/* Add Custom Fee Modal */}
      {isCustomFeeModalOpen && (
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
          onClick={() => setIsCustomFeeModalOpen(false)}
        >
          <div 
            className="glass-panel modal-content" 
            style={{ 
              padding: "1.5rem", 
              width: "100%", 
              maxWidth: "440px", 
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(124, 58, 237, 0.12)", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={18} strokeWidth={2.4} />
                </div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>Add Custom Fee</h2>
              </div>
              <button 
                onClick={() => setIsCustomFeeModalOpen(false)}
                className="btn btn-ghost"
                style={{ width: "32px", height: "32px", padding: 0, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddCustomFee} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "0.35rem", color: "var(--text-secondary)" }}>Academic Year</label>
                <input type="text" className="input-glass" value={academicYear} disabled style={{ width: "100%", height: "36px", margin: 0, fontSize: "0.84rem", fontWeight: "600" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "0.35rem", color: "var(--text-secondary)" }}>Category Name (e.g. Lab Fee) *</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  value={customCategory} 
                  onChange={(e) => setCustomCategory(e.target.value)} 
                  placeholder="Enter category name"
                  required
                  style={{ width: "100%", height: "36px", margin: 0, fontSize: "0.84rem" }} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "0.35rem", color: "var(--text-secondary)" }}>Class (Optional)</label>
                <select 
                  className="input-glass" 
                  value={customClass} 
                  onChange={(e) => setCustomClass(e.target.value)} 
                  style={{ width: "100%", height: "36px", margin: 0, fontSize: "0.84rem", fontWeight: "600" }} 
                >
                  <option value="">All Classes (School-wide)</option>
                  {uniqueClassNames.map(name => <option key={name} value={name}>Class {name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "0.35rem", color: "var(--text-secondary)" }}>Billing Frequency</label>
                <select 
                  className="input-glass" 
                  value={customFrequency} 
                  onChange={(e) => setCustomFrequency(e.target.value)} 
                  style={{ width: "100%", height: "36px", margin: 0, fontSize: "0.84rem", fontWeight: "600" }} 
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual / Yearly</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "0.35rem", color: "var(--text-secondary)" }}>Amount (₹) *</label>
                <input 
                  type="number" 
                  className="input-glass" 
                  value={customAmount} 
                  onChange={(e) => setCustomAmount(e.target.value)} 
                  placeholder="0"
                  required
                  min="1"
                  style={{ width: "100%", height: "36px", margin: 0, fontSize: "0.9rem", fontWeight: "700" }} 
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem", paddingTop: "0.75rem", borderTop: "1px solid var(--glass-border)" }}>
                <button type="button" onClick={() => setIsCustomFeeModalOpen(false)} className="btn btn-ghost" style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", border: "1px solid var(--glass-border)" }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.4rem 1.25rem", fontSize: "0.8rem", fontWeight: "700", background: "#7c3aed", borderColor: "#7c3aed" }} disabled={isAddingCustomFee}>
                  {isAddingCustomFee ? "Saving..." : "Save Custom Fee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeStructures;
