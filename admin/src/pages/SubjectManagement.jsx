import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSubjects, fetchClasses } from "../features/dataSlice";
import api from "../services/api";
import { toast } from "react-toastify";
import { Plus, Trash2, Edit2, Search } from "lucide-react";
import TableFilterHeader from "../components/TableFilterHeader";

const SubjectManagement = () => {
  const dispatch = useDispatch();
  const { subjects, loadingSubjects, classes } = useSelector((state) => state.data);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", classIds: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchSubjects());
    if (!classes || classes.length === 0) dispatch(fetchClasses());
  }, [dispatch, classes?.length]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subjects, searchQuery]);

  const handleOpenModal = (subject = null) => {
    if (subject) {
      setEditingId(subject.id);
      setFormData({ name: subject.name, classIds: subject.classIds || [] });
    } else {
      setEditingId(null);
      setFormData({ name: "", classIds: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Subject name is required");
    
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/admin_panel/subjects/updateSubject/${editingId}`, { data: formData });
        toast.success("Subject updated successfully");
      } else {
        await api.post("/admin_panel/subjects/createSubject", { data: formData });
        toast.success("Subject created successfully");
      }
      setIsModalOpen(false);
      dispatch(fetchSubjects());
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    try {
      await api.delete(`/admin_panel/subjects/deleteSubject/${id}`);
      toast.success("Subject deleted successfully");
      dispatch(fetchSubjects());
    } catch (error) {
      toast.error(error.response?.data?.message || "Deletion failed");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Subject Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage subjects for timetable and curriculum</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          <Plus size={18} /> Add Subject
        </button>
      </div>

      <TableFilterHeader>
        <div style={{ display: "flex", gap: "1rem", flex: 1 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
            <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              type="text"
              placeholder="Search subjects..."
              className="input-glass"
              style={{ paddingLeft: "2.75rem", width: "100%" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </TableFilterHeader>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        {loadingSubjects ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>
        ) : filteredSubjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
            <p>No subjects found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600" }}>Subject Name</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600" }}>Classes Taught In</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="table-row-hover" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "1rem", fontWeight: "600", color: "var(--text-primary)" }}>{subject.name}</td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {subject.classIds?.length > 0 ? (
                          subject.classIds.map((cId) => {
                            const clsInfo = classes?.find(c => c.id === cId);
                            const cName = clsInfo ? `${clsInfo.className || clsInfo.name} - ${clsInfo.section}` : "Unknown Class";
                            return (
                              <span key={cId} style={{ background: "var(--accent-light)", color: "var(--accent-primary)", padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "600" }}>
                                {cName}
                              </span>
                            );
                          })
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontStyle: "italic" }}>Not assigned to any classes</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button onClick={() => handleOpenModal(subject)} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#3b82f6", background: "rgba(59, 130, 246, 0.1)", borderRadius: "4px", border: "none", cursor: "pointer" }}>
                          <Edit2 size={14} style={{ marginRight: "0.25rem" }} /> Edit
                        </button>
                        <button onClick={() => handleDelete(subject.id)} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px", border: "none", cursor: "pointer" }}>
                          <Trash2 size={14} style={{ marginRight: "0.25rem" }} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setIsModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>
              {editingId ? "Edit Subject" : "Add Subject"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Subject Name</label>
                <input
                  type="text"
                  className="input-glass"
                  placeholder="e.g. Mathematics"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600" }}>Assign to Classes</label>
                <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.5rem", background: "rgba(255,255,255,0.5)" }}>
                  {classes?.length > 0 ? classes.map(c => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.5rem", cursor: "pointer", borderRadius: "4px" }} className="table-row-hover">
                      <input
                        type="checkbox"
                        checked={formData.classIds.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, classIds: [...formData.classIds, c.id] });
                          } else {
                            setFormData({ ...formData, classIds: formData.classIds.filter(id => id !== c.id) });
                          }
                        }}
                      />
                      <span style={{ fontSize: "0.875rem" }}>{c.className || c.name} - {c.section}</span>
                    </label>
                  )) : (
                    <div style={{ padding: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>No classes available</div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Save Subject"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;
