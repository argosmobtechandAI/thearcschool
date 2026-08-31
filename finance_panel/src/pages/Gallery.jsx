import React, { useState, useEffect } from 'react';
import { Film, Eye, Video } from 'lucide-react';
import api from '../services/api';

const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const Gallery = () => {
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

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

  const previewYtId = previewItem ? getYoutubeId(previewItem.media_url) : null;

  return (
    <div className="animate-fade-in" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>

      {loading ? (
        <p>Loading media gallery...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : galleryItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <Film size={48} style={{ margin: "0 auto 1rem", opacity: 0.4 }} />
          <h3>No Media Available</h3>
          <p>No photos or videos have been published yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {galleryItems.map(item => {
            const ytId = getYoutubeId(item.media_url);
            return (
              <div key={item.id} className="glass-panel" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Media Thumbnail */}
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

                {/* Descriptions */}
                <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary)" }}>{item.title}</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: "1.4", flex: 1 }}>{item.description || "No description provided."}</p>
                  <button 
                    onClick={() => setPreviewItem(item)}
                    className="btn btn-ghost" 
                    style={{ width: "100%", color: "var(--primary-color)", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem", borderRadius: 0 }}
                  >
                    <Eye size={16} /> View Media
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Media Preview Modal */}
      {previewItem && (
        <div 
          className="animate-fade-in" 
          onClick={() => setPreviewItem(null)} 
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "1rem" }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ width: "100%", maxWidth: "780px", padding: 0, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: "16px", backgroundColor: "#0f172a", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", position: "relative" }}
          >
            <button 
              onClick={() => setPreviewItem(null)}
              style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10, background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}
            >
              <X size={18} />
            </button>

            <div style={{ width: "100%", maxHeight: "420px", backgroundColor: "#000", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {previewItem.media_type === 'video' ? (
                previewYtId ? (
                  <iframe 
                    src={`https://www.youtube.com/embed/${previewYtId}?autoplay=1`} 
                    style={{ width: "100%", height: "420px", border: "none" }} 
                    allow="autoplay; encrypted-media" 
                    allowFullScreen 
                  />
                ) : (
                  <video src={previewItem.media_url} controls autoPlay style={{ width: "100%", maxHeight: "420px" }} />
                )
              ) : (
                <img src={previewItem.media_url} alt={previewItem.title} style={{ width: "100%", maxHeight: "420px", objectFit: "contain" }} />
              )}
            </div>
            <div style={{ padding: "1.25rem 1.5rem", backgroundColor: "rgba(15, 23, 42, 0.95)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#fff", marginBottom: "0.25rem" }}>{previewItem.title}</h2>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>{previewItem.description || "No description provided."}</p>
              </div>
              <button onClick={() => setPreviewItem(null)} className="btn btn-ghost" style={{ color: "#fff", border: "1px solid rgba(255,255,255,0.2)", padding: "0.4rem 1rem", fontSize: "0.8rem", flexShrink: 0 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
