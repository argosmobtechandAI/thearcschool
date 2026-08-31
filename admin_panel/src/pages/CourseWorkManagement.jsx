import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Trash2, 
  Download, 
  Eye, 
  Layers, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  RefreshCw, 
  Filter, 
  LayoutGrid, 
  Table as TableIcon, 
  Calendar, 
  BookOpen, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  X, 
  ExternalLink,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { fetchClasses } from '../features/dataSlice';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const CourseWorkManagement = () => {
  const dispatch = useDispatch();
  const { classes } = useSelector((state) => state.data);
  const [coursework, setCoursework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // View mode: 'table' (default) or 'grid'
  const [viewMode, setViewMode] = useState('table');

  // Filters
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Lightbox detail modal state
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchCoursework = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/course');
      if (res.data?.success) {
        setCoursework(res.data.courses || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      toast.error(err.response?.data?.message || "Failed to fetch coursework");
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
  }, [dispatch, classes?.length]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coursework? This action cannot be undone.")) return;
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

  // Helper to get class label
  const getClassLabel = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `Class ${cls.name}-${cls.section}` : 'Unassigned';
  };

  // Quick stats calculation
  const stats = useMemo(() => {
    const total = coursework.length;
    const homeworkCount = coursework.filter(c => c.type === 'homework').length;
    const materialCount = coursework.filter(c => c.type === 'study_material').length;
    const assignmentCount = coursework.filter(c => c.type === 'assignment').length;
    return { total, homeworkCount, materialCount, assignmentCount };
  }, [coursework]);

  // Filtered & Sorted Coursework
  const filteredAndSortedItems = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();

    // 1. Filter
    const filtered = coursework.filter(item => {
      // Class filter
      if (selectedClass !== 'all' && item.class_id !== selectedClass) {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }

      // Date filter
      if (selectedDate && item.date !== selectedDate) {
        return false;
      }

      // Search text across multiple fields
      if (searchLower) {
        const clsLabel = getClassLabel(item.class_id).toLowerCase();
        const matches = 
          (item.title && item.title.toLowerCase().includes(searchLower)) ||
          (item.subject && item.subject.toLowerCase().includes(searchLower)) ||
          (item.chapter && item.chapter.toLowerCase().includes(searchLower)) ||
          (item.topics_taught && item.topics_taught.toLowerCase().includes(searchLower)) ||
          (item.homework && item.homework.toLowerCase().includes(searchLower)) ||
          (item.others && item.others.toLowerCase().includes(searchLower)) ||
          (item.description && item.description.toLowerCase().includes(searchLower)) ||
          clsLabel.includes(searchLower);

        if (!matches) return false;
      }

      return true;
    });

    // 2. Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'class') {
          aVal = getClassLabel(a.class_id);
          bVal = getClassLabel(b.class_id);
        }

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal === undefined || aVal === null) aVal = "";
        if (bVal === undefined || bVal === null) bVal = "";

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [coursework, selectedClass, selectedType, selectedDate, searchQuery, sortConfig, classes]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSortedItems.length / (pageSize === 'all' ? 1 : pageSize)) || 1;
  
  // Adjust page if out of range
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    if (pageSize === 'all') return filteredAndSortedItems;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedItems.slice(start, start + pageSize);
  }, [filteredAndSortedItems, currentPage, pageSize]);

  // Column sort request
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={13} style={{ opacity: 0.35, marginLeft: '4px' }} />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={13} style={{ color: 'var(--accent-primary)', marginLeft: '4px' }} />
    ) : (
      <ArrowDown size={13} style={{ color: 'var(--accent-primary)', marginLeft: '4px' }} />
    );
  };

  // Export handlers
  const handleExportExcel = () => {
    if (filteredAndSortedItems.length === 0) {
      toast.info("No data to export");
      return;
    }
    const exportData = filteredAndSortedItems.map(item => ({
      "Date": item.date || "N/A",
      "Day": item.day || "N/A",
      "Class": getClassLabel(item.class_id),
      "Type": item.type === 'study_material' ? 'Study Material' : (item.type === 'homework' ? 'Homework' : 'Assignment'),
      "Subject": item.subject || "N/A",
      "Title": item.title || "N/A",
      "Chapter": item.chapter || "N/A",
      "Unit": item.unit || "N/A",
      "Lesson No": item.lesson_no || "N/A",
      "Page No": item.page_number || "N/A",
      "Topics Taught": item.topics_taught || "N/A",
      "Homework Task": item.homework || "N/A",
      "Due Date": item.duedate || "N/A",
      "Notes/Others": item.others || "N/A",
      "Attachment URL": item.file_url || "None"
    }));

    exportToExcel(exportData, `Academic_Coursework_${new Date().toISOString().split('T')[0]}`, "Academic Coursework Report");
    toast.success("Excel report exported successfully!");
  };

  const handleExportPDF = () => {
    if (filteredAndSortedItems.length === 0) {
      toast.info("No data to export");
      return;
    }
    const columns = ["Date", "Class", "Type", "Subject", "Title / Chapter", "Topics / Homework", "Due Date"];
    const rows = filteredAndSortedItems.map(item => [
      `${item.date || ''} ${item.day ? `(${item.day})` : ''}`,
      getClassLabel(item.class_id),
      item.type === 'study_material' ? 'Study Material' : (item.type === 'homework' ? 'Homework' : 'Assignment'),
      item.subject || '',
      `${item.title || ''}\n${item.chapter ? `Ch: ${item.chapter}` : ''}`,
      `${item.topics_taught ? `Topic: ${item.topics_taught}` : ''}${item.homework ? `\nHW: ${item.homework}` : ''}`,
      item.duedate || '-'
    ]);

    exportToPDF(columns, rows, `Academic_Coursework_${new Date().toISOString().split('T')[0]}`, "Academic Coursework Summary");
    toast.success("PDF report exported successfully!");
  };

  const resetFilters = () => {
    setSelectedClass('all');
    setSelectedType('all');
    setSelectedDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedClass !== 'all' || selectedType !== 'all' || selectedDate !== '' || searchQuery !== '';

  const getTypeBadge = (type) => {
    switch (type) {
      case 'study_material':
        return (
          <span style={{ 
            fontSize: "0.72rem", 
            fontWeight: "700", 
            padding: "0.25rem 0.6rem", 
            borderRadius: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            color: "#059669",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}>
            <FileCheck size={12} /> Study Material
          </span>
        );
      case 'homework':
        return (
          <span style={{ 
            fontSize: "0.72rem", 
            fontWeight: "700", 
            padding: "0.25rem 0.6rem", 
            borderRadius: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            backgroundColor: "rgba(249, 115, 22, 0.12)",
            color: "#ea580c",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}>
            <Clock size={12} /> Homework
          </span>
        );
      default:
        return (
          <span style={{ 
            fontSize: "0.72rem", 
            fontWeight: "700", 
            padding: "0.25rem 0.6rem", 
            borderRadius: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            backgroundColor: "rgba(139, 92, 246, 0.12)",
            color: "#7c3aed",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}>
            <BookOpen size={12} /> Assignment
          </span>
        );
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: "100%", padding: "0 0 2rem 0", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      
      {/* Top Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Academic Coursework
            </h1>
            <span style={{ 
              background: "var(--accent-light)", 
              color: "var(--accent-primary)", 
              fontSize: "0.8rem", 
              fontWeight: "700", 
              padding: "0.2rem 0.65rem", 
              borderRadius: "20px" 
            }}>
              {coursework.length} Records
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Monitor and manage study materials, daily homework, and assignments uploaded by teachers class-wise.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          
          {/* View Mode Toggle */}
          <div style={{ 
            display: "flex", 
            backgroundColor: "var(--bg-secondary)", 
            border: "1px solid var(--glass-border)", 
            borderRadius: "8px", 
            padding: "2px" 
          }}>
            <button
              onClick={() => setViewMode('table')}
              className={`btn btn-ghost ${viewMode === 'table' ? 'active-toggle' : ''}`}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: viewMode === 'table' ? "var(--accent-light)" : "transparent",
                color: viewMode === 'table' ? "var(--accent-primary)" : "var(--text-secondary)",
                fontWeight: viewMode === 'table' ? "700" : "500"
              }}
              title="Tabular Data View"
            >
              <TableIcon size={15} /> Tabular
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`btn btn-ghost ${viewMode === 'grid' ? 'active-toggle' : ''}`}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: viewMode === 'grid' ? "var(--accent-light)" : "transparent",
                color: viewMode === 'grid' ? "var(--accent-primary)" : "var(--text-secondary)",
                fontWeight: viewMode === 'grid' ? "700" : "500"
              }}
              title="Card Grid View"
            >
              <LayoutGrid size={15} /> Cards
            </button>
          </div>

          {/* Export to Excel */}
          <button 
            onClick={handleExportExcel} 
            className="btn btn-ghost" 
            style={{ 
              backgroundColor: "var(--bg-secondary)", 
              border: "1px solid var(--glass-border)", 
              fontSize: "0.8rem",
              padding: "0.45rem 0.75rem"
            }}
            title="Export filtered data to Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} color="#16a34a" /> Excel
          </button>

          {/* Export to PDF */}
          <button 
            onClick={handleExportPDF} 
            className="btn btn-ghost" 
            style={{ 
              backgroundColor: "var(--bg-secondary)", 
              border: "1px solid var(--glass-border)", 
              fontSize: "0.8rem",
              padding: "0.45rem 0.75rem"
            }}
            title="Export filtered data to PDF (.pdf)"
          >
            <FileText size={15} color="#dc2626" /> PDF
          </button>

          {/* Refresh */}
          <button 
            onClick={fetchCoursework} 
            disabled={loading}
            className="btn btn-ghost" 
            style={{ 
              backgroundColor: "var(--bg-secondary)", 
              border: "1px solid var(--glass-border)", 
              padding: "0.45rem 0.65rem" 
            }}
            title="Reload Coursework"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Quick Summary Pill Tabs */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={() => { setSelectedType('all'); setCurrentPage(1); }}
          style={{
            border: selectedType === 'all' ? "1px solid var(--accent-primary)" : "1px solid var(--glass-border)",
            background: selectedType === 'all' ? "var(--accent-light)" : "var(--bg-secondary)",
            color: selectedType === 'all' ? "var(--accent-primary)" : "var(--text-primary)",
            padding: "0.45rem 0.9rem",
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
          <span>All Coursework</span>
          <span style={{ 
            background: selectedType === 'all' ? "var(--accent-primary)" : "#e2e8f0", 
            color: selectedType === 'all' ? "#fff" : "#475569", 
            borderRadius: "10px", 
            padding: "1px 6px", 
            fontSize: "0.72rem" 
          }}>
            {stats.total}
          </span>
        </button>

        <button
          onClick={() => { setSelectedType('homework'); setCurrentPage(1); }}
          style={{
            border: selectedType === 'homework' ? "1px solid #f97316" : "1px solid var(--glass-border)",
            background: selectedType === 'homework' ? "rgba(249, 115, 22, 0.12)" : "var(--bg-secondary)",
            color: selectedType === 'homework' ? "#ea580c" : "var(--text-primary)",
            padding: "0.45rem 0.9rem",
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
          <span>Homework</span>
          <span style={{ 
            background: selectedType === 'homework' ? "#ea580c" : "#e2e8f0", 
            color: selectedType === 'homework' ? "#fff" : "#475569", 
            borderRadius: "10px", 
            padding: "1px 6px", 
            fontSize: "0.72rem" 
          }}>
            {stats.homeworkCount}
          </span>
        </button>

        <button
          onClick={() => { setSelectedType('study_material'); setCurrentPage(1); }}
          style={{
            border: selectedType === 'study_material' ? "1px solid #10b981" : "1px solid var(--glass-border)",
            background: selectedType === 'study_material' ? "rgba(16, 185, 129, 0.12)" : "var(--bg-secondary)",
            color: selectedType === 'study_material' ? "#059669" : "var(--text-primary)",
            padding: "0.45rem 0.9rem",
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
          <span>Study Materials</span>
          <span style={{ 
            background: selectedType === 'study_material' ? "#059669" : "#e2e8f0", 
            color: selectedType === 'study_material' ? "#fff" : "#475569", 
            borderRadius: "10px", 
            padding: "1px 6px", 
            fontSize: "0.72rem" 
          }}>
            {stats.materialCount}
          </span>
        </button>

        <button
          onClick={() => { setSelectedType('assignment'); setCurrentPage(1); }}
          style={{
            border: selectedType === 'assignment' ? "1px solid #8b5cf6" : "1px solid var(--glass-border)",
            background: selectedType === 'assignment' ? "rgba(139, 92, 246, 0.12)" : "var(--bg-secondary)",
            color: selectedType === 'assignment' ? "#7c3aed" : "var(--text-primary)",
            padding: "0.45rem 0.9rem",
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
          <span>Assignments</span>
          <span style={{ 
            background: selectedType === 'assignment' ? "#7c3aed" : "#e2e8f0", 
            color: selectedType === 'assignment' ? "#fff" : "#475569", 
            borderRadius: "10px", 
            padding: "1px 6px", 
            fontSize: "0.72rem" 
          }}>
            {stats.assignmentCount}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="glass-panel" style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          
          {/* Search Input */}
          <div style={{ flex: "2 1 260px", minWidth: "240px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
              Search Coursework
            </label>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input 
                type="text"
                placeholder="Search by Title, Subject, Chapter, Topic, Notes..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="input-glass"
                style={{ paddingLeft: "2.35rem", paddingRight: searchQuery ? "2rem" : "0.75rem", width: "100%" }}
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

          {/* Class Filter */}
          <div style={{ flex: "1 1 180px", minWidth: "160px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
              Filter Class
            </label>
            <select 
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setCurrentPage(1); }}
              className="input-glass"
              style={{ width: "100%", cursor: "pointer" }}
            >
              <option value="all">All Classes ({classes.length})</option>
              {[...classes]
                .sort((a, b) => `${a.name}-${a.section}`.localeCompare(`${b.name}-${b.section}`, undefined, { numeric: true }))
                .map(c => (
                  <option key={c.id} value={c.id}>Class {c.name} - {c.section}</option>
                ))
              }
            </select>
          </div>

          {/* Type Filter */}
          <div style={{ flex: "1 1 160px", minWidth: "150px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
              Filter Type
            </label>
            <select 
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
              className="input-glass"
              style={{ width: "100%", cursor: "pointer" }}
            >
              <option value="all">All Types</option>
              <option value="homework">Homework</option>
              <option value="study_material">Study Material</option>
              <option value="assignment">Assignment</option>
            </select>
          </div>

          {/* Date Filter */}
          <div style={{ flex: "1 1 150px", minWidth: "140px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
              Filter Date
            </label>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
              className="input-glass"
              style={{ width: "100%", cursor: "pointer" }}
            />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <div style={{ flex: "0 0 auto" }}>
              <button 
                onClick={resetFilters} 
                className="btn btn-ghost" 
                style={{ 
                  color: "#ef4444", 
                  fontSize: "0.8rem", 
                  padding: "0.55rem 0.85rem",
                  border: "1px dashed #fca5a5",
                  backgroundColor: "rgba(239, 68, 68, 0.05)"
                }}
              >
                <X size={14} /> Clear Filters
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Main Content Area */}
      {loading && coursework.length === 0 ? (
        <div className="glass-panel" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <RefreshCw size={36} className="animate-spin" style={{ margin: "0 auto 1rem", color: "var(--accent-primary)" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)" }}>Loading Coursework...</h3>
          <p style={{ fontSize: "0.85rem" }}>Please wait while we retrieve the latest classwork and study materials.</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: "3rem 2rem", textAlign: "center", color: "#dc2626", border: "1px solid #fecaca" }}>
          <h3>Failed to Load Data</h3>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>{error}</p>
          <button onClick={fetchCoursework} className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Retry Now
          </button>
        </div>
      ) : filteredAndSortedItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <Layers size={48} style={{ margin: "0 auto 1rem", opacity: 0.35 }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>No Coursework Found</h3>
          <p style={{ fontSize: "0.875rem", maxWidth: "400px", margin: "0 auto 1rem" }}>
            No study materials, homework, or assignments matched your current filters or search criteria.
          </p>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="btn btn-ghost" style={{ border: "1px solid var(--glass-border)" }}>
              Reset All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* ==================== TABULAR VIEW ==================== */
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid var(--glass-border)" }}>
                  
                  {/* Date & Day */}
                  <th 
                    onClick={() => requestSort('date')}
                    style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", cursor: "pointer", whiteSpace: "nowrap", width: "130px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      Date & Day {getSortIcon('date')}
                    </div>
                  </th>

                  {/* Class */}
                  <th 
                    onClick={() => requestSort('class')}
                    style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", cursor: "pointer", whiteSpace: "nowrap", width: "110px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      Class {getSortIcon('class')}
                    </div>
                  </th>

                  {/* Type */}
                  <th 
                    onClick={() => requestSort('type')}
                    style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", cursor: "pointer", whiteSpace: "nowrap", width: "130px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      Type {getSortIcon('type')}
                    </div>
                  </th>

                  {/* Subject */}
                  <th 
                    onClick={() => requestSort('subject')}
                    style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", cursor: "pointer", whiteSpace: "nowrap", width: "120px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      Subject {getSortIcon('subject')}
                    </div>
                  </th>

                  {/* Title & Topic */}
                  <th 
                    onClick={() => requestSort('title')}
                    style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", cursor: "pointer", minWidth: "220px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      Title / Topics {getSortIcon('title')}
                    </div>
                  </th>

                  {/* Curriculum Details (Chapter, Unit, Lesson) */}
                  <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", whiteSpace: "nowrap", minWidth: "160px" }}>
                    Curriculum Context
                  </th>

                  {/* Homework & Due Date */}
                  <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", whiteSpace: "nowrap", minWidth: "140px" }}>
                    Homework / Due
                  </th>

                  {/* Attachment */}
                  <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", textAlign: "center", width: "90px" }}>
                    File
                  </th>

                  {/* Actions */}
                  <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", textAlign: "right", width: "110px" }}>
                    Actions
                  </th>

                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => {
                  const clsLabel = getClassLabel(item.class_id);
                  return (
                    <tr 
                      key={item.id} 
                      className="table-row-hover" 
                      style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.15s" }}
                    >
                      
                      {/* Date & Day */}
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                            {item.date || 'N/A'}
                          </span>
                          {item.day && (
                            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                              {item.day}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Class */}
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                        <span style={{ 
                          fontWeight: "700", 
                          fontSize: "0.78rem", 
                          color: "var(--text-primary)", 
                          background: "#f1f5f9", 
                          padding: "0.2rem 0.55rem", 
                          borderRadius: "4px",
                          border: "1px solid #e2e8f0"
                        }}>
                          {clsLabel}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                        {getTypeBadge(item.type)}
                      </td>

                      {/* Subject */}
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <span style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "0.82rem" }}>
                            {item.subject}
                          </span>
                        </div>
                      </td>

                      {/* Title & Topic */}
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <button
                            onClick={() => setSelectedItem(item)}
                            style={{ 
                              background: "none", 
                              border: "none", 
                              padding: 0, 
                              textAlign: "left", 
                              color: "var(--text-primary)", 
                              fontWeight: "700", 
                              fontSize: "0.88rem",
                              cursor: "pointer" 
                            }}
                            onMouseEnter={(e) => e.target.style.color = "var(--accent-primary)"}
                            onMouseLeave={(e) => e.target.style.color = "var(--text-primary)"}
                          >
                            {item.title}
                          </button>
                          {item.topics_taught && (
                            <span style={{ 
                              fontSize: "0.75rem", 
                              color: "var(--text-secondary)", 
                              display: "-webkit-box", 
                              WebkitLineClamp: 2, 
                              WebkitBoxOrient: "vertical", 
                              overflow: "hidden" 
                            }}>
                              <strong>Topic:</strong> {item.topics_taught}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Curriculum Context */}
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "2px" }}>
                          {item.chapter && (
                            <span><strong>Ch:</strong> {item.chapter}</span>
                          )}
                          {(item.unit || item.lesson_no) && (
                            <span>
                              {item.unit ? `Unit ${item.unit}` : ''}
                              {item.unit && item.lesson_no ? ' • ' : ''}
                              {item.lesson_no ? `Lesson ${item.lesson_no}` : ''}
                            </span>
                          )}
                          {item.page_number && (
                            <span style={{ color: "#64748b" }}>Pg: {item.page_number}</span>
                          )}
                          {!item.chapter && !item.unit && !item.lesson_no && !item.page_number && (
                            <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Homework & Due */}
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "3px" }}>
                          {item.homework ? (
                            <span style={{ 
                              color: "#ea580c", 
                              fontWeight: "600", 
                              maxWidth: "180px", 
                              display: "-webkit-box", 
                              WebkitLineClamp: 2, 
                              WebkitBoxOrient: "vertical", 
                              overflow: "hidden" 
                            }}>
                              📝 {item.homework}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No homework</span>
                          )}
                          {item.duedate && (
                            <span style={{ 
                              fontSize: "0.7rem", 
                              fontWeight: "700", 
                              color: "#b45309", 
                              background: "#fef3c7", 
                              padding: "1px 5px", 
                              borderRadius: "4px",
                              alignSelf: "flex-start" 
                            }}>
                              Due: {item.duedate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* File Attachment */}
                      <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                        {item.file_url ? (
                          <a 
                            href={item.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-ghost" 
                            style={{ 
                              display: "inline-flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              padding: "0.35rem 0.55rem", 
                              color: "var(--accent-primary)", 
                              background: "var(--accent-light)",
                              borderRadius: "6px",
                              textDecoration: "none"
                            }}
                            title="Download / View Attachment"
                          >
                            <Download size={14} />
                          </a>
                        ) : (
                          <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.35rem" }}>
                          <button 
                            onClick={() => setSelectedItem(item)} 
                            className="btn btn-ghost" 
                            style={{ 
                              padding: "0.35rem 0.55rem", 
                              fontSize: "0.75rem", 
                              display: "flex", 
                              alignItems: "center", 
                              gap: "3px",
                              color: "var(--accent-primary)",
                              background: "rgba(27, 139, 59, 0.08)",
                              borderRadius: "6px"
                            }}
                            title="View Full Details"
                          >
                            <Eye size={14} /> View
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)} 
                            className="btn btn-ghost" 
                            style={{ 
                              padding: "0.35rem 0.5rem", 
                              color: "#ef4444",
                              background: "rgba(239, 68, 68, 0.08)",
                              borderRadius: "6px"
                            }}
                            title="Delete Coursework"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer & Pagination Bar */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            flexWrap: "wrap", 
            gap: "1rem", 
            padding: "0.85rem 1.25rem", 
            background: "#f8fafc", 
            borderTop: "1px solid var(--glass-border)" 
          }}>
            
            {/* Left: Summary Count & Page Size */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <span>
                Showing <strong>{filteredAndSortedItems.length === 0 ? 0 : (currentPage - 1) * (pageSize === 'all' ? filteredAndSortedItems.length : pageSize) + 1}</strong> to <strong>{Math.min(currentPage * (pageSize === 'all' ? filteredAndSortedItems.length : pageSize), filteredAndSortedItems.length)}</strong> of <strong>{filteredAndSortedItems.length}</strong> entries
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                    setPageSize(val);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "0.2rem 0.4rem",
                    borderRadius: "4px",
                    border: "1px solid var(--glass-border)",
                    backgroundColor: "white",
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            {/* Right: Pagination Navigation */}
            {pageSize !== 'all' && totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="btn btn-ghost"
                  style={{ padding: "0.3rem 0.5rem", opacity: currentPage === 1 ? 0.4 : 1 }}
                  title="First Page"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-ghost"
                  style={{ padding: "0.3rem 0.5rem", opacity: currentPage === 1 ? 0.4 : 1 }}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", margin: "0 0.3rem" }}>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "4px",
                          border: pageNum === currentPage ? "1px solid var(--accent-primary)" : "1px solid var(--glass-border)",
                          backgroundColor: pageNum === currentPage ? "var(--accent-primary)" : "white",
                          color: pageNum === currentPage ? "white" : "var(--text-primary)",
                          fontWeight: pageNum === currentPage ? "700" : "500",
                          fontSize: "0.75rem",
                          cursor: "pointer"
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn btn-ghost"
                  style={{ padding: "0.3rem 0.5rem", opacity: currentPage === totalPages ? 0.4 : 1 }}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="btn btn-ghost"
                  style={{ padding: "0.3rem 0.5rem", opacity: currentPage === totalPages ? 0.4 : 1 }}
                  title="Last Page"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* ==================== CARD GRID VIEW ==================== */
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {paginatedItems.map(item => {
              const clsLabel = getClassLabel(item.class_id);

              return (
                <div 
                  key={item.id} 
                  className="glass-panel" 
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    padding: "1.25rem", 
                    minHeight: "270px", 
                    justifyContent: "space-between",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                >
                  <div>
                    {/* Badge & Class */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      {getTypeBadge(item.type)}
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", background: "#f1f5f9", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                        {clsLabel}
                      </span>
                    </div>

                    {/* Title & Subject */}
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600", marginBottom: "0.75rem" }}>
                      📚 Subject: <span style={{ color: "var(--text-primary)" }}>{item.subject}</span>
                    </p>
                    
                    {/* Structured Details Preview */}
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", borderTop: "1px solid var(--glass-border)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      {item.date && <span>🗓 <strong>Date:</strong> {item.date} {item.day ? `(${item.day})` : ''}</span>}
                      {item.chapter && <span>▫️ <strong>Chapter:</strong> {item.chapter}</span>}
                      {(item.unit || item.lesson_no) && <span>▫️ <strong>Unit:</strong> {item.unit || '-'} | <strong>Lesson:</strong> {item.lesson_no || '-'}</span>}
                      {item.topics_taught && <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>▫️ <strong>Topics:</strong> {item.topics_taught}</span>}
                      {item.homework && <span style={{ color: "#ea580c", textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>📝 <strong>HW:</strong> {item.homework}</span>}
                    </div>
                  </div>

                  {/* Footer Buttons */}
                  <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "0.75rem", marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                    <button 
                      onClick={() => setSelectedItem(item)} 
                      className="btn btn-ghost" 
                      style={{ 
                        flex: 1, 
                        fontSize: "0.8rem", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: "0.25rem",
                        background: "rgba(27, 139, 59, 0.08)",
                        color: "var(--accent-primary)"
                      }}
                    >
                      <Eye size={14} /> Details
                    </button>
                    {item.file_url && (
                      <a 
                        href={item.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-ghost" 
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem", color: "var(--accent-primary)", background: "var(--accent-light)" }}
                        title="Download Attachment"
                      >
                        <Download size={14} />
                      </a>
                    )}
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="btn btn-ghost" 
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.08)" }}
                      title="Delete Coursework"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid View Pagination */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="glass-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1.25rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Page {currentPage} of {totalPages} ({filteredAndSortedItems.length} items)
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-ghost"
                  style={{ border: "1px solid var(--glass-border)", padding: "0.35rem 0.75rem", fontSize: "0.8rem", opacity: currentPage === 1 ? 0.4 : 1 }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn btn-ghost"
                  style={{ border: "1px solid var(--glass-border)", padding: "0.35rem 0.75rem", fontSize: "0.8rem", opacity: currentPage === totalPages ? 0.4 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox / Details Modal */}
      {selectedItem && (
        <div 
          className="modal-backdrop" 
          onClick={() => setSelectedItem(null)} 
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
              maxWidth: "650px", 
              padding: "1.75rem", 
              position: "relative", 
              maxHeight: "90vh", 
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
          >
            
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  {getTypeBadge(selectedItem.type)}
                  <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", background: "#f1f5f9", padding: "0.2rem 0.55rem", borderRadius: "4px" }}>
                    {getClassLabel(selectedItem.class_id)}
                  </span>
                </div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1.3 }}>
                  {selectedItem.title}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="btn btn-ghost" 
                style={{ padding: "0.25rem 0.5rem", fontSize: "1rem", color: "var(--text-secondary)" }}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Grid of structured details */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
              gap: "0.75rem", 
              backgroundColor: "rgba(0,0,0,0.02)", 
              padding: "1.25rem", 
              borderRadius: "10px", 
              border: "1px solid var(--glass-border)", 
              marginBottom: "1.25rem" 
            }}>
              
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700" }}>Date & Day</span>
                <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                  🗓 {selectedItem.date || 'N/A'} {selectedItem.day ? `(${selectedItem.day})` : ''}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700" }}>Subject</span>
                <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                  📚 {selectedItem.subject || 'N/A'}
                </p>
              </div>

              {selectedItem.chapter && (
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700" }}>Chapter</span>
                  <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                    📖 {selectedItem.chapter}
                  </p>
                </div>
              )}

              {(selectedItem.unit || selectedItem.lesson_no) && (
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700" }}>Unit / Lesson</span>
                  <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                    ▫️ Unit: {selectedItem.unit || '-'} | Lesson: {selectedItem.lesson_no || '-'}
                  </p>
                </div>
              )}

              {selectedItem.page_number && (
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700" }}>Page Number</span>
                  <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                    📄 Page {selectedItem.page_number}
                  </p>
                </div>
              )}

              {selectedItem.duedate && (
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#b45309", textTransform: "uppercase", fontWeight: "700" }}>Submission Due Date</span>
                  <p style={{ fontSize: "0.9rem", fontWeight: "700", color: "#b45309", marginTop: "2px" }}>
                    ⏰ {selectedItem.duedate}
                  </p>
                </div>
              )}

            </div>

            {/* Topics Taught */}
            {selectedItem.topics_taught && (
              <div style={{ marginBottom: "1rem", background: "white", padding: "1rem", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                <h4 style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                  Topics Covered
                </h4>
                <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                  {selectedItem.topics_taught}
                </p>
              </div>
            )}

            {/* Homework Assignment */}
            {selectedItem.homework && (
              <div style={{ marginBottom: "1rem", background: "rgba(249, 115, 22, 0.05)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(249, 115, 22, 0.2)" }}>
                <h4 style={{ fontSize: "0.8rem", fontWeight: "700", color: "#ea580c", textTransform: "uppercase", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Clock size={14} /> Assigned Homework
                </h4>
                <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.5, fontWeight: "500" }}>
                  {selectedItem.homework}
                </p>
              </div>
            )}

            {/* Important Notes / Others */}
            {selectedItem.others && (
              <div style={{ marginBottom: "1rem", background: "white", padding: "1rem", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                <h4 style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                  Important Notes
                </h4>
                <p style={{ fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                  {selectedItem.others}
                </p>
              </div>
            )}

            {/* Description fallback */}
            {selectedItem.description && selectedItem.description !== selectedItem.topics_taught && (
              <div style={{ marginBottom: "1rem", background: "white", padding: "1rem", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                <h4 style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                  Additional Instructions
                </h4>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {selectedItem.description}
                </p>
              </div>
            )}

            {/* Actions Bar */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--glass-border)", paddingTop: "1.25rem", marginTop: "1rem" }}>
              <button 
                onClick={() => handleDelete(selectedItem.id)} 
                className="btn btn-ghost" 
                style={{ color: "#ef4444", fontSize: "0.85rem", background: "rgba(239, 68, 68, 0.08)", padding: "0.5rem 0.85rem" }}
              >
                <Trash2 size={16} /> Delete Coursework
              </button>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {selectedItem.file_url && (
                  <a 
                    href={selectedItem.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                  >
                    <Download size={16} /> Download File
                  </a>
                )}
                <button 
                  onClick={() => setSelectedItem(null)} 
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

    </div>
  );
};

export default CourseWorkManagement;
