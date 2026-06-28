import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Image as ImageIcon, Video, Film, Eye, Link as LinkIcon, Upload } from 'lucide-react';
import api from '../services/api';

const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const GalleryManagement = () => {
  const [galleryItems, setGalleryItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mediaSourceMode, setMediaSourceMode] = useState('upload'); // 'upload' or 'link'
  const [formData, setFormData] = useState({ title: '', description: '', media_type: 'image', media_url: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const fetchGalleryItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/gallery');
      if (res.data?.success) {
        setGalleryItems(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    setFormData(prev => ({ ...prev, media_type: isVideo ? 'video' : 'image' }));

    const uploadForm = new FormData();
    uploadForm.append('file', file);

    try {
      setUploadingFile(true);
      setUploadStatus("Uploading to CDN...");
      const res = await api.post('/upload/file?category=gallery', uploadForm, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success) {
        setFormData(prev => ({ ...prev, media_url: res.data.url }));
        setUploadStatus("File uploaded successfully!");
      }
    } catch (err) {
      setUploadStatus("Upload failed. Please try again.");
      alert(err.response?.data?.message || err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.media_url) {
      alert("Please upload a file or paste a media link.");
      return;
    }

    let updatedData = { ...formData };
    
    // Auto-detect YouTube links and set type to video
    const youtubeId = getYoutubeId(formData.media_url);
    if (youtubeId) {
      updatedData.media_type = 'video';
    }

    try {
      await api.post('/gallery', updatedData);
      setIsModalOpen(false);
      setFormData({ title: '', description: '', media_type: 'image', media_url: '' });
      setUploadStatus(null);
      fetchGalleryItems();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this gallery item?")) return;
    try {
      await api.delete(`/gallery/${id}`);
      fetchGalleryItems();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const openNewModal = () => {
    setFormData({ title: '', description: '', media_type: 'image', media_url: '' });
    setUploadStatus(null);
    setMediaSourceMode('upload');
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.5rem" }}>School Media Gallery</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage promotional images, event videos, YouTube highlights, and slides visible to all users.</p>
        </div>
        <button onClick={openNewModal} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={18} /> Add Media
        </button>
      </div>

      {loading ? (
        <p>Loading gallery items...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : galleryItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <Film size={48} style={{ margin: "0 auto 1rem", opacity: 0.4 }} />
          <h3>No Media Found</h3>
          <p>Click "Add Media" to upload photos and videos of school activities.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {galleryItems.map(item => {
            const ytId = getYoutubeId(item.media_url);
            return (
              <div key={item.id} className="glass-panel" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
                {/* Media Thumbnail Container */}
                <div style={{ width: "100%", height: "180px", backgroundColor: "#0f172a", position: "relative" }}>
                  {item.media_type === 'video' ? (
                    <div style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center", display: "flex" }}>
                      {ytId ? (
                        <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <video src={item.media_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                      )}
                      <div style={{ position: "absolute", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "50%", padding: "0.75rem", display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <Video size={24} color="#fff" />
                      </div>
                    </div>
                  ) : (
                    <img src={item.media_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  <div style={{
                    position: "absolute",
                    top: "0.75rem",
                    left: "0.75rem",
                    backgroundColor: ytId ? "rgba(251, 191, 36, 0.9)" : item.media_type === 'video' ? "rgba(239, 68, 68, 0.9)" : "rgba(59, 130, 246, 0.9)",
                    color: ytId ? "#000" : "#fff",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    textTransform: "uppercase"
                  }}>
                    {ytId ? "YouTube" : item.media_type}
                  </div>
                </div>

                {/* Text Description */}
                <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary)" }}>{item.title}</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: "1.4", flex: 1 }}>{item.description || "No description provided."}</p>
                  <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
                    <a href={item.media_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ flex: 1, textDecoration: "none", color: "var(--accent-primary)", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
                      <Eye size={16} /> View
                    </a>
                    <button onClick={() => handleDelete(item.id)} className="btn btn-ghost" style={{ flex: 1, color: "#ef4444", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Media Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div className="glass-panel modal-content" style={{ width: "95%", maxWidth: "500px", padding: "2rem", position: "relative" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "var(--text-primary)" }}>Add New Media</h2>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              {/* Source Mode Toggle */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", backgroundColor: "rgba(0,0,0,0.1)", padding: "4px", borderRadius: "8px" }}>
                <button
                  type="button"
                  onClick={() => { setMediaSourceMode('upload'); setFormData(prev => ({ ...prev, media_url: '' })); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", border: "none", background: mediaSourceMode === 'upload' ? 'var(--accent-primary)' : 'transparent', color: mediaSourceMode === 'upload' ? '#fff' : 'var(--text-secondary)', padding: "8px", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer", fontWeight: "600" }}
                >
                  <Upload size={16} /> Upload File
                </button>
                <button
                  type="button"
                  onClick={() => { setMediaSourceMode('link'); setFormData(prev => ({ ...prev, media_url: '' })); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", border: "none", background: mediaSourceMode === 'link' ? 'var(--accent-primary)' : 'transparent', color: mediaSourceMode === 'link' ? '#fff' : 'var(--text-secondary)', padding: "8px", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer", fontWeight: "600" }}
                >
                  <LinkIcon size={16} /> External Link / YouTube
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--glass-border)", backgroundColor: "rgba(255,255,255,0.05)", color: "var(--text-primary)" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--glass-border)", backgroundColor: "rgba(255,255,255,0.05)", color: "var(--text-primary)", minHeight: "80px", resize: "vertical" }}
                />
              </div>

              {mediaSourceMode === 'upload' ? (
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Media File (Photo/Video)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                      id="media-file-input"
                    />
                    <label htmlFor="media-file-input" className="btn btn-ghost" style={{ cursor: "pointer", border: "2px dashed var(--glass-border)", padding: "1.5rem", borderRadius: "8px", textAlign: "center", display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-secondary)" }}>
                      {formData.media_type === 'video' ? <Video size={24} style={{ margin: "0 auto" }} /> : <ImageIcon size={24} style={{ margin: "0 auto" }} />}
                      <span>{formData.media_url ? "Change Media File" : "Click to Select File"}</span>
                    </label>
                    {uploadStatus && (
                      <div style={{ fontSize: "0.85rem", fontWeight: "600", color: uploadStatus.includes("successfully") ? "var(--primary-color)" : "orange" }}>
                        {uploadStatus}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Media URL / YouTube Link</label>
                    <input
                      type="url"
                      value={formData.media_url}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isYt = getYoutubeId(val);
                        setFormData({
                          ...formData,
                          media_url: val,
                          media_type: isYt ? 'video' : formData.media_type
                        });
                      }}
                      placeholder="e.g. https://www.youtube.com/watch?v=..."
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--glass-border)", backgroundColor: "rgba(255,255,255,0.05)", color: "var(--text-primary)" }}
                      required
                    />
                  </div>

                  {!getYoutubeId(formData.media_url) && (
                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Media Type</label>
                      <select
                        value={formData.media_type}
                        onChange={(e) => setFormData({ ...formData, media_type: e.target.value })}
                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--glass-border)", backgroundColor: "rgba(255,255,255,0.05)", color: "var(--text-primary)" }}
                      >
                        <option value="image">Image (Photo / Banner)</option>
                        <option value="video">Video File</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={uploadingFile}>
                  Save Media
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryManagement;
