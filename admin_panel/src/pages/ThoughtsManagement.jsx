import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Quote } from 'lucide-react';
import api from '../services/api';

const ThoughtsManagement = () => {
  const [thoughts, setThoughts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, date: '', thought: '', author: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchThoughts();
  }, []);

  const fetchThoughts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/thoughts');
      if (res.data?.success) {
        setThoughts(res.data.data);
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
        await api.put(`/thoughts/${formData.id}`, formData);
      } else {
        await api.post('/thoughts', formData);
      }
      setIsModalOpen(false);
      fetchThoughts();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this thought?")) return;
    try {
      await api.delete(`/thoughts/${id}`);
      fetchThoughts();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const openNewModal = () => {
    setFormData({ id: null, date: new Date().toISOString().split('T')[0], thought: '', author: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (thought) => {
    setFormData(thought);
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.5rem" }}>Thought of the Day</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage daily quotes for students and teachers.</p>
        </div>
        <button onClick={openNewModal} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={18} /> Add Thought
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {thoughts.map(t => (
            <div key={t.id} className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
              <Quote size={24} color="var(--primary-color)" style={{ opacity: 0.2, position: "absolute", top: "1rem", right: "1rem" }} />
              <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--primary-color)", marginBottom: "1rem" }}>{t.date}</div>
              <p style={{ fontSize: "1.1rem", fontStyle: "italic", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-primary)" }}>"{t.thought}"</p>
              {t.author && <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>- {t.author}</p>}
              
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
                <button onClick={() => openEditModal(t)} className="btn btn-ghost" style={{ flex: 1, color: "var(--primary-color)", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.25rem" }}>
                  <Edit2 size={16} /> Edit
                </button>
                <button onClick={() => handleDelete(t.id)} className="btn btn-ghost" style={{ flex: 1, color: "#ef4444", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.25rem" }}>
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
              {formData.id ? "Edit Thought" : "Add Thought"}
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
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Thought/Quote *</label>
                <textarea 
                  className="input-glass" 
                  value={formData.thought} 
                  onChange={e => setFormData({ ...formData, thought: e.target.value })}
                  placeholder="e.g. Learn as if you will live forever..."
                  rows="3"
                  style={{ resize: "vertical" }}
                  required 
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Author (Optional)</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  value={formData.author} 
                  onChange={e => setFormData({ ...formData, author: e.target.value })}
                  placeholder="e.g. Mahatma Gandhi"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Thought
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThoughtsManagement;
