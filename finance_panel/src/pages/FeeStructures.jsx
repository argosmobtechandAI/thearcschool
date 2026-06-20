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
      await dispatch(addFeeStructure({
        fee_category: customCategory,
        class_name: customClass || null,
        amount: Number(customAmount),
        academic_year: academicYear
      })).unwrap();
      toast.success("Custom fee structure added successfully");
      setIsCustomFeeModalOpen(false);
      setCustomCategory("");
      setCustomClass("");
      setCustomAmount("");
    } catch (err) {
      toast.error(err.message || "Failed to add custom fee");
    } finally {
      setIsAddingCustomFee(false);
    }
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
          
          {isFinanceTeam && (
            <button 
              onClick={() => setIsCustomFeeModalOpen(true)} 
              className="btn-primary" 
              style={{ display: "inline-flex", alignItems: "center", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.875rem", fontWeight: "500", marginTop: "1rem" }}
            >
              <Plus size={16} style={{ marginRight: "0.5rem" }} /> Add Custom Fee
            </button>
          )}
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
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="glass-panel" style={{ padding: "2rem", width: "100%", maxWidth: "400px", position: "relative" }}>
            <button 
              onClick={() => setIsCustomFeeModalOpen(false)}
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
            >
              <X size={20} />
            </button>
            
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem" }}>Add Custom Fee</h2>
            
            <form onSubmit={handleAddCustomFee}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Academic Year</label>
                <input type="text" className="input-glass" value={academicYear} disabled style={{ width: "100%" }} />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Category Name (e.g. Lab Fee)</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  value={customCategory} 
                  onChange={(e) => setCustomCategory(e.target.value)} 
                  placeholder="Enter category name"
                  required
                  style={{ width: "100%" }} 
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Class (Optional)</label>
                <select 
                  className="input-glass" 
                  value={customClass} 
                  onChange={(e) => setCustomClass(e.target.value)} 
                  style={{ width: "100%", padding: "0.5rem" }} 
                >
                  <option value="">All Classes (School-wide)</option>
                  {uniqueClassNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Amount (₹)</label>
                <input 
                  type="number" 
                  className="input-glass" 
                  value={customAmount} 
                  onChange={(e) => setCustomAmount(e.target.value)} 
                  placeholder="0"
                  required
                  style={{ width: "100%" }} 
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button type="button" onClick={() => setIsCustomFeeModalOpen(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={isAddingCustomFee}>
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
