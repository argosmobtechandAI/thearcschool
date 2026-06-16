import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import { Search, Calendar, UserCheck, ChevronUp, ChevronDown, ChevronsUpDown, CheckCircle, Clock, XCircle, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { toast } from "react-toastify";
import api from "../services/api";
import TableFilterHeader from "../components/TableFilterHeader";
import DateRangePicker, { formatDate } from "../components/DateRangePicker";
import { useSortableData } from "../hooks/useSortableData";

const Attendance = () => {
  const dispatch = useDispatch();
  const { users, classes, loadingUsers } = useSelector((state) => state.data);

  const [activeTab, setActiveTab] = useState("student");
  const [mode, setMode] = useState("view"); // "view", "rapid", or "grid"
  
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: formatDate(new Date()), end: formatDate(new Date()) });
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([
    "name", "attendancePercentage", "todayStatus"
  ]);
  
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  // Rapid Entry State
  const [rapidDate, setRapidDate] = useState(formatDate(new Date()));
  const [rapidClass, setRapidClass] = useState("");
  const [rapidAttendance, setRapidAttendance] = useState({}); // { studentId: status }

  // Grid View State
  const [gridMonth, setGridMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const todayString = formatDate(new Date());
  
  const [formData, setFormData] = useState({
    date: todayString,
    status: "",
  });

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
    if (classes.length === 0) dispatch(fetchClasses());
  }, [dispatch, users.length, classes.length]);

  // Fetch attendance records when dateRange or gridMonth changes depending on mode
  const fetchAttendance = async () => {
    try {
      setLoadingAttendance(true);
      
      let start, end;
      if (mode === "grid") {
        const [year, month] = gridMonth.split("-");
        start = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      } else {
        start = dateRange.start;
        end = dateRange.end;
      }

      const res = await api.get('/user/attendance', {
        params: { startDate: start, endDate: end }
      });
      if (res.data.success) {
        setAttendanceRecords(res.data.records);
      }
    } catch (err) {
      toast.error("Failed to load attendance records");
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [dateRange.start, dateRange.end, gridMonth, mode]);

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => u.type === activeTab)
      .filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((user) => {
        const userAttendance = attendanceRecords.filter(a => a.student_id === user.id);
        const totalDays = userAttendance.length;
        const presentDays = userAttendance.filter((a) => a.status === "present").length;
        const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        const todayStatus = userAttendance.find((a) => a.date === todayString)?.status || "not marked";

        return { ...user, attendancePercentage: percentage, todayStatus, attendance: userAttendance };
      })
      .filter((user) => {
        if (classFilter && activeTab === 'student') {
          if (!user.classes || !user.classes.includes(Number(classFilter))) return false;
        }
        if (!statusFilter || statusFilter === "all") return true;
        
        return user.attendance?.some((a) => {
          let inRange = true;
          if (mode !== "grid" && dateRange.start && dateRange.end) {
            const aDate = new Date(a.date);
            inRange = aDate >= new Date(dateRange.start) && aDate <= new Date(dateRange.end);
          }
          return inRange && a.status === statusFilter;
        });
      });
  }, [users, activeTab, searchQuery, dateRange, statusFilter, classFilter, todayString, attendanceRecords, mode]);

  const handleOpenModal = (user) => {
    setSelectedUser(user);
    setFormData({ date: todayString, status: user.todayStatus !== "not marked" ? user.todayStatus : "" });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/user/updateAttendace/${selectedUser.id}`, { data: formData });
      toast.success("Attendance marked successfully");
      setIsModalOpen(false);
      fetchAttendance(); // refresh local records
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    }
  };

  const exportColumnsList = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "attendancePercentage", label: "Attendance %" },
    { key: "todayStatus", label: "Today's Status" }
  ];

  const { items: sortedUsers, requestSort, sortConfig } = useSortableData(filteredUsers);

  // ... (Export methods remain the same)
  const handleExportExcel = (selectedKeys) => {
    const dataToExport = filteredUsers.map(u => {
      const row = {};
      const addIfSelected = (key, value) => {
        if (!selectedKeys || selectedKeys.includes(key)) {
          const colDef = exportColumnsList.find(c => c.key === key);
          if (colDef) row[colDef.label] = value || "N/A";
        }
      };
      
      addIfSelected("name", u.name);
      addIfSelected("email", u.email);
      addIfSelected("phone", u.phone);
      addIfSelected("attendancePercentage", `${u.attendancePercentage}%`);
      addIfSelected("todayStatus", u.todayStatus);
      return row;
    });
    exportToExcel(dataToExport, `Attendance_${activeTab}`);
  };

  const handleExportPDF = (selectedKeys) => {
    const activeColumns = exportColumnsList.filter(c => !selectedKeys || selectedKeys.includes(c.key));
    const columnLabels = activeColumns.map(c => c.label);
    
    const dataToExport = filteredUsers.map(u => {
      const row = [];
      const addIfSelected = (key, value) => {
        if (!selectedKeys || selectedKeys.includes(key)) row.push(value || "N/A");
      };
      
      addIfSelected("name", u.name);
      addIfSelected("email", u.email);
      addIfSelected("phone", u.phone);
      addIfSelected("attendancePercentage", `${u.attendancePercentage}%`);
      addIfSelected("todayStatus", u.todayStatus);
      return row;
    });
    exportToPDF(columnLabels, dataToExport, `Attendance_${activeTab}`, `Attendance (${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)})`);
  };

  const renderCell = (user, key) => {
    switch (key) {
      case "name": return (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: "500" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {user.name.charAt(0)}
          </div>
          {user.name}
        </div>
      );
      case "email": return <span style={{ color: "var(--text-secondary)" }}>{user.email}</span>;
      case "phone": return user.phone || "N/A";
      case "attendancePercentage": return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1, maxWidth: "100px", height: "8px", background: "rgba(0,0,0,0.08)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ 
              height: "100%", 
              width: `${user.attendancePercentage}%`, 
              background: user.attendancePercentage >= 75 ? "#10b981" : user.attendancePercentage >= 50 ? "#f59e0b" : "#ef4444" 
            }} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: "500" }}>{user.attendancePercentage}%</span>
        </div>
      );
      case "todayStatus": return (
        <span style={{ 
          padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500", textTransform: "capitalize",
          background: user.todayStatus === "present" ? "rgba(16, 185, 129, 0.2)" : user.todayStatus === "late" ? "rgba(245, 158, 11, 0.2)" : user.todayStatus === "absent" ? "rgba(239, 68, 68, 0.2)" : "rgba(0,0,0,0.08)",
          color: user.todayStatus === "present" ? "#6ee7b7" : user.todayStatus === "late" ? "#fcd34d" : user.todayStatus === "absent" ? "#fca5a5" : "var(--text-secondary)"
        }}>
          {user.todayStatus}
        </span>
      );
      default: return "N/A";
    }
  };

  // RAPID ENTRY LOGIC
  const rapidEntryUsers = useMemo(() => {
    return users.filter(u => u.type === 'student' && u.classes && u.classes.includes(Number(rapidClass)));
  }, [users, rapidClass]);

  const handleMarkAllPresent = () => {
    const newAtt = { ...rapidAttendance };
    rapidEntryUsers.forEach(u => {
      newAtt[u.id] = "present";
    });
    setRapidAttendance(newAtt);
  };

  const handleSaveBulkAttendance = async () => {
    const records = Object.keys(rapidAttendance).map(studentId => ({
      student_id: studentId,
      date: rapidDate,
      status: rapidAttendance[studentId]
    }));

    if (records.length === 0) {
      toast.info("No attendance marked to save.");
      return;
    }

    try {
      await api.post('/user/attendance/bulk', { data: records });
      toast.success("Bulk attendance saved successfully!");
      setRapidAttendance({});
      fetchAttendance(); // refresh
      setMode("view");
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk save failed");
    }
  };

  // GRID VIEW LOGIC
  const gridDays = useMemo(() => {
    const [year, month] = gridMonth.split("-");
    const numDays = new Date(year, month, 0).getDate();
    const days = [];
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    for (let i = 1; i <= numDays; i++) {
      const d = new Date(year, month - 1, i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      days.push({
        dateNumber: i,
        dayName: dayNames[d.getDay()],
        fullDateString: `${year}-${month}-${String(i).padStart(2, '0')}`,
        isWeekend
      });
    }
    return days;
  }, [gridMonth]);

  const getGridCellStatus = (user, fullDateString) => {
    if (!user.attendance) return null;
    const record = user.attendance.find(a => a.date === fullDateString);
    return record ? record.status : null;
  };

  const handleGridCellClick = async (user, fullDateString, currentStatus) => {
    // Cycle logic: none -> present -> absent -> late -> delete (undo)
    let newStatus = "present";
    if (currentStatus === "present") newStatus = "absent";
    else if (currentStatus === "absent") newStatus = "late";
    else if (currentStatus === "late") newStatus = "delete";

    try {
      await api.put(`/user/updateAttendace/${user.id}`, { 
        data: { date: fullDateString, status: newStatus } 
      });
      // Refresh local attendance quietly
      fetchAttendance();
    } catch (err) {
      toast.error("Failed to update cell");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Attendance Tracking</h1>
          <p style={{ color: "var(--text-secondary)" }}>Monitor and record attendance efficiently</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={() => setMode("view")} 
            className={`btn ${mode === "view" ? "btn-primary" : "btn-ghost"}`}
          >
            Summary View
          </button>
          <button 
            onClick={() => setMode("grid")} 
            className={`btn ${mode === "grid" ? "btn-primary" : "btn-ghost"}`}
          >
            Grid View
          </button>
          <button 
            onClick={() => setMode("rapid")} 
            className={`btn ${mode === "rapid" ? "btn-primary" : "btn-ghost"}`}
          >
            Rapid Entry Mode
          </button>
        </div>
      </div>

      {mode === "rapid" ? (
        <div className="glass-panel animate-fade-in" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem" }}>Bulk Mark Attendance</h2>
          
          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date</label>
              <input 
                type="date" 
                className="input-glass" 
                value={rapidDate} 
                onChange={(e) => setRapidDate(e.target.value)} 
              />
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Select Class</label>
              <select 
                className="input-glass" 
                value={rapidClass} 
                onChange={(e) => {
                  setRapidClass(e.target.value);
                  setRapidAttendance({}); // reset on class change
                }}
                style={{ appearance: "none" }}
              >
                <option value="" disabled>Select Class...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id} style={{ color: "black" }}>
                    Class {cls.className} - {cls.section}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button onClick={handleMarkAllPresent} className="btn" style={{ background: "#10b981", color: "white" }} disabled={!rapidClass}>
                Mark All Present
              </button>
            </div>
          </div>

          {rapidClass && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rapidEntryUsers.length === 0 ? (
                    <tr><td colSpan="2" style={{ padding: "1rem", textAlign: "center" }}>No students found in this class.</td></tr>
                  ) : (
                    rapidEntryUsers.map(user => (
                      <tr key={user.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: "500" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                              {user.name.charAt(0)}
                            </div>
                            {user.name}
                          </div>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button 
                              onClick={() => setRapidAttendance({...rapidAttendance, [user.id]: "present"})}
                              style={{ 
                                display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "8px", border: "1px solid #10b981",
                                background: rapidAttendance[user.id] === "present" ? "#10b981" : "transparent",
                                color: rapidAttendance[user.id] === "present" ? "white" : "#10b981",
                                cursor: "pointer", transition: "all 0.2s"
                              }}
                            >
                              <CheckCircle size={16} /> Present
                            </button>
                            <button 
                              onClick={() => setRapidAttendance({...rapidAttendance, [user.id]: "late"})}
                              style={{ 
                                display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "8px", border: "1px solid #f59e0b",
                                background: rapidAttendance[user.id] === "late" ? "#f59e0b" : "transparent",
                                color: rapidAttendance[user.id] === "late" ? "white" : "#f59e0b",
                                cursor: "pointer", transition: "all 0.2s"
                              }}
                            >
                              <Clock size={16} /> Late
                            </button>
                            <button 
                              onClick={() => setRapidAttendance({...rapidAttendance, [user.id]: "absent"})}
                              style={{ 
                                display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "8px", border: "1px solid #ef4444",
                                background: rapidAttendance[user.id] === "absent" ? "#ef4444" : "transparent",
                                color: rapidAttendance[user.id] === "absent" ? "white" : "#ef4444",
                                cursor: "pointer", transition: "all 0.2s"
                              }}
                            >
                              <XCircle size={16} /> Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
                <button 
                  onClick={handleSaveBulkAttendance} 
                  className="btn btn-primary" 
                  disabled={Object.keys(rapidAttendance).length === 0}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Save size={18} /> Save Attendance
                </button>
              </div>
            </div>
          )}
        </div>
      ) : mode === "grid" ? (
        <div className="glass-panel animate-fade-in" style={{ padding: "1.5rem" }}>
          
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
               <input 
                 type="month" 
                 className="input-glass" 
                 value={gridMonth}
                 onChange={(e) => setGridMonth(e.target.value)}
                 style={{ fontWeight: "600", fontSize: "1.1rem", padding: "8px 12px" }}
               />
               <div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem" }}>
                {["student", "teacher", "principal"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`btn ${activeTab === tab ? "btn-primary" : "btn-ghost"}`}
                    style={{ textTransform: "capitalize", padding: "6px 12px", fontSize: "14px" }}
                  >
                    {tab}s
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "8px", fontSize: "12px", fontWeight: "600" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "#10b981", borderRadius: "2px" }}></div> Present</span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "#ef4444", borderRadius: "2px" }}></div> Absent</span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "#f59e0b", borderRadius: "2px" }}></div> Late</span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "rgba(0,0,0,0.05)", borderRadius: "2px" }}></div> Weekend</span>
              </div>
              
              {activeTab === "student" && (
                <select 
                  className="input-glass" 
                  value={classFilter} 
                  onChange={(e) => setClassFilter(e.target.value)}
                  style={{ appearance: "none", padding: "6px 12px", fontSize: "14px" }}
                >
                  <option value="">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id} style={{ color: "black" }}>
                      Class {cls.className} - {cls.section}
                    </option>
                  ))}
                </select>
              )}
              
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                <input 
                  type="text" 
                  placeholder="Search name..." 
                  className="input-glass" 
                  style={{ paddingLeft: "32px", paddingRight: "12px", paddingTop: "6px", paddingBottom: "6px", fontSize: "14px" }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "12px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", left: 0, background: "white", zIndex: 10, padding: "12px", borderRight: "1px solid rgba(0,0,0,0.1)", borderBottom: "1px solid rgba(0,0,0,0.1)", textAlign: "left", minWidth: "200px" }}>
                    EMPLOYEE / STUDENT NAME
                  </th>
                  {gridDays.map(day => (
                    <th key={day.dateNumber} style={{ padding: "6px", minWidth: "40px", borderBottom: "1px solid rgba(0,0,0,0.1)", borderRight: "1px solid rgba(0,0,0,0.05)", background: day.isWeekend ? "rgba(0,0,0,0.02)" : "transparent" }}>
                      <div style={{ fontWeight: "700", fontSize: "14px" }}>{day.dateNumber}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase" }}>{day.dayName}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingUsers || loadingAttendance ? (
                  <tr><td colSpan={gridDays.length + 1} style={{ padding: "2rem" }}>Loading...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={gridDays.length + 1} style={{ padding: "2rem", color: "var(--text-secondary)" }}>No users found matching criteria.</td></tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td style={{ position: "sticky", left: 0, background: "white", zIndex: 10, padding: "10px 12px", borderRight: "1px solid rgba(0,0,0,0.1)", borderBottom: "1px solid rgba(0,0,0,0.05)", textAlign: "left" }}>
                        <div style={{ fontWeight: "600", fontSize: "13px" }}>{user.name}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "11px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "180px" }}>{user.email}</div>
                      </td>
                      {gridDays.map(day => {
                        const status = getGridCellStatus(user, day.fullDateString);
                        
                        let cellBg = "transparent";
                        let cellColor = "var(--text-secondary)";
                        let label = "";
                        
                        if (day.isWeekend) {
                          cellBg = "rgba(0,0,0,0.04)";
                          label = "W";
                        }
                        
                        if (status === "present") {
                          cellBg = "#10b981";
                          cellColor = "white";
                          label = "P";
                        } else if (status === "absent") {
                          cellBg = "#ef4444";
                          cellColor = "white";
                          label = "A";
                        } else if (status === "late") {
                          cellBg = "#f59e0b";
                          cellColor = "white";
                          label = "L";
                        }
                        
                        return (
                          <td 
                            key={day.dateNumber} 
                            onClick={() => !day.isWeekend && handleGridCellClick(user, day.fullDateString, status)}
                            style={{ 
                              padding: "0", 
                              borderBottom: "1px solid rgba(0,0,0,0.05)", 
                              borderRight: "1px solid rgba(0,0,0,0.05)", 
                              background: cellBg,
                              color: cellColor,
                              fontWeight: "bold",
                              cursor: day.isWeekend ? "not-allowed" : "pointer",
                              transition: "all 0.1s"
                            }}
                            title={`Click to toggle attendance for ${day.fullDateString}`}
                          >
                            <div style={{ width: "100%", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {label}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* Summary View Mode */}
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            {["student", "teacher", "principal"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`btn ${activeTab === tab ? "btn-primary" : "btn-ghost"}`}
                style={{ textTransform: "capitalize" }}
              >
                {tab}s
              </button>
            ))}
          </div>

          {/* Controls */}
          <TableFilterHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search name..."
            exportColumns={exportColumnsList}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            filters={[
              ...(activeTab === 'student' ? [{
                label: "All Classes",
                value: classFilter,
                onChange: setClassFilter,
                options: classes.map(cls => ({ label: `Class ${cls.className} - ${cls.section}`, value: cls.id }))
              }] : []),
              {
                label: "All Statuses",
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: "present", label: "Present" },
                  { value: "late", label: "Late" },
                  { value: "absent", label: "Absent" }
                ]
              }
            ]}
          >
            <DateRangePicker onRangeChange={setDateRange} />
          </TableFilterHeader>

          {/* Table */}
          <div className="glass-panel" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  {exportColumnsList.map(col => selectedColumns.includes(col.key) && (
                    <th key={col.key} style={{ cursor: "pointer" }} onClick={() => requestSort(col.key)}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
                        {col.label}
                        {sortConfig?.key === col.key ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                          <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />
                        )}
                      </div>
                    </th>
                  ))}
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers || loadingAttendance ? (
                  <tr><td colSpan={selectedColumns.length + 1} style={{ padding: "2rem", textAlign: "center" }}>Loading...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={selectedColumns.length + 1} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No records found.</td></tr>
                ) : (
                  sortedUsers.map((user) => (
                    <tr key={user.id}>
                      {exportColumnsList.map(col => {
                        if (!selectedColumns.includes(col.key)) return null;
                        return <td key={col.key}>{renderCell(user, col.key)}</td>;
                      })}
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button onClick={() => handleOpenModal(user)} className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "13px" }}>
                          <UserCheck size={16} style={{ marginRight: "4px" }} /> Mark
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal for View Mode */}
      {isModalOpen && selectedUser && mode === "view" && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setIsModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ width: "64px", height: "64px", margin: "0 auto 1rem", borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "bold" }}>
                {selectedUser.name.charAt(0)}
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700" }}>{selectedUser.name}</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Mark Attendance</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date</label>
                <input required type="date" className="input-glass" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Status</label>
                <select required className="input-glass" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ appearance: "none" }}>
                  <option value="" disabled>Select Status</option>
                  <option value="present" style={{ color: "black" }}>Present</option>
                  <option value="late" style={{ color: "black" }}>Late</option>
                  <option value="absent" style={{ color: "black" }}>Absent</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!formData.status}>Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
