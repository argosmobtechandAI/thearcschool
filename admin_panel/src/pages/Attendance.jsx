import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import { 
  Users, 
  UserX, 
  Clock, 
  HelpCircle, 
  ChevronRight, 
  PieChart, 
  Download, 
  FileSpreadsheet, 
  FileText,
  Search, 
  Calendar, 
  RefreshCw, 
  Table as TableIcon, 
  LayoutGrid, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  X,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";
import DateRangePicker, { formatDate } from "../components/DateRangePicker";
import AttendanceMatrixTable from "../components/AttendanceMatrixTable";
import AttendanceReports from "../components/AttendanceReports";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const Attendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { users, classes, loadingUsers } = useSelector((state) => state.data);

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'matrix', 'reports'
  const [overviewViewMode, setOverviewViewMode] = useState("table"); // 'table' (default) or 'grid'
  
  // Filters for Overview tab
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [selectedClassName, setSelectedClassName] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'marked', 'pending', 'low'
  const [classSearch, setClassSearch] = useState("");

  // Matrix View state
  const [matrixClassId, setMatrixClassId] = useState("");
  const [matrixDateRange, setMatrixDateRange] = useState({
    start: formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), 
    end: formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
  });
  const [matrixAttendance, setMatrixAttendance] = useState([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [publicHolidays, setPublicHolidays] = useState([]);

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
    if (classes.length === 0) dispatch(fetchClasses());
  }, [dispatch, users.length, classes.length]);

  const fetchAttendance = async () => {
    try {
      setLoadingAttendance(true);
      const res = await api.get('/attendance', {
        params: { startDate: selectedDate, endDate: selectedDate }
      });
      if (res.data.success) {
        setAttendanceRecords(res.data.records || []);
      }
    } catch (err) {
      toast.error("Failed to load attendance records");
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  useEffect(() => {
    api.get('/admin_panel/planner').then(res => {
      const holidays = (res.data.data || []).filter(h => h.category === 'Holiday').map(h => ({ ...h, date: h.start_date }));
      setPublicHolidays(holidays);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === "matrix" && matrixClassId) {
      const fetchMatrixData = async () => {
        setLoadingMatrix(true);
        try {
          const params = { startDate: matrixDateRange.start, endDate: matrixDateRange.end };
          if (matrixClassId !== 'all') params.classId = matrixClassId;
          const res = await api.get('/attendance', { params });
          if (res.data.success) {
            setMatrixAttendance(res.data.records);
          }
        } catch (error) {
          toast.error("Failed to load matrix attendance");
        } finally {
          setLoadingMatrix(false);
        }
      };
      fetchMatrixData();
    }
  }, [activeTab, matrixClassId, matrixDateRange.start, matrixDateRange.end]);

  const gridDays = useMemo(() => {
    if (activeTab !== "matrix" || !matrixDateRange.start || !matrixDateRange.end) return [];
    const days = [];
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
    let curr = new Date(matrixDateRange.start);
    const end = new Date(matrixDateRange.end);
    let limit = 0;
    while(curr <= end && limit < 100) {
      const isWeekend = curr.getDay() === 0;
      const fullDateString = formatDate(curr);
      const isPublicHoliday = publicHolidays.some(h => h.date === fullDateString);
      days.push({
        dateNumber: curr.getDate(),
        monthName: curr.toLocaleDateString('en-US', { month: 'short' }),
        dayName: dayNames[curr.getDay()],
        fullDateString,
        isWeekend,
        isPublicHoliday
      });
      curr.setDate(curr.getDate() + 1);
      limit++;
    }
    return days;
  }, [matrixDateRange, publicHolidays, activeTab]);

  const matrixClassStudents = useMemo(() => {
    if (!matrixClassId) return [];
    const students = users.filter(u => u.type === 'student' && (matrixClassId === 'all' || (u.classes && u.classes.includes(matrixClassId))));
    return students.map(student => ({
      ...student,
      records: matrixAttendance.filter(r => r.student_id === student.id)
    })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [matrixClassId, users, matrixAttendance]);

  const stats = useMemo(() => {
    let studentTotal = 0;
    let studentPresent = 0;
    let studentAbsent = 0;
    let studentLate = 0;

    users.forEach(u => {
      if (u.type === "student") {
        studentTotal++;
        const record = attendanceRecords.find(a => a.student_id === u.id);
        if (record) {
          if (record.status === 'present') studentPresent++;
          else if (record.status === 'absent') studentAbsent++;
          else if (record.status === 'late') studentLate++;
        }
      }
    });

    const studentNotMarked = studentTotal - (studentPresent + studentAbsent + studentLate);
    const markedTotal = studentPresent + studentAbsent + studentLate;
    const presentRate = studentTotal ? Math.round((studentPresent / studentTotal) * 100) : 0;
    const absentRate = studentTotal ? Math.round((studentAbsent / studentTotal) * 100) : 0;
    const lateRate = studentTotal ? Math.round((studentLate / studentTotal) * 100) : 0;
    const notMarkedRate = studentTotal ? Math.round((studentNotMarked / studentTotal) * 100) : 0;

    return {
      presentRate,
      absentRate,
      lateRate,
      notMarkedRate,
      studentPresent,
      studentAbsent,
      studentLate,
      studentNotMarked,
      markedTotal,
      studentTotal,
    };
  }, [users, attendanceRecords]);

  // Unique base class names (e.g. "Nursery", "1", "2", etc.)
  const uniqueClassNames = useMemo(() => {
    if (!classes) return [];
    const set = new Set();
    classes.forEach(c => {
      const name = c.className || c.name;
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
  }, [classes]);

  // Available sections (filtered by selected base class or all)
  const availableSections = useMemo(() => {
    if (!classes) return [];
    const set = new Set();
    classes.forEach(c => {
      const name = c.className || c.name;
      if (selectedClassName === 'all' || name === selectedClassName) {
        if (c.section) set.add(c.section);
      }
    });
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [classes, selectedClassName]);

  // List of all class statistics
  const classStatsList = useMemo(() => {
    if (!classes || !users) return [];
    
    return classes.map(cls => {
      const classStudents = users.filter(u => u.type === 'student' && u.classes && u.classes.includes(cls.id));
      const total = classStudents.length;
      
      const recordsForClass = attendanceRecords.filter(a => classStudents.some(u => u.id === a.student_id));
      const present = recordsForClass.filter(a => a.status === 'present').length;
      const absent = recordsForClass.filter(a => a.status === 'absent').length;
      const late = recordsForClass.filter(a => a.status === 'late').length;
      const markedCount = present + absent + late;
      const isMarked = markedCount > 0;
      const percentage = total > 0 && isMarked ? Math.round((present / total) * 100) : 0;
      
      return {
        id: cls.id,
        className: cls.className || cls.name,
        section: cls.section,
        fullName: `Class ${cls.className || cls.name} - ${cls.section}`,
        total,
        present,
        absent,
        late,
        markedCount,
        isMarked,
        percentage
      };
    }).sort((a, b) => {
      const numA = parseInt(a.className, 10);
      const numB = parseInt(b.className, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        if (numA !== numB) return numA - numB;
      }
      const cmp = String(a.className).localeCompare(String(b.className));
      if (cmp !== 0) return cmp;
      return String(a.section).localeCompare(String(b.section));
    });
  }, [classes, users, attendanceRecords]);

  // Filtered classes based on class, section, search and status
  const filteredClassStats = useMemo(() => {
    const q = classSearch.toLowerCase().trim();
    return classStatsList.filter(cls => {
      // Class filter
      if (selectedClassName !== 'all' && cls.className !== selectedClassName) {
        return false;
      }

      // Section filter
      if (selectedSection !== 'all' && cls.section !== selectedSection) {
        return false;
      }

      // Status filter
      if (statusFilter === 'marked' && !cls.isMarked) return false;
      if (statusFilter === 'pending' && cls.isMarked) return false;
      if (statusFilter === 'low' && (!cls.isMarked || cls.percentage >= 70)) return false;

      // Search query
      if (q) {
        const matchesName = cls.fullName.toLowerCase().includes(q) || cls.className.toLowerCase().includes(q) || cls.section.toLowerCase().includes(q);
        if (!matchesName) return false;
      }

      return true;
    });
  }, [classStatsList, selectedClassName, selectedSection, statusFilter, classSearch]);

  // Grouped by base Class Name
  const groupedClasses = useMemo(() => {
    const groups = {};
    filteredClassStats.forEach(cls => {
      if (!groups[cls.className]) {
        groups[cls.className] = [];
      }
      groups[cls.className].push(cls);
    });
    return groups;
  }, [filteredClassStats]);

  const resetFilters = () => {
    setSelectedClassName('all');
    setSelectedSection('all');
    setStatusFilter('all');
    setClassSearch('');
  };

  const hasActiveFilters = selectedClassName !== 'all' || selectedSection !== 'all' || statusFilter !== 'all' || classSearch !== '';

  const getPercentageColor = (pct, isMarked) => {
    if (!isMarked) return "var(--text-secondary)";
    if (pct >= 85) return "#10b981";
    if (pct >= 70) return "#f59e0b";
    return "#ef4444";
  };

  const handleExportOverviewExcel = () => {
    if (filteredClassStats.length === 0) return toast.info("No data to export");
    const exportData = filteredClassStats.map(c => ({
      "Class": `Class ${c.className}`,
      "Section": c.section,
      "Total Students": c.total,
      "Present": c.present,
      "Absent": c.absent,
      "Late": c.late,
      "Attendance %": c.isMarked ? `${c.percentage}%` : 'Not Marked',
      "Status": !c.isMarked ? 'Pending' : (c.percentage >= 85 ? 'Good' : (c.percentage >= 70 ? 'Average' : 'Low'))
    }));
    exportToExcel(exportData, `Attendance_Summary_${selectedDate}`, `Attendance Summary for ${selectedDate}`);
    toast.success("Excel report exported!");
  };

  const handleExportOverviewPDF = () => {
    if (filteredClassStats.length === 0) return toast.info("No data to export");
    const columns = ["Class", "Section", "Total", "Present", "Absent", "Late", "Attendance %", "Status"];
    const rows = filteredClassStats.map(c => [
      `Class ${c.className}`,
      c.section,
      c.total,
      c.present,
      c.absent,
      c.late,
      c.isMarked ? `${c.percentage}%` : 'Not Marked',
      !c.isMarked ? 'Pending' : (c.percentage >= 85 ? 'Good' : (c.percentage >= 70 ? 'Average' : 'Low Attendance'))
    ]);
    exportToPDF(columns, rows, `Attendance_Summary_${selectedDate}`, `Attendance Summary for ${selectedDate}`);
    toast.success("PDF report exported!");
  };

  const handleExportMatrixCSV = () => {
    const exportData = matrixClassStudents.map(student => {
      const row = { 'Student Name': student.name };
      gridDays.forEach(day => {
        if (day.isWeekend) row[day.fullDateString] = 'W';
        else if (day.isPublicHoliday) row[day.fullDateString] = 'H';
        else {
          const record = student.records?.find(r => r.date === day.fullDateString);
          if (record?.status === 'present') row[day.fullDateString] = 'P';
          else if (record?.status === 'absent') row[day.fullDateString] = 'A';
          else if (record?.status === 'late') row[day.fullDateString] = 'L';
          else row[day.fullDateString] = '-';
        }
      });
      let totalDays = 0, presentDays = 0;
      gridDays.forEach(day => {
        if (!day.isWeekend && !day.isPublicHoliday) {
          totalDays++;
          if (student.records?.find(r => r.date === day.fullDateString)?.status === 'present') presentDays++;
        }
      });
      row['% Present'] = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) + '%' : '0%';
      return row;
    });
    exportToExcel(exportData, `Attendance_Matrix_${matrixDateRange.start}_to_${matrixDateRange.end}`);
  };

  const handleExportMatrixPDF = () => {
    const columns = ["Student Name", ...gridDays.map(d => d.dateNumber), "%"];
    const rows = matrixClassStudents.map(student => {
      const row = [student.name];
      gridDays.forEach(day => {
        if (day.isWeekend) row.push('W');
        else if (day.isPublicHoliday) row.push('H');
        else {
          const record = student.records?.find(r => r.date === day.fullDateString);
          if (record?.status === 'present') row.push('P');
          else if (record?.status === 'absent') row.push('A');
          else if (record?.status === 'late') row.push('L');
          else row.push('-');
        }
      });
      let totalDays = 0, presentDays = 0;
      gridDays.forEach(day => {
        if (!day.isWeekend && !day.isPublicHoliday) {
          totalDays++;
          if (student.records?.find(r => r.date === day.fullDateString)?.status === 'present') presentDays++;
        }
      });
      row.push(totalDays > 0 ? Math.round((presentDays / totalDays) * 100) + '%' : '0%');
      return row;
    });
    exportToPDF(columns, rows, `Attendance_Matrix_${matrixDateRange.start}_to_${matrixDateRange.end}`, `Attendance Matrix (${matrixDateRange.start} to ${matrixDateRange.end})`);
  };

  return (
    <div className="animate-fade-in" style={{ width: "100%", padding: "0 0 2rem 0", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      
      {/* Top Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Student Attendance Dashboard
            </h1>
            <span style={{ 
              background: "var(--accent-light)", 
              color: "var(--accent-primary)", 
              fontSize: "0.8rem", 
              fontWeight: "700", 
              padding: "0.2rem 0.65rem", 
              borderRadius: "20px" 
            }}>
              {classes.length} Classes ({stats.studentTotal} Students)
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            {activeTab === "overview" 
              ? `Real-time snapshot & class-wise attendance for ${selectedDate}` 
              : activeTab === "matrix" 
                ? "Detailed student attendance matrix across dates" 
                : "Comprehensive analytical reports & attendance trends"}
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", background: "var(--bg-secondary)", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "3px" }}>
            <button 
              onClick={() => setActiveTab("overview")}
              style={{ 
                padding: "0.4rem 0.85rem", 
                borderRadius: "6px", 
                background: activeTab === "overview" ? "var(--accent-light)" : "transparent", 
                border: "none", 
                fontWeight: activeTab === "overview" ? "700" : "500", 
                cursor: "pointer", 
                color: activeTab === "overview" ? "var(--accent-primary)" : "var(--text-secondary)", 
                fontSize: "0.82rem",
                transition: "all 0.2s" 
              }}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab("matrix")}
              style={{ 
                padding: "0.4rem 0.85rem", 
                borderRadius: "6px", 
                background: activeTab === "matrix" ? "var(--accent-light)" : "transparent", 
                border: "none", 
                fontWeight: activeTab === "matrix" ? "700" : "500", 
                cursor: "pointer", 
                color: activeTab === "matrix" ? "var(--accent-primary)" : "var(--text-secondary)", 
                fontSize: "0.82rem",
                transition: "all 0.2s" 
              }}
            >
              Matrix View
            </button>
            <button 
              onClick={() => setActiveTab("reports")}
              style={{ 
                padding: "0.4rem 0.85rem", 
                borderRadius: "6px", 
                background: activeTab === "reports" ? "var(--accent-light)" : "transparent", 
                border: "none", 
                fontWeight: activeTab === "reports" ? "700" : "500", 
                cursor: "pointer", 
                color: activeTab === "reports" ? "var(--accent-primary)" : "var(--text-secondary)", 
                fontSize: "0.82rem",
                transition: "all 0.2s" 
              }}
            >
              Reports
            </button>
          </div>

          <button 
            onClick={fetchAttendance} 
            disabled={loadingAttendance}
            className="btn btn-ghost" 
            style={{ 
              backgroundColor: "var(--bg-secondary)", 
              border: "1px solid var(--glass-border)", 
              padding: "0.5rem 0.75rem" 
            }}
            title="Reload Attendance"
          >
            <RefreshCw size={15} className={loadingAttendance ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {activeTab === "reports" ? (
        <div style={{ width: "100%" }}>
          <AttendanceReports users={users} classes={classes} />
        </div>
      ) : activeTab === "overview" ? (
        <>
          {/* Categorized Sleek KPI Metrics Strip */}
          <div className="glass-panel" style={{ padding: "1rem 1.25rem", width: "100%", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            
            {/* Top Cards Row: Compact & Balanced */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", 
              gap: "0.85rem", 
              width: "100%" 
            }}>
              
              {/* Present Metric Card */}
              <div 
                onClick={() => navigate('/attendance/status/present')} 
                className="table-row-hover"
                style={{ 
                  padding: "0.85rem 1rem", 
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.05)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  cursor: "pointer", 
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
                title="Click to view all present students"
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "0.2rem" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981" }}></span>
                    <p style={{ color: "#047857", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Present Today
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                    <span style={{ fontSize: "1.45rem", fontWeight: "800", color: "#065f46", lineHeight: 1.2 }}>
                      {stats.presentRate}%
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#047857", fontWeight: "600" }}>
                      ({stats.studentPresent}/{stats.studentTotal})
                    </span>
                  </div>
                </div>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserCheck size={18} />
                </div>
              </div>

              {/* Absent Metric Card */}
              <div 
                onClick={() => navigate('/attendance/status/absent')} 
                className="table-row-hover"
                style={{ 
                  padding: "0.85rem 1rem", 
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.05)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  cursor: "pointer", 
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
                title="Click to view all absent students"
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "0.2rem" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#ef4444" }}></span>
                    <p style={{ color: "#b91c1c", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Absent
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                    <span style={{ fontSize: "1.45rem", fontWeight: "800", color: "#991b1b", lineHeight: 1.2 }}>
                      {stats.studentAbsent}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#b91c1c", fontWeight: "600" }}>
                      students ({stats.absentRate}%)
                    </span>
                  </div>
                </div>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserX size={18} />
                </div>
              </div>

              {/* Late Metric Card */}
              <div 
                onClick={() => navigate('/attendance/status/late')} 
                className="table-row-hover"
                style={{ 
                  padding: "0.85rem 1rem", 
                  borderRadius: "10px",
                  background: "rgba(245, 158, 11, 0.05)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  cursor: "pointer", 
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
                title="Click to view all late students"
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "0.2rem" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#f59e0b" }}></span>
                    <p style={{ color: "#b45309", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Late Arrival
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                    <span style={{ fontSize: "1.45rem", fontWeight: "800", color: "#92400e", lineHeight: 1.2 }}>
                      {stats.studentLate}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#b45309", fontWeight: "600" }}>
                      students ({stats.lateRate}%)
                    </span>
                  </div>
                </div>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.15)", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Clock size={18} />
                </div>
              </div>

              {/* Not Marked Metric Card */}
              <div 
                onClick={() => navigate('/attendance/status/not-marked')} 
                className="table-row-hover"
                style={{ 
                  padding: "0.85rem 1rem", 
                  borderRadius: "10px",
                  background: "rgba(99, 102, 241, 0.05)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  cursor: "pointer", 
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
                title="Click to view unmarked students"
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "0.2rem" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1" }}></span>
                    <p style={{ color: "#4338ca", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Pending Submissions
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                    <span style={{ fontSize: "1.45rem", fontWeight: "800", color: "#3730a3", lineHeight: 1.2 }}>
                      {stats.studentNotMarked}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#4338ca", fontWeight: "600" }}>
                      unmarked ({stats.notMarkedRate}%)
                    </span>
                  </div>
                </div>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <HelpCircle size={18} />
                </div>
              </div>

            </div>

            {/* Attendance Composition Bar */}
            <div style={{ width: "100%", background: "#f1f5f9", height: "8px", borderRadius: "4px", overflow: "hidden", display: "flex" }}>
              {stats.studentPresent > 0 && (
                <div 
                  style={{ width: `${(stats.studentPresent / stats.studentTotal) * 100}%`, background: "#10b981", transition: "width 0.5s" }} 
                  title={`Present: ${stats.studentPresent} (${stats.presentRate}%)`} 
                />
              )}
              {stats.studentLate > 0 && (
                <div 
                  style={{ width: `${(stats.studentLate / stats.studentTotal) * 100}%`, background: "#f59e0b", transition: "width 0.5s" }} 
                  title={`Late: ${stats.studentLate} (${stats.lateRate}%)`} 
                />
              )}
              {stats.studentAbsent > 0 && (
                <div 
                  style={{ width: `${(stats.studentAbsent / stats.studentTotal) * 100}%`, background: "#ef4444", transition: "width 0.5s" }} 
                  title={`Absent: ${stats.studentAbsent} (${stats.absentRate}%)`} 
                />
              )}
              {stats.studentNotMarked > 0 && (
                <div 
                  style={{ width: `${(stats.studentNotMarked / stats.studentTotal) * 100}%`, background: "#cbd5e1", transition: "width 0.5s" }} 
                  title={`Pending: ${stats.studentNotMarked} (${stats.notMarkedRate}%)`} 
                />
              )}
            </div>

          </div>

          {/* Classes Overview Controls Card */}
          <div className="glass-panel" style={{ padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              
              {/* Left: Title & Filter controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", flex: 1 }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                  Classes Overview
                </h2>

                {/* Date Picker */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="input-glass"
                    style={{ padding: "0.4rem 0.65rem", fontSize: "0.82rem", cursor: "pointer" }}
                  />
                  {selectedDate !== formatDate(new Date()) && (
                    <button 
                      onClick={() => setSelectedDate(formatDate(new Date()))}
                      className="btn btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem" }}
                    >
                      Today
                    </button>
                  )}
                </div>

                {/* Class Dropdown */}
                <select
                  value={selectedClassName}
                  onChange={(e) => {
                    setSelectedClassName(e.target.value);
                    setSelectedSection('all');
                  }}
                  className="input-glass"
                  style={{ width: "auto", minWidth: "140px", fontSize: "0.82rem", cursor: "pointer" }}
                  title="Filter by Class"
                >
                  <option value="all">All Classes ({uniqueClassNames.length})</option>
                  {uniqueClassNames.map(name => (
                    <option key={name} value={name}>Class {name}</option>
                  ))}
                </select>

                {/* Section Dropdown */}
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="input-glass"
                  style={{ width: "auto", minWidth: "125px", fontSize: "0.82rem", cursor: "pointer" }}
                  title="Filter by Section"
                >
                  <option value="all">All Sections ({availableSections.length})</option>
                  {availableSections.map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-glass"
                  style={{ width: "auto", minWidth: "135px", fontSize: "0.82rem", cursor: "pointer" }}
                  title="Filter by Attendance Status"
                >
                  <option value="all">All Statuses</option>
                  <option value="marked">Marked</option>
                  <option value="pending">Pending</option>
                  <option value="low">Low (&lt;70%)</option>
                </select>

                {/* Search Classes */}
                <div style={{ position: "relative", minWidth: "160px", maxWidth: "220px", flex: 1 }}>
                  <Search size={15} style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input 
                    type="text"
                    placeholder="Search..."
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    className="input-glass"
                    style={{ paddingLeft: "2.1rem", paddingRight: classSearch ? "1.8rem" : "0.5rem", width: "100%", margin: 0 }}
                  />
                  {classSearch && (
                    <button
                      onClick={() => setClassSearch('')}
                      style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Reset Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="btn btn-ghost"
                    style={{
                      color: "#ef4444",
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.65rem",
                      border: "1px dashed #fca5a5",
                      backgroundColor: "rgba(239, 68, 68, 0.05)"
                    }}
                    title="Reset all filters"
                  >
                    <X size={13} /> Reset
                  </button>
                )}

              </div>

              {/* Right: View Toggle & Exports */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                
                {/* View Switcher */}
                <div style={{ 
                  display: "flex", 
                  backgroundColor: "var(--bg-secondary)", 
                  border: "1px solid var(--glass-border)", 
                  borderRadius: "8px", 
                  padding: "2px" 
                }}>
                  <button
                    onClick={() => setOverviewViewMode('table')}
                    style={{
                      padding: "0.35rem 0.65rem",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: overviewViewMode === 'table' ? "var(--accent-light)" : "transparent",
                      color: overviewViewMode === 'table' ? "var(--accent-primary)" : "var(--text-secondary)",
                      fontWeight: overviewViewMode === 'table' ? "700" : "500"
                    }}
                    title="Tabular Class List View"
                  >
                    <TableIcon size={14} /> Tabular
                  </button>
                  <button
                    onClick={() => setOverviewViewMode('grid')}
                    style={{
                      padding: "0.35rem 0.65rem",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: overviewViewMode === 'grid' ? "var(--accent-light)" : "transparent",
                      color: overviewViewMode === 'grid' ? "var(--accent-primary)" : "var(--text-secondary)",
                      fontWeight: overviewViewMode === 'grid' ? "700" : "500"
                    }}
                    title="Section Cards View"
                  >
                    <LayoutGrid size={14} /> Cards
                  </button>
                </div>

                {/* Exports */}
                <button 
                  onClick={handleExportOverviewExcel}
                  className="btn btn-ghost" 
                  style={{ 
                    backgroundColor: "var(--bg-secondary)", 
                    border: "1px solid var(--glass-border)", 
                    fontSize: "0.78rem",
                    padding: "0.4rem 0.65rem"
                  }}
                  title="Export class attendance to Excel"
                >
                  <FileSpreadsheet size={14} color="#16a34a" /> Excel
                </button>

                <button 
                  onClick={handleExportOverviewPDF}
                  className="btn btn-ghost" 
                  style={{ 
                    backgroundColor: "var(--bg-secondary)", 
                    border: "1px solid var(--glass-border)", 
                    fontSize: "0.78rem",
                    padding: "0.4rem 0.65rem"
                  }}
                  title="Export class attendance to PDF"
                >
                  <FileText size={14} color="#dc2626" /> PDF
                </button>

              </div>

            </div>
          </div>

          {/* Classes Listing Section */}
          {loadingUsers || loadingAttendance ? (
            <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 1rem", color: "var(--accent-primary)" }} />
              <p>Loading attendance data for {selectedDate}...</p>
            </div>
          ) : filteredClassStats.length === 0 ? (
            <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <AlertCircle size={40} style={{ margin: "0 auto 1rem", opacity: 0.35 }} />
              <h3>No Classes Found</h3>
              <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
                No class records match your search or filters.
              </p>
              {hasActiveFilters && (
                <button 
                  onClick={resetFilters} 
                  className="btn btn-ghost" 
                  style={{ marginTop: "0.75rem", border: "1px solid var(--glass-border)" }}
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : overviewViewMode === 'table' ? (
            /* ==================== TABULAR VIEW FOR CLASSES ==================== */
            <div className="glass-panel" style={{ overflow: "hidden", width: "100%" }}>
              <div style={{ overflowX: "auto", width: "100%" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid var(--glass-border)" }}>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)" }}>Class & Section</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", textAlign: "center" }}>Total Students</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", textAlign: "center" }}>Present</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", textAlign: "center" }}>Absent</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", textAlign: "center" }}>Late</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", minWidth: "180px" }}>Attendance Rate</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", textAlign: "center" }}>Status</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-secondary)", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClassStats.map((cls) => {
                      const color = getPercentageColor(cls.percentage, cls.isMarked);
                      return (
                        <tr 
                          key={cls.id} 
                          className="table-row-hover" 
                          style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.15s" }}
                        >
                          <td style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "var(--text-primary)" }}>
                            Class {cls.className} - {cls.section}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: "600" }}>
                            {cls.total}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: "#10b981", fontWeight: "700" }}>
                            {cls.present}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: cls.absent > 0 ? "#ef4444" : "var(--text-secondary)", fontWeight: "700" }}>
                            {cls.absent}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: cls.late > 0 ? "#f59e0b" : "var(--text-secondary)", fontWeight: "600" }}>
                            {cls.late}
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{ flex: 1, height: "6px", background: "rgba(0,0,0,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                                <div 
                                  style={{ 
                                    height: "100%", 
                                    width: `${cls.isMarked ? cls.percentage : 0}%`, 
                                    background: color,
                                    borderRadius: "3px"
                                  }} 
                                />
                              </div>
                              <span style={{ fontWeight: "700", color: color, minWidth: "40px", fontSize: "0.82rem" }}>
                                {cls.isMarked ? `${cls.percentage}%` : '0%'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                            {!cls.isMarked ? (
                              <span style={{ 
                                fontSize: "0.72rem", 
                                fontWeight: "700", 
                                padding: "0.2rem 0.55rem", 
                                borderRadius: "4px",
                                backgroundColor: "rgba(139, 92, 246, 0.12)",
                                color: "#7c3aed"
                              }}>
                                Pending
                              </span>
                            ) : cls.percentage >= 85 ? (
                              <span style={{ 
                                fontSize: "0.72rem", 
                                fontWeight: "700", 
                                padding: "0.2rem 0.55rem", 
                                borderRadius: "4px",
                                backgroundColor: "rgba(16, 185, 129, 0.12)",
                                color: "#059669"
                              }}>
                                Good
                              </span>
                            ) : cls.percentage >= 70 ? (
                              <span style={{ 
                                fontSize: "0.72rem", 
                                fontWeight: "700", 
                                padding: "0.2rem 0.55rem", 
                                borderRadius: "4px",
                                backgroundColor: "rgba(245, 158, 11, 0.12)",
                                color: "#d97706"
                              }}>
                                Average
                              </span>
                            ) : (
                              <span style={{ 
                                fontSize: "0.72rem", 
                                fontWeight: "700", 
                                padding: "0.2rem 0.55rem", 
                                borderRadius: "4px",
                                backgroundColor: "rgba(239, 68, 68, 0.12)",
                                color: "#dc2626"
                              }}>
                                Low
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                            <button
                              onClick={() => navigate(`/attendance/class/${cls.id}`)}
                              className="btn btn-ghost"
                              style={{ 
                                fontSize: "0.78rem", 
                                padding: "0.3rem 0.65rem", 
                                color: "var(--accent-primary)", 
                                background: "rgba(27, 139, 59, 0.08)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              Manage <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ==================== FULL-WIDTH FLUID CARDS VIEW ==================== */
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
              {Object.entries(groupedClasses).map(([className, sections]) => (
                <div 
                  key={className} 
                  className="glass-panel"
                  style={{ 
                    padding: "1.15rem 1.35rem", 
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "4px", height: "16px", background: "var(--accent-primary)", borderRadius: "2px" }}></span>
                      Class {className}
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                      {sections.length} Section{sections.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {/* Fluid Card Grid stretching 100% */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", 
                    gap: "0.85rem", 
                    width: "100%" 
                  }}>
                    {sections.map(cls => {
                      const color = getPercentageColor(cls.percentage, cls.isMarked);
                      return (
                        <div 
                          key={cls.id} 
                          onClick={() => navigate(`/attendance/class/${cls.id}`)}
                          className="glass-card hover-bg" 
                          style={{ 
                            padding: "1rem", 
                            cursor: "pointer", 
                            transition: "transform 0.2s, box-shadow 0.2s",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            borderRadius: "10px"
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                              <div>
                                <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)" }}>
                                  Section {cls.section}
                                </h4>
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: "500" }}>
                                  {cls.total} Students
                                </p>
                              </div>
                              <div style={{ 
                                background: `rgba(${cls.percentage >= 85 ? '16, 185, 129' : cls.percentage >= 70 ? '245, 158, 11' : '239, 68, 68'}, 0.12)`, 
                                color: color,
                                padding: "3px 8px", 
                                borderRadius: "14px",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.78rem"
                              }}>
                                <PieChart size={12} /> {cls.isMarked ? `${cls.percentage}%` : '0%'}
                              </div>
                            </div>
                            
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                              <span>Present: <strong style={{ color: "#10b981" }}>{cls.present}</strong></span>
                              <span>Absent: <strong style={{ color: "#ef4444" }}>{cls.absent}</strong></span>
                            </div>
                            
                            <div style={{ width: "100%", height: "5px", background: "rgba(0,0,0,0.06)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.75rem" }}>
                              <div style={{ 
                                height: "100%", 
                                width: `${cls.isMarked ? cls.percentage : 0}%`, 
                                background: color,
                                transition: "width 0.6s ease-in-out",
                                borderRadius: "3px"
                              }} />
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--accent-primary)", fontSize: "0.78rem", fontWeight: "700", borderTop: "1px solid var(--glass-border)", paddingTop: "0.5rem" }}>
                            <span>Manage Attendance</span>
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ==================== MATRIX VIEW ==================== */
        <div className="animate-fade-in" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px", minWidth: "180px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                Select Class
              </label>
              <select 
                className="input-glass" 
                value={matrixClassId} 
                onChange={(e) => setMatrixClassId(e.target.value)}
                style={{ width: "100%", cursor: "pointer" }}
              >
                <option value="">-- Choose Class --</option>
                <option value="all">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>Class {cls.className || cls.name} - {cls.section}</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: "2 1 300px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                Date Range
              </label>
              <DateRangePicker 
                startDate={matrixDateRange.start}
                endDate={matrixDateRange.end}
                setStartDate={(s) => setMatrixDateRange(prev => ({...prev, start: s}))}
                setEndDate={(e) => setMatrixDateRange(prev => ({...prev, end: e}))}
                defaultRange="mtd"
              />
            </div>

            {matrixClassId && (
              <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
                <button 
                  onClick={handleExportMatrixCSV}
                  className="btn btn-ghost"
                  style={{ 
                    backgroundColor: "var(--bg-secondary)", 
                    border: "1px solid var(--glass-border)", 
                    fontSize: "0.8rem",
                    padding: "0.5rem 0.85rem"
                  }}
                  title="Export Attendance Matrix to Excel"
                >
                  <FileSpreadsheet size={15} color="#16a34a" /> Excel Matrix
                </button>
                <button 
                  onClick={handleExportMatrixPDF}
                  className="btn btn-ghost"
                  style={{ 
                    backgroundColor: "var(--bg-secondary)", 
                    border: "1px solid var(--glass-border)", 
                    fontSize: "0.8rem",
                    padding: "0.5rem 0.85rem"
                  }}
                  title="Export Attendance Matrix to PDF"
                >
                  <Download size={15} color="#dc2626" /> PDF Matrix
                </button>
              </div>
            )}
          </div>

          {!matrixClassId ? (
            <div className="glass-panel" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <PieChart size={48} style={{ opacity: 0.25, margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-primary)" }}>Select a class to view attendance matrix</h3>
              <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>Choose a class and date range from the options above to inspect student attendance records over time.</p>
            </div>
          ) : (
            <div style={{ width: "100%" }}>
              <AttendanceMatrixTable 
                gridDays={gridDays}
                loadingUsers={loadingUsers}
                loadingAttendance={loadingMatrix}
                classStudents={matrixClassStudents}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;
