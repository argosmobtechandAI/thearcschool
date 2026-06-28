import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Trash2, Download, Eye, Layers } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { fetchClasses } from '../features/dataSlice';

const CourseWorkManagement = () => {
  const dispatch = useDispatch();
  const { classes } = useSelector((state) => state.data);
  const [coursework, setCoursework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null); // Lightbox detail state

  const fetchCoursework = async () => {
    try {
      setLoading(true);
      const res = await api.get('/course');
      if (res.data?.success) {
        setCoursework(res.data.courses || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      if (active) {
        fetchCoursework();
      }
    };
    load();
    if (!classes || classes.length === 0) {
      dispatch(fetchClasses());
    }
    return () => {
      active = false;
    };
  }, [dispatch, classes]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coursework? This cannot be undone.")) return;
    try {
      const res = await api.delete(`/course/${id}`);
      if (res.data?.success) {
        toast.success("Coursework deleted successfully!");
        fetchCoursework();
        if (selectedItem && selectedItem.id === id) {
          setSelectedItem(null);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Filtered Coursework
  const filteredItems = useMemo(() => {
    return coursework.filter(item => {
      // Class filter
      const matchesClass = selectedClass === 'all' || item.class_id === selectedClass;
      // Type filter
      const matchesType = selectedType === 'all' || item.type === selectedType;
      // Search text
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        (item.title && item.title.toLowerCase().includes(searchLower)) ||
        (item.subject && item.subject.toLowerCase().includes(searchLower)) ||
        (item.chapter && item.chapter.toLowerCase().includes(searchLower)) ||
        (item.topics_taught && item.topics_taught.toLowerCase().includes(searchLower));

      return matchesClass && matchesType && matchesSearch;
    });
  }, [coursework, selectedClass, selectedType, searchQuery]);

  return (
    <div className="animate-fade-in" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.5rem" }}>Academic Coursework</h1>
          <p style={{ color: "var(--text-secondary)" }}>Monitor study materials, homework, and classwork uploaded by teachers class-wise.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: "1.25rem", marginBottom: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        
        {/* Class Filter */}
        <div style={{ minWidth: "180px", flex: 1 }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>Filter Class</label>
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--glass-border)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }}
          >
            <option value="all">All Classes</option>
            {[...classes]
              .sort((a, b) => `${a.name}-${a.section}`.localeCompare(`${b.name}-${b.section}`))
              .map(c => (
                <option key={c.id} value={c.id}>Class {c.name} - {c.section}</option>
              ))
            }
          </select>
        </div>

        {/* Type Filter */}
        <div style={{ minWidth: "180px", flex: 1 }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>Filter Type</label>
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--glass-border)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }}
          >
            <option value="all">All Types</option>
            <option value="study_material">Study Material</option>
            <option value="homework">Homework</option>
            <option value="assignment">Assignment</option>
          </select>
        </div>

        {/* Search Input */}
        <div style={{ minWidth: "240px", flex: 2 }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>Search Coursework</label>
          <input 
            type="text"
            placeholder="Search by Title, Subject, Chapter, Topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--glass-border)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }}
          />
        </div>

      </div>

      {/* Main Content Area */}
      {loading ? (
        <p>Loading coursework...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>Error: {error}</p>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <Layers size={48} style={{ margin: "0 auto 1.5rem", opacity: 0.3 }} />
          <h3>No Coursework Found</h3>
          <p>No study materials, homework or assignments match your query.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {filteredItems.map(item => {
            const cls = classes.find(c => c.id === item.class_id);
            const isHomework = item.type === 'homework';
            const isMaterial = item.type === 'study_material';

            return (
              <div key={item.id} className="glass-panel" style={{ display: "flex", flexDirection: "column", padding: "1.25rem", minHeight: "260px", justifyContent: "space-between" }}>
                <div>
                  {/* Badge & Class */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ 
                      fontSize: "0.7rem", 
                      fontWeight: "800", 
                      padding: "0.2rem 0.5rem", 
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      backgroundColor: isMaterial ? "rgba(16, 185, 129, 0.1)" : isHomework ? "rgba(249, 115, 22, 0.1)" : "rgba(139, 92, 246, 0.1)",
                      color: isMaterial ? "#10b981" : isHomework ? "#f97316" : "#8b5cf6"
                    }}>
                      {item.type === 'study_material' ? 'Study Material' : item.type}
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)" }}>
                      Class {cls ? `${cls.name}-${cls.section}` : 'Unassigned'}
                    </span>
                  </div>

                  {/* Title & Subject */}
                  <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>{item.title}</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600", marginBottom: "0.75rem" }}>📚 Subject: {item.subject}</p>
                  
                  {/* Structured Details Preview */}
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", borderTop: "1px solid var(--glass-border)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {item.date && <span>🗓 <strong>Date:</strong> {item.date} {item.day ? `(${item.day})` : ''}</span>}
                    {item.chapter && <span>▫️ <strong>Chapter:</strong> {item.chapter}</span>}
                    {item.unit && <span>▫️ <strong>Unit:</strong> {item.unit} | <strong>Lesson:</strong> {item.lesson_no}</span>}
                    {item.topics_taught && <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>▫️ <strong>Topics:</strong> {item.topics_taught}</span>}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "0.75rem", marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => setSelectedItem(item)} className="btn btn-ghost" style={{ flex: 1.5, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
                    <Eye size={14} /> Details
                  </button>
                  {item.file_url && (
                    <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem", color: "var(--accent-primary)" }}>
                      <Download size={14} />
                    </a>
                  )}
                  <button onClick={() => handleDelete(item.id)} className="btn btn-ghost" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem", color: "#ef4444" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Details Modal */}
      {selectedItem && (
        <div className="modal-backdrop" onClick={() => setSelectedItem(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div className="glass-panel modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ width: "95%", maxWidth: "600px", padding: "2rem", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <span style={{ 
                  fontSize: "0.7rem", 
                  fontWeight: "800", 
                  padding: "0.2rem 0.5rem", 
                  borderRadius: "4px",
                  textTransform: "uppercase",
                  backgroundColor: selectedItem.type === 'study_material' ? "rgba(16, 185, 129, 0.1)" : selectedItem.type === 'homework' ? "rgba(249, 115, 22, 0.1)" : "rgba(139, 92, 246, 0.1)",
                  color: selectedItem.type === 'study_material' ? "#10b981" : selectedItem.type === 'homework' ? "#f97316" : "#8b5cf6"
                }}>
                  {selectedItem.type === 'study_material' ? 'Study Material' : selectedItem.type}
                </span>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginTop: "0.5rem", color: "var(--text-primary)" }}>{selectedItem.title}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} className="btn btn-ghost" style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}>✕</button>
            </div>

            {/* Structured details display matching client format */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", backgroundColor: "rgba(0,0,0,0.02)", padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--glass-border)", marginBottom: "1.5rem" }}>
              
              {selectedItem.date && (
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>🗓 <strong>Date:</strong> {selectedItem.date}</span>
                </div>
              )}

              {selectedItem.day && (
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>☀️ <strong>Day:</strong> {selectedItem.day}</span>
                </div>
              )}

              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>📚 <strong>Subject:</strong> {selectedItem.subject}</span>
              </div>

              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>👉 <strong>Class:</strong> Class {classes.find(c => c.id === selectedItem.class_id)?.name || ''} - {classes.find(c => c.id === selectedItem.class_id)?.section || ''}</span>
              </div>

              {selectedItem.topics_taught && (
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>▫️ <strong>Topics Taught:</strong> {selectedItem.topics_taught}</span>
                </div>
              )}

              {selectedItem.unit && (
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>▫️ <strong>Unit:</strong> {selectedItem.unit}</span>
                </div>
              )}

              {selectedItem.lesson_no && (
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>▫️ <strong>Lesson No.:</strong> {selectedItem.lesson_no}</span>
                </div>
              )}

              {selectedItem.chapter && (
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>▫️ <strong>Chapter Name:</strong> {selectedItem.chapter}</span>
                </div>
              )}

              {selectedItem.page_number && (
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>▫️ <strong>Page Number:</strong> {selectedItem.page_number}</span>
                </div>
              )}

              {selectedItem.others && (
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>▫️ <strong>Others (Important Notes):</strong> {selectedItem.others}</span>
                </div>
              )}

              {selectedItem.homework && (
                <div style={{ marginTop: "0.5rem", borderTop: "1px dashed var(--glass-border)", paddingTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>◻️ <strong>Homework:</strong> {selectedItem.homework}</span>
                </div>
              )}

              {selectedItem.duedate && (
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>◻️ <strong>Submission Date:</strong> {selectedItem.duedate}</span>
                </div>
              )}

            </div>

            {/* Description fallback */}
            {selectedItem.description && (
              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>Additional Instructions</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>{selectedItem.description}</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              {selectedItem.file_url && (
                <a 
                  href={selectedItem.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
                >
                  <Download size={16} /> Download File
                </a>
              )}
              <button 
                onClick={() => {
                  handleDelete(selectedItem.id);
                }} 
                className="btn btn-ghost" 
                style={{ color: "#ef4444" }}
              >
                Delete Coursework
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CourseWorkManagement;
