import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import api from "../services/api";
import { 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  Users, 
  Search, 
  RotateCcw, 
  Eye,
  Bus
} from "lucide-react";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { useSortableData } from "../hooks/useSortableData";
import { useNavigate } from "react-router-dom";
import StudentLedgerModal from "../components/StudentLedgerModal";

const Reports = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { users, classes: globalClasses, loadingUsers, loadingClasses } = useSelector((state) => state.data);
  const { academicYear } = useSelector((state) => state.settings);
  const { globalDateRange } = useSelector((state) => state.data);

  const [balancesMap, setBalancesMap] = useState({});
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'paid', 'partial', 'overdue', 'exempted'
  const [balanceFilter, setBalanceFilter] = useState("all"); // 'all', 'dues_only', 'zero_balance', 'high_dues'
  const [transportFilter, setTransportFilter] = useState("all"); // 'all', 'bus_only', 'no_bus'

  // Modal State for viewing ledger
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [studentLedger, setStudentLedger] = useState({ fees: [], payments: [] });
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const [selectedColumns, setSelectedColumns] = useState([
    "sno", "student_name", "admission_number", "class_name", "total_due", "total_paid", "balance", "bus_fee", "status", "actions"
  ]);

  const exportColumnsList = [
    { key: "sno", label: "S.No" },
    { key: "studentName", label: "Student Name" },
    { key: "admissionNumber", label: "Admission No" },
    { key: "className", label: "Class & Section" },
    { key: "totalDue", label: "Total Billed (₹)" },
    { key: "totalPaid", label: "Total Paid (₹)" },
    { key: "balance", label: "Balance Due (₹)" },
    { key: "busFee", label: "Monthly Bus Fee (₹)" },
    { key: "status", label: "Status" }
  ];

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchClasses());
  }, [dispatch]);

  const students = useMemo(() => users.filter(u => u.type === "student"), [users]);

  // Fetch balances for all students
  useEffect(() => {
    if (students.length > 0) {
      setLoadingBalances(true);
      api.post("/finance_panel/studentBalances", { 
        students: students.map(s => ({ 
          id: s.id, 
          type: s.type, 
          fee_exempted: s.fee_exempted, 
          classes: s.classes, 
          bus_fee: s.bus_fee, 
          admission_date: s.admission_date, 
          created_at: s.created_at 
        })),
        academic_year: academicYear,
        startDate: globalDateRange?.startDate,
        endDate: globalDateRange?.endDate
      })
      .then(res => {
        if (res.data.success) {
          const bMap = {};
          res.data.data.forEach(b => {
            bMap[b.student_id] = b;
          });
          setBalancesMap(bMap);
        }
      })
      .catch(err => {
        console.error("Failed to load fee balances in Reports", err);
      })
      .finally(() => {
        setLoadingBalances(false);
      });
    }
  }, [students, academicYear, globalDateRange]);

  // Unique classes and sections for dropdowns
  const uniqueClassNames = useMemo(() => {
    const names = (globalClasses || []).map(c => c.name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [globalClasses]);

  const uniqueSections = useMemo(() => {
    const sections = (globalClasses || [])
      .filter(c => !selectedClassFilter || c.name === selectedClassFilter)
      .map(c => c.section)
      .filter(Boolean);
    return [...new Set(sections)].sort();
  }, [globalClasses, selectedClassFilter]);

  // Enriched Student Data
  const enrichedData = useMemo(() => {
    return students.map(s => {
      let className = "N/A";
      let baseClassName = "N/A";
      let section = "";
      if (s.classes && s.classes.length > 0) {
        const cls = (globalClasses || []).find(c => String(c.id) === String(s.classes[0]));
        if (cls) {
          className = `${cls.name} ${cls.section || ''}`.trim();
          baseClassName = cls.name;
          section = cls.section || "";
        }
      }

      const b = balancesMap[s.id] || { totalDue: 0, totalPaid: 0, balance: 0 };
      const totalDue = Number(b.totalDue || 0);
      const totalPaid = Number(b.totalPaid || 0);
      const balance = Number(b.balance || 0);
      const busFee = Number(s.bus_fee || 0);

      let status = "Pending";
      if (s.fee_exempted) {
        status = "Exempted";
      } else if (totalDue > 0 && balance <= 0) {
        status = "Paid";
      } else if (totalPaid > 0 && balance > 0) {
        status = "Partial";
      } else if (balance > 0) {
        status = "Overdue";
      } else if (totalDue === 0) {
        status = "Paid";
      }

      return {
        id: s.id,
        name: s.name,
        admission_number: s.admission_number || "—",
        className,
        baseClassName,
        section,
        phone: s.phone || "—",
        totalDue,
        totalPaid,
        balance,
        busFee,
        fee_exempted: s.fee_exempted,
        status,
        rawStudent: s
      };
    });
  }, [students, globalClasses, balancesMap]);

  // Metrics summary
  const summaryMetrics = useMemo(() => {
    const totalBilled = enrichedData.reduce((sum, s) => sum + s.totalDue, 0);
    const totalCollected = enrichedData.reduce((sum, s) => sum + s.totalPaid, 0);
    const totalBalance = enrichedData.reduce((sum, s) => sum + s.balance, 0);
    const defaultersCount = enrichedData.filter(s => s.balance > 0).length;
    const paidCount = enrichedData.filter(s => s.status === "Paid").length;
    const partialCount = enrichedData.filter(s => s.status === "Partial").length;
    const overdueCount = enrichedData.filter(s => s.status === "Overdue").length;
    const exemptedCount = enrichedData.filter(s => s.fee_exempted).length;

    return {
      totalBilled,
      totalCollected,
      totalBalance,
      defaultersCount,
      paidCount,
      partialCount,
      overdueCount,
      exemptedCount
    };
  }, [enrichedData]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedClassFilter) count++;
    if (selectedSectionFilter) count++;
    if (statusFilter !== "all") count++;
    if (balanceFilter !== "all") count++;
    if (transportFilter !== "all") count++;
    return count;
  }, [searchTerm, selectedClassFilter, selectedSectionFilter, statusFilter, balanceFilter, transportFilter]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedClassFilter("");
    setSelectedSectionFilter("");
    setStatusFilter("all");
    setBalanceFilter("all");
    setTransportFilter("all");
    setCurrentPage(1);
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return enrichedData.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        (item.name?.toLowerCase() || "").includes(q) || 
        (item.admission_number?.toLowerCase() || "").includes(q) ||
        (item.phone?.toLowerCase() || "").includes(q) ||
        (item.className?.toLowerCase() || "").includes(q);

      const matchClass = !selectedClassFilter || item.baseClassName === selectedClassFilter;
      const matchSection = !selectedSectionFilter || item.section === selectedSectionFilter;

      let matchStatus = true;
      if (statusFilter === "paid") matchStatus = item.status === "Paid";
      else if (statusFilter === "partial") matchStatus = item.status === "Partial";
      else if (statusFilter === "overdue") matchStatus = item.status === "Overdue" || item.balance > 0;
      else if (statusFilter === "exempted") matchStatus = item.fee_exempted;

      let matchBalance = true;
      if (balanceFilter === "dues_only") matchBalance = item.balance > 0;
      else if (balanceFilter === "zero_balance") matchBalance = item.balance <= 0;
      else if (balanceFilter === "high_dues") matchBalance = item.balance >= 10000;

      let matchTransport = true;
      if (transportFilter === "bus_only") matchTransport = item.busFee > 0;
      else if (transportFilter === "no_bus") matchTransport = item.busFee === 0;

      return matchSearch && matchClass && matchSection && matchStatus && matchBalance && matchTransport;
    });
  }, [enrichedData, searchTerm, selectedClassFilter, selectedSectionFilter, statusFilter, balanceFilter, transportFilter]);

  const { items: sortedData, requestSort, sortConfig } = useSortableData(filteredData);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE) || 1;

  // Handle open student ledger modal
  const handleOpenLedger = async (student) => {
    setSelectedStudent(student.rawStudent);
    setIsLedgerModalOpen(true);
    setLedgerLoading(true);
    try {
      const res = await api.get(`/finance_panel/getStudentLedger/${student.id}?academic_year=${academicYear}`);
      if (res.data.success) {
        setStudentLedger(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load student ledger", err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filteredData.map((item, index) => ({
      "S.No": index + 1,
      "Student Name": item.name,
      "Admission No": item.admission_number,
      "Class": item.className,
      "Total Billed (₹)": item.totalDue,
      "Total Paid (₹)": item.totalPaid,
      "Balance Due (₹)": item.balance,
      "Monthly Bus Fee (₹)": item.busFee,
      "Status": item.status,
      "Phone": item.phone
    }));
    exportToExcel(dataToExport, `Fee_Reports_${academicYear || "Consolidated"}`);
  };

  const handleExportPDF = () => {
    const headers = ["S.No", "Student Name", "Adm No", "Class", "Total Billed", "Total Paid", "Balance Due", "Status"];
    const rows = filteredData.map((item, index) => [
      index + 1,
      item.name,
      item.admission_number,
      item.className,
      `₹${item.totalDue.toLocaleString()}`,
      `₹${item.totalPaid.toLocaleString()}`,
      `₹${item.balance.toLocaleString()}`,
      item.status
    ]);
    exportToPDF(headers, rows, `Fee Collections & Dues Report (${academicYear})`, `Fee_Report_${academicYear}`);
  };

  const getStatusBadge = (status, balance) => {
    switch(status) {
      case "Paid":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "rgba(16, 185, 129, 0.12)", color: "#059669", padding: "0.2rem 0.55rem", borderRadius: "12px", fontSize: "0.72rem", fontWeight: "700" }}>
            <CheckCircle2 size={12} /> Fully Paid
          </span>
        );
      case "Partial":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "rgba(245, 158, 11, 0.12)", color: "#d97706", padding: "0.2rem 0.55rem", borderRadius: "12px", fontSize: "0.72rem", fontWeight: "700" }}>
            <Clock size={12} /> Partial (₹{balance.toLocaleString()} Due)
          </span>
        );
      case "Exempted":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "rgba(99, 102, 241, 0.12)", color: "#6366f1", padding: "0.2rem 0.55rem", borderRadius: "12px", fontSize: "0.72rem", fontWeight: "700" }}>
            Exempted
          </span>
        );
      case "Overdue":
      default:
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "rgba(239, 68, 68, 0.12)", color: "#dc2626", padding: "0.2rem 0.55rem", borderRadius: "12px", fontSize: "0.72rem", fontWeight: "700" }}>
            <AlertCircle size={12} /> Overdue (₹{balance.toLocaleString()})
          </span>
        );
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* 4 KPI Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
        <div className="glass-card" style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: "rgba(16, 185, 129, 0.15)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp size={20} strokeWidth={2.4} />
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Total Collected</p>
            <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>₹{summaryMetrics.totalCollected.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingDown size={20} strokeWidth={2.4} />
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Total Outstanding Dues</p>
            <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#dc2626", lineHeight: 1.2 }}>₹{summaryMetrics.totalBalance.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: "rgba(59, 130, 246, 0.15)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IndianRupee size={20} strokeWidth={2.4} />
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Total Billed Receivables</p>
            <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>₹{summaryMetrics.totalBilled.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: "rgba(245, 158, 11, 0.15)", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertCircle size={20} strokeWidth={2.4} />
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Students With Dues</p>
            <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>{summaryMetrics.defaultersCount} / {students.length}</h3>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="glass-panel" style={{ padding: "1.15rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        
        {/* Status Toggle Pills */}
        <div style={{ display: "flex", gap: "0.35rem", background: "var(--glass-bg)", padding: "0.25rem", borderRadius: "8px", border: "1px solid var(--glass-border)", width: "fit-content", flexWrap: "wrap" }}>
          <button 
            onClick={() => { setStatusFilter("all"); setCurrentPage(1); }} 
            className={`btn ${statusFilter === "all" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem", fontWeight: "700" }}
          >
            All Students ({enrichedData.length})
          </button>
          <button 
            onClick={() => { setStatusFilter("overdue"); setCurrentPage(1); }} 
            className={`btn ${statusFilter === "overdue" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem", fontWeight: "700" }}
          >
            With Dues ({summaryMetrics.defaultersCount})
          </button>
          <button 
            onClick={() => { setStatusFilter("paid"); setCurrentPage(1); }} 
            className={`btn ${statusFilter === "paid" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem", fontWeight: "700" }}
          >
            Fully Paid ({summaryMetrics.paidCount})
          </button>
          <button 
            onClick={() => { setStatusFilter("exempted"); setCurrentPage(1); }} 
            className={`btn ${statusFilter === "exempted" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem", fontWeight: "700" }}
          >
            Exempted ({summaryMetrics.exemptedCount})
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
              style={{ paddingLeft: "2.2rem", height: "34px", fontSize: "0.82rem", margin: 0, width: "100%", background: "#fff" }}
              placeholder="Search by student name, adm no, phone..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
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

          {/* Balance Filter */}
          <div style={{ minWidth: "140px", flex: "0 1 auto" }}>
            <select
              className="input-glass"
              style={{ height: "34px", fontSize: "0.82rem", margin: 0, width: "100%", background: "#fff", cursor: "pointer", fontWeight: "600" }}
              value={balanceFilter}
              onChange={(e) => { setBalanceFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Balances</option>
              <option value="dues_only">Only Outstanding Dues</option>
              <option value="zero_balance">Zero Balance (Cleared)</option>
              <option value="high_dues">High Dues (₹10,000+)</option>
            </select>
          </div>

          {/* Transport Filter */}
          <div style={{ minWidth: "130px", flex: "0 1 auto" }}>
            <select
              className="input-glass"
              style={{ height: "34px", fontSize: "0.82rem", margin: 0, width: "100%", background: "#fff", cursor: "pointer", fontWeight: "600" }}
              value={transportFilter}
              onChange={(e) => { setTransportFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Transport</option>
              <option value="bus_only">Bus Facility Active</option>
              <option value="no_bus">No Bus Conveyance</option>
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
              onClick={handleExportExcel}
              className="btn btn-ghost"
              style={{ height: "34px", padding: "0 0.75rem", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.35rem", border: "1px solid var(--glass-border)", background: "#fff" }}
              title="Export Report to Excel"
            >
              <FileSpreadsheet size={15} color="#16a34a" /> Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="btn btn-ghost"
              style={{ height: "34px", padding: "0 0.75rem", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.35rem", border: "1px solid var(--glass-border)", background: "#fff" }}
              title="Export Report to PDF"
            >
              <FileText size={15} color="#dc2626" /> PDF
            </button>
          </div>
        </div>

        {/* Data Table */}
        {loadingUsers || loadingClasses || loadingBalances ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading fee report records...
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <p>No fee records found matching your filters.</p>
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
                  <th style={{ padding: "0.75rem 0.5rem", cursor: "pointer", textAlign: "right" }} onClick={() => requestSort("totalDue")}>
                    Total Billed {sortConfig?.key === "totalDue" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ padding: "0.75rem 0.5rem", cursor: "pointer", textAlign: "right" }} onClick={() => requestSort("totalPaid")}>
                    Total Paid {sortConfig?.key === "totalPaid" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ padding: "0.75rem 0.5rem", cursor: "pointer", textAlign: "right" }} onClick={() => requestSort("balance")}>
                    Outstanding Balance {sortConfig?.key === "balance" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ padding: "0.75rem 0.5rem", cursor: "pointer", textAlign: "right" }} onClick={() => requestSort("busFee")}>
                    Bus Fee {sortConfig?.key === "busFee" && (sortConfig.direction === "asc" ? "↑" : "↓")}
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
                        background: student.balance > 0 ? "rgba(239, 68, 68, 0.015)" : "transparent"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--glass-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = student.balance > 0 ? "rgba(239, 68, 68, 0.015)" : "transparent"}
                    >
                      <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-secondary)" }}>{globalIndex}</td>
                      
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: "600", color: "var(--text-primary)" }}>
                        {student.name}
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-secondary)" }}>
                        {student.admission_number}
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <span style={{ padding: "0.2rem 0.55rem", borderRadius: "6px", background: "rgba(59, 130, 246, 0.1)", color: "#2563eb", fontWeight: "600", fontSize: "0.75rem" }}>
                          {student.className}
                        </span>
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: "600", color: "var(--text-primary)" }}>
                        ₹{student.totalDue.toLocaleString()}
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: "700", color: "#059669" }}>
                        ₹{student.totalPaid.toLocaleString()}
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: "800", color: student.balance > 0 ? "#dc2626" : "var(--text-secondary)" }}>
                        ₹{student.balance.toLocaleString()}
                      </td>

                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: student.busFee > 0 ? "#7c3aed" : "var(--text-secondary)", fontWeight: student.busFee > 0 ? "600" : "400" }}>
                        {student.busFee > 0 ? `₹${student.busFee.toLocaleString()}` : "—"}
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        {getStatusBadge(student.status, student.balance)}
                      </td>
                      
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                        <button
                          onClick={() => handleOpenLedger(student)}
                          className="btn btn-ghost"
                          style={{ padding: "0.3rem 0.5rem", color: "#6366f1" }}
                          title="View Student Ledger Breakdown"
                        >
                          <Eye size={15} />
                        </button>
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
            <span>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} of {sortedData.length} records</span>
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

      {/* Student Ledger Breakdown Modal */}
      {isLedgerModalOpen && selectedStudent && (
        <StudentLedgerModal
          isOpen={isLedgerModalOpen}
          onClose={() => setIsLedgerModalOpen(false)}
          student={selectedStudent}
          ledger={studentLedger}
          loading={ledgerLoading}
        />
      )}
    </div>
  );
};

export default Reports;
