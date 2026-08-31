import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import { useSortableData } from "../hooks/useSortableData";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import api from "../services/api";
import { toast } from "react-toastify";
import { 
  Bus, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  IndianRupee, 
  Calendar, 
  CheckCircle2, 
  X, 
  TrendingUp, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  RotateCcw, 
  Filter
} from "lucide-react";

const TransportManagement = () => {
  const dispatch = useDispatch();
  const { users, classes, loadingUsers, loadingClasses } = useSelector((state) => state.data);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("");
  const [transportStatusFilter, setTransportStatusFilter] = useState("all"); // 'all', 'enrolled', 'not_enrolled'
  const [feeRangeFilter, setFeeRangeFilter] = useState("all"); // 'all', '1-500', '501-1000', '1001-1500', '1500+'

  // Modal State for Assigning / Editing Transport
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [modalForm, setModalForm] = useState({
    studentId: "",
    bus_fee: "",
    bus_start_date: new Date().toISOString().split("T")[0]
  });
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchClasses());
  }, [dispatch]);

  const students = useMemo(() => users.filter(u => u.type === "student"), [users]);

  const processedData = useMemo(() => {
    return students.map(s => {
      let className = "N/A";
      let baseClassName = "N/A";
      let section = "";
      if (s.classes && s.classes.length > 0) {
        const cls = classes.find(c => String(c.id) === String(s.classes[0]));
        if (cls) {
          className = `${cls.name} ${cls.section || ''}`.trim();
          baseClassName = cls.name;
          section = cls.section || "";
        }
      }
      const busFeeNum = Number(s.bus_fee || 0);
      const isEnrolled = busFeeNum > 0;

      return {
        ...s,
        className,
        baseClassName,
        section,
        busFeeNum,
        isEnrolled,
        bus_start_date_formatted: s.bus_start_date ? new Date(s.bus_start_date).toLocaleDateString() : "N/A"
      };
    });
  }, [students, classes]);

  // Unique Classes and Sections for Filters
  const uniqueClassNames = useMemo(() => {
    const names = classes.map(c => c.name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [classes]);

  const uniqueSections = useMemo(() => {
    const sections = classes
      .filter(c => !selectedClassFilter || c.name === selectedClassFilter)
      .map(c => c.section)
      .filter(Boolean);
    return [...new Set(sections)].sort();
  }, [classes, selectedClassFilter]);

  // Transport Overview KPI Metrics
  const enrolledStudents = useMemo(() => processedData.filter(s => s.isEnrolled), [processedData]);
  const totalBusStudents = enrolledStudents.length;
  const totalMonthlyTransportInflow = useMemo(() => enrolledStudents.reduce((sum, s) => sum + s.busFeeNum, 0), [enrolledStudents]);
  const nonTransportStudents = processedData.length - totalBusStudents;
  const avgBusFee = totalBusStudents > 0 ? Math.round(totalMonthlyTransportInflow / totalBusStudents) : 0;

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedClassFilter) count++;
    if (selectedSectionFilter) count++;
    if (transportStatusFilter !== "all") count++;
    if (feeRangeFilter !== "all") count++;
    return count;
  }, [searchTerm, selectedClassFilter, selectedSectionFilter, transportStatusFilter, feeRangeFilter]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedClassFilter("");
    setSelectedSectionFilter("");
    setTransportStatusFilter("all");
    setFeeRangeFilter("all");
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return processedData.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (item.name?.toLowerCase() || "").includes(q) || 
        (item.admission_number?.toLowerCase() || "").includes(q) ||
        (item.phone?.toLowerCase() || "").includes(q) ||
        (item.className?.toLowerCase() || "").includes(q);

      const matchesClass = !selectedClassFilter || item.baseClassName === selectedClassFilter;
      const matchesSection = !selectedSectionFilter || item.section === selectedSectionFilter;
      
      let matchesStatus = true;
      if (transportStatusFilter === "enrolled") matchesStatus = item.isEnrolled;
      else if (transportStatusFilter === "not_enrolled") matchesStatus = !item.isEnrolled;

      let matchesFeeRange = true;
      if (feeRangeFilter === "1-500") matchesFeeRange = item.busFeeNum > 0 && item.busFeeNum <= 500;
      else if (feeRangeFilter === "501-1000") matchesFeeRange = item.busFeeNum > 500 && item.busFeeNum <= 1000;
      else if (feeRangeFilter === "1001-1500") matchesFeeRange = item.busFeeNum > 1000 && item.busFeeNum <= 1500;
      else if (feeRangeFilter === "1500+") matchesFeeRange = item.busFeeNum > 1500;

      return matchesSearch && matchesClass && matchesSection && matchesStatus && matchesFeeRange;
    });
  }, [processedData, searchTerm, selectedClassFilter, selectedSectionFilter, transportStatusFilter, feeRangeFilter]);

  const { items: sortedData, requestSort, sortConfig } = useSortableData(filteredData);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE) || 1;

  // Open modal to assign/edit transport
  const handleOpenAssignModal = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setModalForm({
        studentId: student.id,
        bus_fee: student.bus_fee || "",
        bus_start_date: student.bus_start_date ? new Date(student.bus_start_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
      });
      setStudentSearchQuery(student.name);
    } else {
      setEditingStudent(null);
      setModalForm({
        studentId: "",
        bus_fee: "",
        bus_start_date: new Date().toISOString().split("T")[0]
      });
      setStudentSearchQuery("");
    }
    setIsModalOpen(true);
  };

  const handleSaveTransport = async (e) => {
    e.preventDefault();
    if (!modalForm.studentId) {
      toast.error("Please select a student");
      return;
    }
    if (modalForm.bus_fee === "" || isNaN(modalForm.bus_fee) || Number(modalForm.bus_fee) < 0) {
      toast.error("Please enter a valid monthly bus fee amount");
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/finance_panel/student/${modalForm.studentId}/busFee`, {
        bus_fee: Number(modalForm.bus_fee),
        bus_start_date: modalForm.bus_start_date || null
      });

      toast.success(Number(modalForm.bus_fee) > 0 ? "Bus transport facility assigned successfully" : "Transport facility removed successfully");
      setIsModalOpen(false);
      dispatch(fetchUsers());
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update transport facility");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeassignTransport = async (student) => {
    if (window.confirm(`Are you sure you want to remove the bus transport facility for ${student.name}? This will stop future monthly transport fee billing.`)) {
      try {
        await api.put(`/finance_panel/student/${student.id}/busFee`, {
          bus_fee: 0,
          bus_start_date: null
        });
        toast.success(`Transport facility removed for ${student.name}`);
        dispatch(fetchUsers());
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to remove transport facility");
      }
    }
  };

  const handleExport = (type) => {
    const dataToExport = filteredData.map((item, index) => ({
      "S.No": index + 1,
      "Student Name": item.name,
      "Admission No": item.admission_number || "N/A",
      "Class": item.className,
      "Monthly Bus Fee (₹)": item.bus_fee || 0,
      "Transport Start Date": item.bus_start_date_formatted,
      "Status": item.isEnrolled ? "Enrolled" : "Not Enrolled",
      "Phone": item.phone || "N/A"
    }));

    if (type === "excel") {
      exportToExcel(dataToExport, "Bus_Transport_Master_Report");
    } else if (type === "pdf") {
      const headers = ["S.No", "Student Name", "Adm No", "Class", "Bus Fee (₹)", "Start Date", "Status"];
      const rows = dataToExport.map(d => [
        d["S.No"], d["Student Name"], d["Admission No"], d["Class"], `₹${d["Monthly Bus Fee (₹)"]}`, d["Transport Start Date"], d["Status"]
      ]);
      exportToPDF(headers, rows, "Bus Transport Master Report", "Bus_Transport_Master_Report");
    }
  };

  // Student search filtered list for modal
  const eligibleStudentsForModal = useMemo(() => {
    if (!studentSearchQuery) return students.slice(0, 10);
    const query = studentSearchQuery.toLowerCase();
    return students.filter(s => 
      (s.name?.toLowerCase() || "").includes(query) || 
      (s.admission_number?.toLowerCase() || "").includes(query)
    ).slice(0, 15);
  }, [students, studentSearchQuery]);

  return (
    <div className="animate-fade-in" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* 4 Transport KPI Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
        <div className="glass-card" style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: "rgba(124, 58, 237, 0.15)", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Bus size={20} strokeWidth={2.4} />
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Bus Transport Students</p>
            <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>{totalBusStudents}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: "rgba(16, 185, 129, 0.15)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IndianRupee size={20} strokeWidth={2.4} />
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Monthly Transport Inflow</p>
            <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>₹{totalMonthlyTransportInflow.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: "rgba(59, 130, 246, 0.15)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp size={20} strokeWidth={2.4} />
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Avg. Bus Fee / Student</p>
            <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>₹{avgBusFee.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: "rgba(100, 116, 139, 0.15)", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users size={20} strokeWidth={2.4} />
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Non-Transport Students</p>
            <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>{nonTransportStudents}</h3>
          </div>
        </div>
      </div>

      {/* Main Table & Filter Card */}
      <div className="glass-panel" style={{ padding: "1.15rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        
        {/* Action Bar with Status Tabs & Enroll Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.35rem", background: "var(--glass-bg)", padding: "0.25rem", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
            <button 
              onClick={() => { setTransportStatusFilter("all"); setCurrentPage(1); }} 
              className={`btn ${transportStatusFilter === "all" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem", fontWeight: "700" }}
            >
              All Students ({processedData.length})
            </button>
            <button 
              onClick={() => { setTransportStatusFilter("enrolled"); setCurrentPage(1); }} 
              className={`btn ${transportStatusFilter === "enrolled" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem", fontWeight: "700" }}
            >
              Enrolled ({totalBusStudents})
            </button>
            <button 
              onClick={() => { setTransportStatusFilter("not_enrolled"); setCurrentPage(1); }} 
              className={`btn ${transportStatusFilter === "not_enrolled" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem", fontWeight: "700" }}
            >
              Not Enrolled ({nonTransportStudents})
            </button>
          </div>

          <button 
            onClick={() => handleOpenAssignModal()}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.15rem", fontSize: "0.85rem", fontWeight: "700", background: "#7c3aed", borderColor: "#7c3aed", color: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(124, 58, 237, 0.25)" }}
          >
            <Plus size={16} strokeWidth={2.5} /> Enroll Student Transport
          </button>
        </div>

        {/* Sophisticated Filter Bar */}
        <div style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          alignItems: "center", 
          gap: "0.65rem", 
          padding: "0.75rem 0.9rem", 
          background: "rgba(255, 255, 255, 0.6)", 
          border: "1px solid var(--glass-border)", 
          borderRadius: "10px" 
        }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "220px", flex: "1 1 220px" }}>
            <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              type="text"
              className="input-glass"
              style={{ paddingLeft: "2.2rem", paddingRight: searchTerm ? "2rem" : "0.75rem", height: "34px", fontSize: "0.82rem", margin: 0, width: "100%", background: "#fff" }}
              placeholder="Search by student name, adm no, phone..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Class Filter */}
          <div style={{ minWidth: "130px", flex: "0 1 auto" }}>
            <select
              className="input-glass"
              style={{ height: "34px", fontSize: "0.82rem", margin: 0, width: "100%", background: "#fff", cursor: "pointer", fontWeight: "600" }}
              value={selectedClassFilter}
              onChange={(e) => { setSelectedClassFilter(e.target.value); setSelectedSectionFilter(""); setCurrentPage(1); }}
            >
              <option value="">All Classes</option>
              {uniqueClassNames.map(name => (
                <option key={name} value={name}>Class {name}</option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div style={{ minWidth: "120px", flex: "0 1 auto" }}>
            <select
              className="input-glass"
              style={{ height: "34px", fontSize: "0.82rem", margin: 0, width: "100%", background: "#fff", cursor: "pointer", fontWeight: "600" }}
              value={selectedSectionFilter}
              onChange={(e) => { setSelectedSectionFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Sections</option>
              {uniqueSections.map(sec => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>

          {/* Fee Range Filter */}
          <div style={{ minWidth: "140px", flex: "0 1 auto" }}>
            <select
              className="input-glass"
              style={{ height: "34px", fontSize: "0.82rem", margin: 0, width: "100%", background: "#fff", cursor: "pointer", fontWeight: "600" }}
              value={feeRangeFilter}
              onChange={(e) => { setFeeRangeFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Fee Ranges</option>
              <option value="1-500">₹1 – ₹500 / mo</option>
              <option value="501-1000">₹501 – ₹1,000 / mo</option>
              <option value="1001-1500">₹1,001 – ₹1,500 / mo</option>
              <option value="1500+">Above ₹1,500 / mo</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="btn btn-ghost"
              style={{ height: "34px", padding: "0 0.75rem", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.35rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.08)" }}
              title="Reset all filters"
            >
              <RotateCcw size={13} /> Reset ({activeFiltersCount})
            </button>
          )}

          {/* Export Actions on the Right */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <button
              onClick={() => handleExport("excel")}
              className="btn btn-ghost"
              style={{ height: "34px", padding: "0 0.75rem", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.35rem", border: "1px solid var(--glass-border)", background: "#fff" }}
              title="Export to Excel"
            >
              <FileSpreadsheet size={15} color="#16a34a" /> Excel
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="btn btn-ghost"
              style={{ height: "34px", padding: "0 0.75rem", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.35rem", border: "1px solid var(--glass-border)", background: "#fff" }}
              title="Export to PDF"
            >
              <FileText size={15} color="#dc2626" /> PDF
            </button>
          </div>
        </div>

        {/* Data Table */}
        {loadingUsers || loadingClasses ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading transport records...
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <p>No students found matching your filters.</p>
            {activeFiltersCount > 0 && (
              <button onClick={handleResetFilters} className="btn btn-ghost" style={{ fontSize: "0.8rem", color: "#6366f1" }}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "0.75rem 0.5rem", width: "40px" }}>#</th>
                  <th style={{ padding: "0.75rem 0.5rem", cursor: "pointer" }} onClick={() => requestSort("name")}>
                    Student Name {sortConfig?.key === "name" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ padding: "0.75rem 0.5rem", cursor: "pointer" }} onClick={() => requestSort("admission_number")}>
                    Adm No {sortConfig?.key === "admission_number" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ padding: "0.75rem 0.5rem", cursor: "pointer" }} onClick={() => requestSort("className")}>
                    Class & Section {sortConfig?.key === "className" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ padding: "0.75rem 0.5rem", cursor: "pointer", textAlign: "right" }} onClick={() => requestSort("busFeeNum")}>
                    Monthly Bus Fee {sortConfig?.key === "busFeeNum" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ padding: "0.75rem 0.5rem", cursor: "pointer" }} onClick={() => requestSort("bus_start_date")}>
                    Start Date {sortConfig?.key === "bus_start_date" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((student, index) => {
                  const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                  return (
                    <tr 
                      key={student.id} 
                      style={{ 
                        borderBottom: "1px solid var(--glass-border)", 
                        transition: "background 0.15s",
                        background: student.isEnrolled ? "rgba(124, 58, 237, 0.02)" : "transparent"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--glass-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = student.isEnrolled ? "rgba(124, 58, 237, 0.02)" : "transparent"}
                    >
                      <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-secondary)" }}>{globalIndex}</td>
                      
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: "600", color: "var(--text-primary)" }}>
                        {student.name}
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-secondary)" }}>
                        {student.admission_number || "—"}
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <span style={{ padding: "0.2rem 0.55rem", borderRadius: "6px", background: "rgba(59, 130, 246, 0.1)", color: "#2563eb", fontWeight: "600", fontSize: "0.75rem" }}>
                          {student.className}
                        </span>
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: "700", color: student.isEnrolled ? "#059669" : "var(--text-secondary)" }}>
                        {student.isEnrolled ? `₹${student.busFeeNum.toLocaleString()}` : "—"}
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-secondary)" }}>
                        {student.bus_start_date_formatted}
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        {student.isEnrolled ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.55rem", borderRadius: "12px", background: "rgba(16, 185, 129, 0.12)", color: "#059669", fontWeight: "700", fontSize: "0.72rem" }}>
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.55rem", borderRadius: "12px", background: "rgba(100, 116, 139, 0.12)", color: "#64748b", fontWeight: "600", fontSize: "0.72rem" }}>
                            No Facility
                          </span>
                        )}
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                          <button
                            onClick={() => handleOpenAssignModal(student)}
                            className="btn btn-ghost"
                            style={{ padding: "0.3rem 0.5rem", color: "#6366f1" }}
                            title={student.isEnrolled ? "Edit Transport Fee" : "Assign Transport Facility"}
                          >
                            <Edit2 size={14} />
                          </button>
                          {student.isEnrolled && (
                            <button
                              onClick={() => handleDeassignTransport(student)}
                              className="btn btn-ghost"
                              style={{ padding: "0.3rem 0.5rem", color: "#ef4444" }}
                              title="Remove Transport Facility"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid var(--glass-border)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            <span>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} of {sortedData.length} students</span>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="btn btn-ghost"
                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
              >
                Previous
              </button>
              <span style={{ display: "flex", alignItems: "center", padding: "0 0.5rem", fontWeight: "700" }}>{currentPage} / {totalPages}</span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="btn btn-ghost"
                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Enroll / Edit Transport */}
      {isModalOpen && (
        <div 
          className="animate-fade-in" 
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(15, 23, 42, 0.55)", 
            backdropFilter: "blur(6px)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            zIndex: 1000, 
            padding: "1rem" 
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="glass-panel modal-content" 
            style={{ 
              width: "100%", 
              maxWidth: "460px", 
              padding: "1.5rem", 
              borderRadius: "14px", 
              border: "1px solid var(--glass-border)", 
              display: "flex", 
              flexDirection: "column", 
              gap: "1.15rem", 
              background: "#ffffff",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(124, 58, 237, 0.12)", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bus size={18} strokeWidth={2.4} />
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                  {editingStudent ? `Edit Transport: ${editingStudent.name}` : "Enroll Student in Transport"}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="btn btn-ghost" 
                style={{ width: "32px", height: "32px", padding: 0, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTransport} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {!editingStudent && (
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                    Search & Select Student *
                  </label>
                  <input
                    type="text"
                    className="input-glass"
                    placeholder="Type student name or admission no..."
                    value={studentSearchQuery}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      setModalForm({ ...modalForm, studentId: "" });
                    }}
                    required
                    style={{ height: "36px", fontSize: "0.82rem", margin: 0, width: "100%" }}
                  />
                  {studentSearchQuery && !modalForm.studentId && (
                    <div style={{ maxHeight: "140px", overflowY: "auto", background: "#f8fafc", border: "1px solid var(--glass-border)", borderRadius: "8px", marginTop: "0.35rem" }}>
                      {eligibleStudentsForModal.map(s => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setModalForm({ ...modalForm, studentId: s.id, bus_fee: s.bus_fee || "" });
                            setStudentSearchQuery(`${s.name} (${s.admission_number || "No Adm"})`);
                          }}
                          style={{ padding: "0.45rem 0.75rem", cursor: "pointer", borderBottom: "1px solid var(--glass-border)", fontSize: "0.82rem" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <strong>{s.name}</strong> • Adm: {s.admission_number || "N/A"} • Bus Fee: ₹{s.bus_fee || 0}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Monthly Bus Fee (₹) *
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontWeight: "600" }}>₹</span>
                  <input
                    type="number"
                    className="input-glass"
                    style={{ paddingLeft: "1.85rem", height: "36px", fontSize: "0.84rem", margin: 0, width: "100%", fontWeight: "600" }}
                    placeholder="e.g. 1200"
                    value={modalForm.bus_fee}
                    onChange={(e) => setModalForm({ ...modalForm, bus_fee: e.target.value })}
                    required
                    min="0"
                  />
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  Set to 0 to disable transport billing for this student.
                </p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Transport Start Date *
                </label>
                <input
                  type="date"
                  className="input-glass"
                  value={modalForm.bus_start_date}
                  onChange={(e) => setModalForm({ ...modalForm, bus_start_date: e.target.value })}
                  required
                  style={{ height: "36px", fontSize: "0.84rem", margin: 0, width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem", paddingTop: "0.75rem", borderTop: "1px solid var(--glass-border)" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" disabled={submitting} style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", border: "1px solid var(--glass-border)" }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.4rem 1.25rem", fontSize: "0.8rem", fontWeight: "700", background: "#7c3aed", borderColor: "#7c3aed" }} disabled={submitting}>
                  {submitting ? "Saving..." : (editingStudent ? "Update Transport" : "Assign Transport")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportManagement;
