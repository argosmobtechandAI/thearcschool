import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

const StaffRoles = () => {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    user_id: "",
    role_title: "",
    duties: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, usersRes] = await Promise.all([
        api.get("/admin_panel/roles"),
        api.get("/admin_panel/users") // Assuming users route exists
      ]);
      setRoles(rolesRes.data?.data || []);
      setUsers(usersRes.data?.data || []);
    } catch (err) {
      toast.error("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (role = null) => {
    if (role) {
      setFormData({
        id: role.id,
        user_id: role.user_id,
        role_title: role.role_title,
        duties: role.duties || ""
      });
    } else {
      setFormData({ id: null, user_id: "", role_title: "", duties: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (formData.id) {
        await api.put(`/admin_panel/roles/${formData.id}`, formData);
        toast.success("Role updated successfully");
      } else {
        await api.post("/admin_panel/roles", formData);
        toast.success("Role added successfully");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this role assignment?")) return;
    try {
      await api.delete(`/admin_panel/roles/${id}`);
      toast.success("Role deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete role");
    }
  };

  return (
    <div className="fade-in" style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.5rem" }}>Staff Leadership Roles</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage administrative and academic responsibilities for staff</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={18} />
          Assign Role
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "0" }}>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role Title</th>
                <th>Duties / Responsibilities</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
              ) : roles.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>No roles assigned yet.</td></tr>
              ) : (
                roles.map(role => (
                  <tr key={role.id}>
                    <td>
                      <div style={{ fontWeight: "600" }}>{role.user?.name || "Unknown"}</div>
                      <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{role.user?.email}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                        {role.role_title}
                      </span>
                    </td>
                    <td>
                      <div style={{ maxWidth: "400px", whiteSpace: "pre-wrap", fontSize: "0.875rem" }}>
                        {role.duties}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button onClick={() => handleOpenModal(role)} className="btn btn-ghost btn-icon" style={{ color: "#3b82f6" }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(role.id)} className="btn btn-ghost btn-icon" style={{ color: "#ef4444" }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem", position: "relative" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>
              {formData.id ? "Edit Role" : "Assign New Role"}
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Staff Member *</label>
                <select 
                  className="input-glass" 
                  value={formData.user_id} 
                  onChange={e => setFormData({ ...formData, user_id: e.target.value })}
                  required
                >
                  <option value="">Select Staff...</option>
                  {users.filter(u => u.role === "teacher" || u.role === "admin" || u.role === "accountant" || u.role === "principal").map(user => (
                    <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Role Title *</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  value={formData.role_title} 
                  onChange={e => setFormData({ ...formData, role_title: e.target.value })}
                  placeholder="e.g. Academic Incharge, Maths HOD"
                  required 
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Duties & Responsibilities</label>
                <textarea 
                  className="input-glass" 
                  style={{ minHeight: "120px", resize: "vertical" }}
                  value={formData.duties} 
                  onChange={e => setFormData({ ...formData, duties: e.target.value })}
                  placeholder="List the specific duties..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffRoles;
