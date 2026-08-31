import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Video, 
  Film, 
  Eye, 
  Link as LinkIcon, 
  Upload, 
  Search, 
  X, 
  Play, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import api, { deleteFile } from '../services/api';
import { toast } from 'react-toastify';

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

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState('all');

  // Expanded descriptions map: { [itemId]: boolean }
  const [expandedItems, setExpandedItems] = useState({});

  // Preview / Lightbox modal state
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const fetchGalleryItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/gallery');
      if (res.data?.success) {
        setGalleryItems(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      toast.error(err.response?.data?.message || "Failed to fetch gallery items");
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
      const res = await api.post('/upload/file?category=gallery', uploadForm);
      if (res.data?.success) {
        setFormData(prev => ({ ...prev, media_url: res.data.url }));
        setUploadStatus("File uploaded successfully!");
        toast.success("File uploaded successfully!");
      }
    } catch (err) {
      setUploadStatus("Upload failed. Please try again.");
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.media_url) {
      toast.warn("Please upload a file or paste a media link.");
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
      toast.success("Media added to gallery!");
      setIsModalOpen(false);
      setFormData({ title: '', description: '', media_type: 'image', media_url: '' });
      setUploadStatus(null);
      fetchGalleryItems();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this gallery item? This action cannot be undone.")) return;
    try {
      const item = galleryItems.find(i => i.id === id);
      await api.delete(`/gallery/${id}`);
      if (item?.media_url && !item.media_url.includes('youtube')) {
        try { await deleteFile(item.media_url); } catch (e) {}
      }
      toast.success("Media deleted successfully!");
      if (previewItem && previewItem.id === id) {
        setPreviewItem(null);
      }
      fetchGalleryItems();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const openNewModal = () => {
    setFormData({ title: '', description: '', media_type: 'image', media_url: '' });
    setUploadStatus(null);
    setMediaSourceMode('upload');
    setIsModalOpen(true);
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filtered gallery items
  const filteredItems = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();

    return galleryItems.filter(item => {
      // Media type filter
      const ytId = getYoutubeId(item.media_url);
      if (selectedMediaType === 'youtube' && !ytId) return false;
      if (selectedMediaType === 'video' && (item.media_type !== 'video' || ytId)) return false;
      if (selectedMediaType === 'image' && item.media_type !== 'image') return false;

      // Search filter
      if (searchLower) {
        const matchesTitle = item.title && item.title.toLowerCase().includes(searchLower);
        const matchesDesc = item.description && item.description.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [galleryItems, searchQuery, selectedMediaType]);

  const stats = useMemo(() => {
    const total = galleryItems.length;
    const youtubeCount = galleryItems.filter(i => getYoutubeId(i.media_url)).length;
    const videoCount = galleryItems.filter(i => i.media_type === 'video' && !getYoutubeId(i.media_url)).length;
    const imageCount = galleryItems.filter(i => i.media_type === 'image').length;
    return { total, youtubeCount, videoCount, imageCount };
  }, [galleryItems]);

  const DESCRIPTION_LIMIT = 110;

  return (
    <div className="animate-fade-in" style={{ width: "100%", padding: "0 0 2rem 0", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      
      {/* Top Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              School Media Gallery
            </h1>
            <span style={{ 
              background: "var(--accent-light)", 
              color: "var(--accent-primary)", 
              fontSize: "0.8rem", 
              fontWeight: "700", 
              padding: "0.2rem 0.65rem", 
              borderRadius: "20px" 
            }}>
              {galleryItems.length} Items
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Manage promotional images, event videos, YouTube highlights, and slides visible to all users.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button 
            onClick={fetchGalleryItems} 
            disabled={loading}
            className="btn btn-ghost" 
            style={{ 
              backgroundColor: "var(--bg-secondary)", 
              border: "1px solid var(--glass-border)", 
              padding: "0.5rem 0.75rem" 
            }}
            title="Refresh Gallery"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          
          <button 
            onClick={openNewModal} 
            className="btn btn-primary" 
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem" }}
          >
            <Plus size={18} /> Add Media
          </button>
        </div>
      </div>

      {/* Filter and Quick Stats Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        
        {/* Type Filter Pills */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setSelectedMediaType('all')}
            style={{
              border: selectedMediaType === 'all' ? "1px solid var(--accent-primary)" : "1px solid var(--glass-border)",
              background: selectedMediaType === 'all' ? "var(--accent-light)" : "var(--bg-secondary)",
              color: selectedMediaType === 'all' ? "var(--accent-primary)" : "var(--text-primary)",
              padding: "0.4rem 0.85rem",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <span>All Media</span>
            <span style={{ 
              background: selectedMediaType === 'all' ? "var(--accent-primary)" : "#e2e8f0", 
              color: selectedMediaType === 'all' ? "#fff" : "#475569", 
              borderRadius: "10px", 
              padding: "1px 6px", 
              fontSize: "0.72rem" 
            }}>
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => setSelectedMediaType('youtube')}
            style={{
              border: selectedMediaType === 'youtube' ? "1px solid #f59e0b" : "1px solid var(--glass-border)",
              background: selectedMediaType === 'youtube' ? "rgba(245, 158, 11, 0.12)" : "var(--bg-secondary)",
              color: selectedMediaType === 'youtube' ? "#d97706" : "var(--text-primary)",
              padding: "0.4rem 0.85rem",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <span>YouTube</span>
            <span style={{ 
              background: selectedMediaType === 'youtube' ? "#d97706" : "#e2e8f0", 
              color: selectedMediaType === 'youtube' ? "#fff" : "#475569", 
              borderRadius: "10px", 
              padding: "1px 6px", 
              fontSize: "0.72rem" 
            }}>
              {stats.youtubeCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedMediaType('video')}
            style={{
              border: selectedMediaType === 'video' ? "1px solid #ef4444" : "1px solid var(--glass-border)",
              background: selectedMediaType === 'video' ? "rgba(239, 68, 68, 0.12)" : "var(--bg-secondary)",
              color: selectedMediaType === 'video' ? "#dc2626" : "var(--text-primary)",
              padding: "0.4rem 0.85rem",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <span>Direct Videos</span>
            <span style={{ 
              background: selectedMediaType === 'video' ? "#dc2626" : "#e2e8f0", 
              color: selectedMediaType === 'video' ? "#fff" : "#475569", 
              borderRadius: "10px", 
              padding: "1px 6px", 
              fontSize: "0.72rem" 
            }}>
              {stats.videoCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedMediaType('image')}
            style={{
              border: selectedMediaType === 'image' ? "1px solid #3b82f6" : "1px solid var(--glass-border)",
              background: selectedMediaType === 'image' ? "rgba(59, 130, 246, 0.12)" : "var(--bg-secondary)",
              color: selectedMediaType === 'image' ? "#2563eb" : "var(--text-primary)",
              padding: "0.4rem 0.85rem",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <span>Photos / Banners</span>
            <span style={{ 
              background: selectedMediaType === 'image' ? "#2563eb" : "#e2e8f0", 
              color: selectedMediaType === 'image' ? "#fff" : "#475569", 
              borderRadius: "10px", 
              padding: "1px 6px", 
              fontSize: "0.72rem" 
            }}>
              {stats.imageCount}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", minWidth: "260px", flex: "0 1 340px" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input 
            type="text"
            placeholder="Search media by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-glass"
            style={{ paddingLeft: "2.35rem", paddingRight: searchQuery ? "2rem" : "0.75rem", width: "100%", margin: 0 }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          )}
        </div>

      </div>

      {/* Main Content Area */}
      {loading && galleryItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <RefreshCw size={36} className="animate-spin" style={{ margin: "0 auto 1rem", color: "var(--accent-primary)" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)" }}>Loading Gallery Media...</h3>
          <p style={{ fontSize: "0.85rem" }}>Please wait while we retrieve media records.</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: "3rem 2rem", textAlign: "center", color: "#dc2626", border: "1px solid #fecaca" }}>
          <h3>Failed to Load Gallery</h3>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>{error}</p>
          <button onClick={fetchGalleryItems} className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Retry Now
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <Film size={48} style={{ margin: "0 auto 1rem", opacity: 0.35 }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>No Media Found</h3>
          <p style={{ fontSize: "0.875rem", maxWidth: "420px", margin: "0 auto 1rem" }}>
            {searchQuery || selectedMediaType !== 'all' 
              ? "No gallery records match your current search or filter."
              : "Click 'Add Media' to upload photos, event videos, or YouTube highlights."}
          </p>
          {(searchQuery || selectedMediaType !== 'all') && (
            <button 
              onClick={() => { setSearchQuery(''); setSelectedMediaType('all'); }} 
              className="btn btn-ghost" 
              style={{ border: "1px solid var(--glass-border)" }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        /* Full-width Responsive Cards Grid */
        <div style={{ 
          display: "grid", 
          gap: "1.5rem", 
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          width: "100%"
        }}>
          {filteredItems.map(item => {
            const ytId = getYoutubeId(item.media_url);
            const isExpanded = expandedItems[item.id];
            const description = item.description || "No description provided.";
            const isLongDescription = description.length > DESCRIPTION_LIMIT;
            const displayDescription = isExpanded || !isLongDescription 
              ? description 
              : `${description.substring(0, DESCRIPTION_LIMIT).trim()}...`;

            return (
              <div 
                key={item.id} 
                className="glass-panel" 
                style={{ 
                  padding: "0", 
                  overflow: "hidden", 
                  display: "flex", 
                  flexDirection: "column", 
                  position: "relative",
                  borderRadius: "14px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease"
                }}
              >
                {/* Media Thumbnail Container with click to preview */}
                <div 
                  onClick={() => setPreviewItem(item)}
                  style={{ 
                    width: "100%", 
                    height: "190px", 
                    backgroundColor: "#0f172a", 
                    position: "relative",
                    cursor: "pointer",
                    overflow: "hidden"
                  }}
                  title="Click to preview media"
                >
                  {item.media_type === 'video' ? (
                    <div style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center", display: "flex" }}>
                      {ytId ? (
                        <img 
                          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} 
                          alt={item.title} 
                          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }} 
                        />
                      ) : (
                        <video src={item.media_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                      )}
                      
                      {/* Play Icon Badge overlay */}
                      <div style={{ 
                        position: "absolute", 
                        backgroundColor: "rgba(0,0,0,0.65)", 
                        backdropFilter: "blur(4px)",
                        borderRadius: "50%", 
                        padding: "0.75rem", 
                        display: "flex", 
                        justifyContent: "center", 
                        alignItems: "center",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                      }}>
                        <Play size={22} color="#fff" fill="#fff" style={{ marginLeft: "2px" }} />
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={item.media_url} 
                      alt={item.title} 
                      style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }} 
                    />
                  )}

                  {/* Type Tag Badge */}
                  <div style={{
                    position: "absolute",
                    top: "0.75rem",
                    left: "0.75rem",
                    backgroundColor: ytId 
                      ? "rgba(245, 158, 11, 0.95)" 
                      : item.media_type === 'video' 
                        ? "rgba(239, 68, 68, 0.95)" 
                        : "rgba(59, 130, 246, 0.95)",
                    color: ytId ? "#000" : "#fff",
                    fontSize: "0.72rem",
                    fontWeight: "800",
                    padding: "0.2rem 0.55rem",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                  }}>
                    {ytId ? "YouTube" : item.media_type}
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    {/* Title */}
                    <h3 
                      onClick={() => setPreviewItem(item)}
                      style={{ 
                        fontSize: "1.1rem", 
                        fontWeight: "700", 
                        marginBottom: "0.5rem", 
                        color: "var(--text-primary)", 
                        lineHeight: 1.35,
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => e.target.style.color = "var(--accent-primary)"}
                      onMouseLeave={(e) => e.target.style.color = "var(--text-primary)"}
                    >
                      {item.title}
                    </h3>

                    {/* Description with Read more / Read less */}
                    <div style={{ marginBottom: "1rem" }}>
                      <p style={{ 
                        fontSize: "0.85rem", 
                        color: "var(--text-secondary)", 
                        lineHeight: "1.5",
                        whiteSpace: "pre-line",
                        wordBreak: "break-word"
                      }}>
                        {displayDescription}
                      </p>
                      
                      {isLongDescription && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: "4px 0 0 0",
                            color: "var(--accent-primary)",
                            fontSize: "0.8rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "2px",
                            outline: "none"
                          }}
                        >
                          {isExpanded ? (
                            <>Show less <ChevronUp size={14} /></>
                          ) : (
                            <>Read more <ChevronDown size={14} /></>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--glass-border)", paddingTop: "0.85rem", marginTop: "auto" }}>
                    <button 
                      onClick={() => setPreviewItem(item)} 
                      className="btn btn-ghost" 
                      style={{ 
                        flex: 1, 
                        color: "var(--accent-primary)", 
                        background: "rgba(27, 139, 59, 0.08)",
                        display: "flex", 
                        justifyContent: "center", 
                        alignItems: "center", 
                        gap: "0.35rem", 
                        fontSize: "0.82rem",
                        padding: "0.45rem 0.75rem",
                        borderRadius: "6px"
                      }}
                    >
                      <Eye size={15} /> View
                    </button>
                    
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="btn btn-ghost" 
                      style={{ 
                        flex: 1, 
                        color: "#ef4444", 
                        background: "rgba(239, 68, 68, 0.08)",
                        display: "flex", 
                        justifyContent: "center", 
                        alignItems: "center", 
                        gap: "0.35rem", 
                        fontSize: "0.82rem",
                        padding: "0.45rem 0.75rem",
                        borderRadius: "6px"
                      }}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Media Preview Modal */}
      {previewItem && (
        <div 
          className="modal-backdrop" 
          onClick={() => setPreviewItem(null)} 
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: "rgba(0,0,0,0.7)", 
            backdropFilter: "blur(6px)",
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            zIndex: 1000,
            padding: "1rem"
          }}
        >
          <div 
            className="glass-panel modal-content animate-fade-in" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: "100%", 
              maxWidth: "720px", 
              padding: "1.75rem", 
              position: "relative", 
              maxHeight: "90vh", 
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.75rem" }}>
              <div>
                <span style={{
                  fontSize: "0.72rem",
                  fontWeight: "800",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                  backgroundColor: getYoutubeId(previewItem.media_url)
                    ? "rgba(245, 158, 11, 0.15)"
                    : previewItem.media_type === 'video'
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(59, 130, 246, 0.15)",
                  color: getYoutubeId(previewItem.media_url) ? "#d97706" : previewItem.media_type === 'video' ? "#dc2626" : "#2563eb"
                }}>
                  {getYoutubeId(previewItem.media_url) ? "YouTube Video" : previewItem.media_type}
                </span>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--text-primary)", marginTop: "0.35rem", lineHeight: 1.3 }}>
                  {previewItem.title}
                </h2>
              </div>
              <button 
                onClick={() => setPreviewItem(null)} 
                className="btn btn-ghost" 
                style={{ padding: "0.25rem 0.5rem", fontSize: "1rem" }}
              >
                ✕
              </button>
            </div>

            {/* Media Player / Image Area */}
            <div style={{ width: "100%", borderRadius: "10px", overflow: "hidden", backgroundColor: "#000", marginBottom: "1.25rem", maxHeight: "420px", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {(() => {
                const ytId = getYoutubeId(previewItem.media_url);
                if (ytId) {
                  return (
                    <div style={{ width: "100%", position: "relative", paddingBottom: "56.25%", height: 0 }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                        title={previewItem.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      />
                    </div>
                  );
                } else if (previewItem.media_type === 'video') {
                  return (
                    <video 
                      src={previewItem.media_url} 
                      controls 
                      autoPlay 
                      style={{ width: "100%", maxHeight: "400px", objectFit: "contain" }} 
                    />
                  );
                } else {
                  return (
                    <img 
                      src={previewItem.media_url} 
                      alt={previewItem.title} 
                      style={{ width: "100%", maxHeight: "400px", objectFit: "contain" }} 
                    />
                  );
                }
              })()}
            </div>

            {/* Full Description */}
            <div style={{ background: "rgba(0,0,0,0.02)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--glass-border)", marginBottom: "1.25rem" }}>
              <h4 style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                Description
              </h4>
              <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {previewItem.description || "No description provided."}
              </p>
            </div>

            {/* Actions Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
              <button 
                onClick={() => handleDelete(previewItem.id)} 
                className="btn btn-ghost" 
                style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.08)", fontSize: "0.85rem", padding: "0.5rem 0.85rem" }}
              >
                <Trash2 size={16} /> Delete Media
              </button>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <a 
                  href={previewItem.media_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none", fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                >
                  <ExternalLink size={15} /> Open Source Link
                </a>
                <button 
                  onClick={() => setPreviewItem(null)} 
                  className="btn btn-ghost"
                  style={{ border: "1px solid var(--glass-border)", fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add Media Modal */}
      {isModalOpen && (
        <div 
          className="modal-backdrop" 
          onClick={() => setIsModalOpen(false)}
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: "rgba(0,0,0,0.55)", 
            backdropFilter: "blur(4px)",
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            zIndex: 1000,
            padding: "1rem"
          }}
        >
          <div 
            className="glass-panel modal-content animate-fade-in" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: "100%", 
              maxWidth: "520px", 
              padding: "1.75rem", 
              position: "relative",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.75rem" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-primary)" }}>Add New Media</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="btn btn-ghost" 
                style={{ padding: "0.25rem 0.5rem", fontSize: "1rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              {/* Source Mode Toggle */}
              <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
                <button
                  type="button"
                  onClick={() => { setMediaSourceMode('upload'); setFormData(prev => ({ ...prev, media_url: '' })); }}
                  style={{ 
                    flex: 1, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: "0.5rem", 
                    border: "none", 
                    background: mediaSourceMode === 'upload' ? 'var(--accent-primary)' : 'transparent', 
                    color: mediaSourceMode === 'upload' ? '#fff' : 'var(--text-secondary)', 
                    padding: "8px", 
                    borderRadius: "6px", 
                    fontSize: "0.85rem", 
                    cursor: "pointer", 
                    fontWeight: "600",
                    transition: "all 0.2s"
                  }}
                >
                  <Upload size={16} /> Upload File
                </button>
                <button
                  type="button"
                  onClick={() => { setMediaSourceMode('link'); setFormData(prev => ({ ...prev, media_url: '' })); }}
                  style={{ 
                    flex: 1, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: "0.5rem", 
                    border: "none", 
                    background: mediaSourceMode === 'link' ? 'var(--accent-primary)' : 'transparent', 
                    color: mediaSourceMode === 'link' ? '#fff' : 'var(--text-secondary)', 
                    padding: "8px", 
                    borderRadius: "6px", 
                    fontSize: "0.85rem", 
                    cursor: "pointer", 
                    fontWeight: "600",
                    transition: "all 0.2s"
                  }}
                >
                  <LinkIcon size={16} /> YouTube / Link
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Independence Day 2026 Celebration"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-glass"
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Description
                </label>
                <textarea
                  placeholder="Write a brief overview of the event or highlights..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-glass"
                  style={{ minHeight: "85px", resize: "vertical" }}
                />
              </div>

              {mediaSourceMode === 'upload' ? (
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                    Media File (Photo / Video) *
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                      id="media-file-input"
                    />
                    <label 
                      htmlFor="media-file-input" 
                      className="btn btn-ghost" 
                      style={{ 
                        cursor: "pointer", 
                        border: "2px dashed var(--glass-border)", 
                        padding: "1.5rem", 
                        borderRadius: "10px", 
                        textAlign: "center", 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: "0.5rem", 
                        color: "var(--text-secondary)",
                        background: "rgba(0,0,0,0.01)" 
                      }}
                    >
                      {formData.media_type === 'video' ? <Video size={28} style={{ margin: "0 auto", color: "var(--accent-primary)" }} /> : <ImageIcon size={28} style={{ margin: "0 auto", color: "var(--accent-primary)" }} />}
                      <span style={{ fontWeight: "600" }}>{formData.media_url ? "File Selected (Click to change)" : "Click or Drag to Upload File"}</span>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Supports PNG, JPG, WEBP, MP4, MOV</span>
                    </label>
                    {uploadStatus && (
                      <div style={{ fontSize: "0.85rem", fontWeight: "600", color: uploadStatus.includes("successfully") ? "var(--accent-primary)" : "#f59e0b" }}>
                        {uploadStatus}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                      YouTube Link or Direct URL *
                    </label>
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
                      className="input-glass"
                      required
                    />
                  </div>

                  {!getYoutubeId(formData.media_url) && (
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                        Media Type
                      </label>
                      <select
                        value={formData.media_type}
                        onChange={(e) => setFormData({ ...formData, media_type: e.target.value })}
                        className="input-glass"
                      >
                        <option value="image">Image (Photo / Banner)</option>
                        <option value="video">Video File</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={uploadingFile}>
                  {uploadingFile ? "Uploading..." : "Save Media"}
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
