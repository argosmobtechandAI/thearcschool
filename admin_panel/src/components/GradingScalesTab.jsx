import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGradingScales } from "../features/dataSlice";
import { Edit2, Trash2, Plus, X } from "lucide-react";
import api from "../services/api";
import { toast } from "react-toastify";

const GradingScalesTab = () => {
  const dispatch = useDispatch();
  const { gradingScales, loading } = useSelector((state) => state.data);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScale, setEditingScale] = useState(null);
  
  const [formData, setFormData] = useState({
    grade: "",
    min_percentage: "",
    max_percentage: "",
    color_hex: "#16a34a",
  });

  useEffect(() => {
    dispatch(fetchGradingScales());
  }, [dispatch]);

  const handleOpenModal = (scale = null) => {
    if (scale) {
      setEditingScale(scale);
      setFormData({
        grade: scale.grade,
        min_percentage: scale.min_percentage,
        max_percentage: scale.max_percentage,
        color_hex: scale.color_hex,
      });
    } else {
      setEditingScale(null);
      setFormData({ grade: "", min_percentage: "", max_percentage: "", color_hex: "#16a34a" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingScale) {
        await api.put(`/admin_panel/grading-scales/${editingScale.id}`, formData);
        toast.success("Grading scale updated!");
      } else {
        await api.post(`/admin_panel/grading-scales`, formData);
        toast.success("Grading scale added!");
      }
      setIsModalOpen(false);
      dispatch(fetchGradingScales());
    } catch (error) {
      toast.error(error.response?.data?.error || "Error saving grading scale");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this grading rule?")) {
      try {
        await api.delete(`/admin_panel/grading-scales/${id}`);
        toast.success("Grading scale deleted!");
        dispatch(fetchGradingScales());
      } catch (error) {
        toast.error("Error deleting scale");
      }
    }
  };

  if (loading) return <div className="p-4 text-center">Loading grading scales...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Grading Policies</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Define exactly how percentages translate to Letter Grades and visual colors.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Grade Rule
        </button>
      </div>

      <div className="glass-panel" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.03)", textAlign: "left", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>Grade</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>Range (Min - Max)</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>UI Color</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(gradingScales || []).map((scale) => (
              <tr key={scale.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <td style={{ padding: "1rem", fontWeight: "700", color: scale.color_hex }}>{scale.grade}</td>
                <td style={{ padding: "1rem" }}>{scale.min_percentage}% - {scale.max_percentage}%</td>
                <td style={{ padding: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: scale.color_hex }} />
                    <span style={{ fontSize: "0.875rem", fontFamily: "monospace" }}>{scale.color_hex}</span>
                  </div>
                </td>
                <td style={{ padding: "1rem", textAlign: "right" }}>
                  <button className="btn btn-ghost" style={{ padding: "0.5rem" }} onClick={() => handleOpenModal(scale)}>
                    <Edit2 size={16} color="var(--text-secondary)" />
                  </button>
                  <button className="btn btn-ghost" style={{ padding: "0.5rem" }} onClick={() => handleDelete(scale.id)}>
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </td>
              </tr>
            ))}
            {gradingScales?.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                  No grading scales configured yet. Click "Add Grade Rule" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "500px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "600" }}>{editingScale ? "Edit Grade Rule" : "New Grade Rule"}</h3>
              <button className="btn btn-ghost" style={{ padding: "0.5rem" }} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>Grade Letter / Name</label>
                <input
                  className="input-glass"
                  placeholder="e.g. A+, Pass, Distinction"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>Min Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-glass"
                    value={formData.min_percentage}
                    onChange={(e) => setFormData({ ...formData, min_percentage: e.target.value })}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>Max Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-glass"
                    value={formData.max_percentage}
                    onChange={(e) => setFormData({ ...formData, max_percentage: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>UI Color</label>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input
                    type="color"
                    style={{ width: "40px", height: "40px", padding: 0, cursor: "pointer", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden", backgroundColor: "transparent" }}
                    value={formData.color_hex}
                    onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                  />
                  <input
                    className="input-glass"
                    style={{ flex: 1, fontFamily: "monospace" }}
                    value={formData.color_hex}
                    onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                    required
                    pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    title="Please enter a valid hex color code (e.g. #16a34a)"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradingScalesTab;
