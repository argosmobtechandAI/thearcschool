import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Search, FileText, CheckCircle, Clock, X, Download, Trash2, Link } from "lucide-react";
import { fetchClasses } from "../features/dataSlice";
import { createCircular, getCirculars, deleteCircular, uploadCircularFile } from "../services/api";
import "../index.css";

const Circulars = () => {
  const dispatch = useDispatch();
  const { classes } = useSelector((state) => state.data);

  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterAudience, setFilterAudience] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCircular, setNewCircular] = useState({ 
    title: "", 
    content: "", 
    target_audience: "all", 
    class_id: "", 
    attachment_url: "" 
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [selectedCircular, setSelectedCircular] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    dispatch(fetchClasses());
    loadCirculars();
  }, []);

  const loadCirculars = async () => {
    setLoading(true);
    try {
      const res = await getCirculars();
      setCirculars(res.data.data || []);
    } catch (err) {
      console.error("Failed to load circulars", err);
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCircular.title.trim() || !newCircular.content.trim()) {
      alert("Please fill in the title and content fields.");
      return;
    }

    setLoading(true);
    try {
      let attachmentUrl = "";

      // 1. Upload File if selected
      if (selectedFile) {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await uploadCircularFile(formData);
        attachmentUrl = uploadRes.data.url;
        setUploadingFile(false);
      }

      // 2. Submit Circular
      const payload = {
        ...newCircular,
        attachment_url: attachmentUrl || newCircular.attachment_url
      };

      await createCircular(payload);
      setShowCreateModal(false);
      setNewCircular({ title: "", content: "", target_audience: "all", class_id: "", attachment_url: "" });
      setSelectedFile(null);
      loadCirculars();
    } catch (err) {
      console.error("Failed to create circular", err);
      alert(err.response?.data?.message || "Failed to create circular");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this circular? This action cannot be undone.")) {
      try {
        await deleteCircular(id);
        loadCirculars();
      } catch (err) {
        console.error("Failed to delete circular", err);
        alert(err.response?.data?.message || "Failed to delete circular");
      }
    }
  };

  const getAudienceLabel = (item) => {
    if (item.target_audience === "all") return "All Students & Teachers";
    if (item.target_audience === "teachers") return "Teachers Only";
    if (item.target_audience === "class") {
      const cls = classes.find(c => c.id === item.class_id);
      return cls ? `Class: ${cls.name}-${cls.section}` : "Class notice";
    }
    return item.target_audience;
  };

  const filteredCirculars = circulars.filter(circ => {
    const matchesAudience = filterAudience ? circ.target_audience === filterAudience : true;
    const matchesSearch = searchTerm 
      ? circ.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        circ.content.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesAudience && matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Circular Management</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Publish and distribute school circulars and DM announcements</p>
        </div>
        <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> Publish Circular
        </button>
      </div>

      {/* Filter and search row */}
      <div className="glass-panel" style={{ padding: "1rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input 
            type="text" 
            placeholder="Search circulars..." 
            className="input-glass" 
            style={{ paddingLeft: "2.25rem", width: "100%" }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="input-glass" 
          style={{ width: "200px" }}
          value={filterAudience}
          onChange={(e) => setFilterAudience(e.target.value)}
        >
          <option value="">All Audiences</option>
          <option value="all">Everyone</option>
          <option value="teachers">Teachers Only</option>
          <option value="class">Specific Classes</option>
        </select>
      </div>

      {/* Circulars Table */}
      <div className="glass-panel" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
              <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: "600", fontSize: "0.875rem" }}>Date</th>
              <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: "600", fontSize: "0.875rem" }}>Title</th>
              <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: "600", fontSize: "0.875rem" }}>Target Audience</th>
              <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: "600", fontSize: "0.875rem" }}>Attachment</th>
              <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: "600", fontSize: "0.875rem", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && filteredCirculars.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading circulars...</td>
              </tr>
            ) : filteredCirculars.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No circulars found.</td>
              </tr>
            ) : (
              filteredCirculars.map((circ) => (
                <tr key={circ.id} style={{ borderBottom: "1px solid var(--glass-border)" }} className="table-row-hover">
                  <td style={{ padding: "1rem", color: "var(--text-primary)", fontSize: "0.875rem" }}>
                    {new Date(circ.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <button 
                      style={{ background: "none", border: "none", padding: 0, textAlign: "left", color: "var(--accent-primary)", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer" }}
                      onClick={() => { setSelectedCircular(circ); setShowDetailModal(true); }}
                    >
                      {circ.title}
                    </button>
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {getAudienceLabel(circ)}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {circ.attachment_url ? (
                      <a 
                        href={circ.attachment_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--success-color, #10b981)", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}
                      >
                        <FileText size={16} /> PDF Notice
                      </a>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No file</span>
                    )}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right" }}>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: "0.25rem", color: "#ef4444" }} 
                      onClick={() => handleDelete(circ.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }} onClick={() => { setShowCreateModal(false); setSelectedFile(null); }}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.75rem", marginBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)" }}>Publish New Circular</h3>
              <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => { setShowCreateModal(false); setSelectedFile(null); }}>
                <X size={20} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>Circular Title</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  required
                  placeholder="e.g. Summer Vacation Notice" 
                  style={{ width: "100%" }}
                  value={newCircular.title}
                  onChange={(e) => setNewCircular({ ...newCircular, title: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>Circular Content Details</label>
                <textarea 
                  className="input-glass" 
                  required
                  rows="4"
                  placeholder="Provide all notice details here..." 
                  style={{ width: "100%" }}
                  value={newCircular.content}
                  onChange={(e) => setNewCircular({ ...newCircular, content: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>Target Audience</label>
                <select 
                  className="input-glass" 
                  style={{ width: "100%" }}
                  value={newCircular.target_audience}
                  onChange={(e) => setNewCircular({ ...newCircular, target_audience: e.target.value })}
                >
                  <option value="all">All Students & Teachers</option>
                  <option value="teachers">Teachers Only</option>
                  <option value="class">Specific Class Only</option>
                </select>
              </div>

              {newCircular.target_audience === "class" && (
                <div>
                  <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>Select Class</label>
                  <select 
                    className="input-glass" 
                    required
                    style={{ width: "100%" }}
                    value={newCircular.class_id}
                    onChange={(e) => setNewCircular({ ...newCircular, class_id: e.target.value })}
                  >
                    <option value="">-- Choose Class --</option>
                    {[...classes].sort((a, b) => `${a.name}-${a.section}`.localeCompare(`${b.name}-${b.section}`)).map(c => (
                      <option key={c.id} value={c.id}>{c.name}-{c.section}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>Attach PDF Document (Optional)</label>
                <input 
                  type="file" 
                  accept="application/pdf"
                  className="input-glass" 
                  style={{ width: "100%", padding: "0.5rem" }}
                  onChange={handleFileChange}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.4rem", display: "block" }}>
                  Files will be uploaded to CDN (cdn.thearcschool.in)
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowCreateModal(false); setSelectedFile(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading || uploadingFile}>
                  {loading || uploadingFile ? "Publishing..." : "Publish & Notify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {showDetailModal && selectedCircular && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }} onClick={() => setShowDetailModal(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "600px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.75rem", marginBottom: "0.5rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--accent-primary)", fontWeight: "800" }}>
                  Circular Notice ({getAudienceLabel(selectedCircular)})
                </span>
                <h3 style={{ fontSize: "1.35rem", fontWeight: "800", marginTop: "0.25rem", color: "var(--text-primary)" }}>{selectedCircular.title}</h3>
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setShowDetailModal(false)}>
                <X size={20} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>

            <div style={{ padding: "1rem 0", color: "var(--text-primary)", fontSize: "0.95rem", lineHeight: "1.6", whiteSpace: "pre-line" }}>
              {selectedCircular.content}
            </div>

            <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Published on: {new Date(selectedCircular.created_at).toLocaleString()}
              </span>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {selectedCircular.attachment_url && (
                  <a 
                    href={selectedCircular.attachment_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-success" 
                    style={{ display: "flex", alignItems: "center", gap: "0.25rem", textDecoration: "none", fontSize: "0.85rem", color: "#fff", backgroundColor: "#10b981" }}
                  >
                    <Download size={15} /> View Attachment
                  </a>
                )}
                <button className="btn btn-ghost" onClick={() => setShowDetailModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Circulars;
