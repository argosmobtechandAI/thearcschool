import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchRooms } from "../features/dataSlice";
import api from "../services/api";
import { toast } from "react-toastify";
import { Plus, Trash2, Edit2, Search } from "lucide-react";
import TableFilterHeader from "../components/TableFilterHeader";

const RoomManagement = () => {
  const dispatch = useDispatch();
  const { rooms, loadingRooms } = useSelector((state) => state.data);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", capacity: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rooms, searchQuery]);

  const handleOpenModal = (room = null) => {
    if (room) {
      setEditingId(room.id);
      setFormData({ name: room.name, capacity: room.capacity || "" });
    } else {
      setEditingId(null);
      setFormData({ name: "", capacity: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Room name is required");
    
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        capacity: formData.capacity ? parseInt(formData.capacity) : null
      };

      if (editingId) {
        await api.put(`/rooms/updateRoom/${editingId}`, { data: payload });
        toast.success("Room updated successfully");
      } else {
        await api.post("/rooms/createRoom", { data: payload });
        toast.success("Room created successfully");
      }
      setIsModalOpen(false);
      dispatch(fetchRooms());
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
      await api.delete(`/rooms/deleteRoom/${id}`);
      toast.success("Room deleted successfully");
      dispatch(fetchRooms());
    } catch (error) {
      toast.error(error.response?.data?.message || "Deletion failed");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Room Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage physical rooms and labs for scheduling</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          <Plus size={18} /> Add Room
        </button>
      </div>

      <div style={{ flexShrink: 0 }}>
          <TableFilterHeader>
        <div style={{ display: "flex", gap: "1rem", flex: 1 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
            <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              type="text"
              placeholder="Search rooms..."
              className="input-glass"
              style={{ paddingLeft: "2.75rem", width: "100%" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </TableFilterHeader>
        </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        {loadingRooms ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
            <p>No rooms found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600", width: "80px" }}>S.No.</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600" }}>Room Name</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600" }}>Capacity</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room, index) => (
                  <tr key={room.id} className="table-row-hover" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{index + 1}</td>
                    <td style={{ padding: "1rem", fontWeight: "500" }}>{room.name}</td>
                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{room.capacity || "-"}</td>
                    <td style={{ padding: "1rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button onClick={() => handleOpenModal(room)} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#3b82f6", background: "rgba(59, 130, 246, 0.1)", borderRadius: "4px", border: "none", cursor: "pointer" }}>
                          <Edit2 size={14} style={{ marginRight: "0.25rem" }} /> Edit
                        </button>
                        <button onClick={() => handleDelete(room.id)} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px", border: "none", cursor: "pointer" }}>
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
              {editingId ? "Edit Room" : "Add Room"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Room Name/Number</label>
                <input
                  type="text"
                  className="input-glass"
                  placeholder="e.g. Lab 1, Room 101"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Capacity (Optional)</label>
                <input
                  type="number"
                  className="input-glass"
                  placeholder="e.g. 40"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Save Room"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagement;
