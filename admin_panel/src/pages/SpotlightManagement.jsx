import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Star, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';

const SpotlightManagement = () => {
  const [spotlights, setSpotlights] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, date: '', title: '', description: '', image_url: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSpotlights();
  }, []);

  const fetchSpotlights = async () => {
    try {
      setLoading(true);
      const res = await api.get('/spotlight');
      if (res.data?.success) {
        setSpotlights(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/spotlight/${formData.id}`, formData);
      } else {
        await api.post('/spotlight', formData);
      }
      setIsModalOpen(false);
      fetchSpotlights();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this spotlight?")) return;
    try {
      await api.delete(`/spotlight/${id}`);
      fetchSpotlights();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const openNewModal = () => {
    setFormData({ id: null, date: new Date().toISOString().split('T')[0], title: '', description: '', image_url: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (spotlight) => {
    setFormData(spotlight);
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.5rem" }}>Spotlight of the Day</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage daily spotlights, announcements, and features for all users.</p>
        </div>
        <button onClick={openNewModal} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={18} /> Add Spotlight
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))" }}>
          {spotlights.map(s => (
            <div key={s.id} className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", minHeight: "220px", position: "relative" }}>
              <Star size={24} color="var(--primary-color)" style={{ opacity: 0.2, position: "absolute", top: "1rem", right: "1rem" }} />
              <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--primary-color)", marginBottom: "0.5rem" }}>{s.date}</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary)" }}>{s.title}</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: "1.4", flex: 1 }}>{s.description}</p>
              
              {s.image_url && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--primary-color)", background: "rgba(99, 102, 241, 0.08)", padding: "0.4rem 0.6rem", borderRadius: "6px", marginBottom: "1rem", alignSelf: "flex-start" }}>
                  <ImageIcon size={14} /> Image Attached
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
                <button onClick={() => openEditModal(s)} className="btn btn-ghost" style={{ flex: 1, color: "var(--primary-color)", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.25rem" }}>
                  <Edit2 size={16} /> Edit
                </button>
                <button onClick={() => handleDelete(s.id)} className="btn btn-ghost" style={{ flex: 1, color: "#ef4444", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.25rem" }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem", position: "relative" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>
              {formData.id ? "Edit Spotlight" : "Add Spotlight"}
            </h2>
            
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Date *</label>
                <input 
                  type="date" 
                  className="input-glass" 
                  value={formData.date} 
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Title *</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Science Exhibition Winner"
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Description *</label>
                <textarea 
                  className="input-glass" 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the spotlight highlight of the day..."
                  rows="4"
                  style={{ resize: "vertical" }}
                  required 
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Image URL (Optional)</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  value={formData.image_url || ''} 
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="e.g. https://cdn.thearcschool.in/spotlight/img.jpg"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotlightManagement;
