import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import { ChevronLeft, CheckCircle, FileSpreadsheet, Download } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import DateRangePicker, { formatDate } from "../components/DateRangePicker";
import AttendanceMatrixTable from "../components/AttendanceMatrixTable";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const AttendanceClassView = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { users, classes, loadingUsers } = useSelector((state) => state.data);

  const [viewMode, setViewMode] = useState("daily");
  const [matrixDateRange, setMatrixDateRange] = useState({ 
    start: formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), 
    end: formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
  });

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [publicHolidays, setPublicHolidays] = useState([]);
  
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  useEffect(() => {
    api.get('/admin_panel/planner').then(res => {
      const holidays = (res.data.data || []).filter(h => h.category === 'Holiday').map(h => ({ ...h, date: h.start_date }));
      setPublicHolidays(holidays);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
    if (classes.length === 0) dispatch(fetchClasses());
  }, [dispatch, users.length, classes.length]);

  const fetchAttendance = async () => {
    try {
      setLoadingAttendance(true);
      let start, end;
      if (viewMode === "matrix") {
        start = matrixDateRange.start;
        end = matrixDateRange.end;
      } else {
        start = selectedDate;
        end = selectedDate;
      }
      
      const res = await api.get('/attendance', {
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
  }, [selectedDate, viewMode, matrixDateRange]);

  const gridDays = useMemo(() => {
    if (viewMode !== "matrix" || !matrixDateRange.start || !matrixDateRange.end) return [];
    const days = [];
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
    let curr = new Date(matrixDateRange.start);
    const end = new Date(matrixDateRange.end);
    let limit = 0; // Prevent infinite loop if dates are too far apart
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
  }, [matrixDateRange, publicHolidays, viewMode]);

  const activeClass = useMemo(() => classes.find(c => String(c.id) === String(classId)), [classes, classId]);
  
  const classStudents = useMemo(() => {
    return users
      .filter(u => u.type === 'student' && u.classes && u.classes.includes(classId))
      .map(user => {
        if (viewMode === "matrix") {
          const records = attendanceRecords.filter(a => a.student_id === user.id);
          return { ...user, records };
        } else {
          const record = attendanceRecords.find(a => a.student_id === user.id && a.date === selectedDate);
          return {
            ...user,
            status: record ? record.status : "not marked"
          };
        }
      });
  }, [users, classId, attendanceRecords, viewMode, selectedDate]);

  const handleMarkAllPresent = async () => {
    const records = classStudents.map(student => ({
      student_id: student.id,
      date: selectedDate,
      status: "present"
    }));

    if (records.length === 0) {
      toast.info("No students to mark.");
      return;
    }

    try {
      await api.post('/attendance/bulk', { data: records });
      toast.success("All students marked as Present!");
      fetchAttendance(); // refresh
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark all present");
    }
  };

  const handleSingleUpdate = async (userId, status) => {
    try {
      await api.put(`/attendance/${userId}`, { 
        data: { date: selectedDate, status } 
      });
      fetchAttendance(); // refresh
      toast.success("Attendance updated");
    } catch (err) {
      toast.error("Failed to update attendance");
    }
  };

  const handleExportExcel = () => {
    if (viewMode === "daily") {
      const data = classStudents.map(s => ({ "Student Name": s.name, "Status": s.status.charAt(0).toUpperCase() + s.status.slice(1) }));
      exportToExcel(data, `Attendance_${activeClass.className}_${activeClass.section}_${selectedDate}`);
    } else {
      const data = classStudents.map(s => {
        const row = { "Student Name": s.name };
        gridDays.forEach(d => {
          const record = s.records?.find(r => r.date === d.fullDateString);
          row[`${d.dateNumber} ${d.monthName}`] = record ? record.status.charAt(0).toUpperCase() : "-";
        });
        return row;
      });
      exportToExcel(data, `Attendance_Matrix_${activeClass.className}_${activeClass.section}`);
    }
  };

  const handleExportPDF = () => {
    if (viewMode === "daily") {
      const columns = ["Student Name", "Status"];
      const data = classStudents.map(s => [s.name, s.status.charAt(0).toUpperCase() + s.status.slice(1)]);
      exportToPDF(columns, data, `Attendance_${activeClass.className}_${activeClass.section}_${selectedDate}`, `Attendance - Class ${activeClass.className} ${activeClass.section} (${selectedDate})`);
    } else {
      const columns = ["Student Name", ...gridDays.map(d => `${d.dateNumber} ${d.monthName}`)];
      const data = classStudents.map(s => {
        const row = [s.name];
        gridDays.forEach(d => {
          const record = s.records?.find(r => r.date === d.fullDateString);
          row.push(record ? record.status.charAt(0).toUpperCase() : "-");
        });
        return row;
      });
      exportToPDF(columns, data, `Attendance_Matrix_${activeClass.className}_${activeClass.section}`, `Attendance Matrix - Class ${activeClass.className} ${activeClass.section}`);
    }
  };

  if (!activeClass) {
    return <div style={{ padding: "2rem" }}>Loading class data...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={() => navigate("/attendance")} className="btn btn-ghost" style={{ padding: "8px" }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Class {activeClass.className} - {activeClass.section}</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage attendance for this class</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: "8px", padding: "4px" }}>
          <button 
            onClick={() => setViewMode("daily")}
            style={{ padding: "6px 12px", borderRadius: "6px", background: viewMode === "daily" ? "white" : "transparent", boxShadow: viewMode === "daily" ? "0 2px 4px rgba(0,0,0,0.1)" : "none", border: "none", fontWeight: "600", cursor: "pointer", color: viewMode === "daily" ? "#3b82f6" : "var(--text-secondary)", transition: "all 0.2s" }}
          >
            Daily View
          </button>
          <button 
            onClick={() => setViewMode("matrix")}
            style={{ padding: "6px 12px", borderRadius: "6px", background: viewMode === "matrix" ? "white" : "transparent", boxShadow: viewMode === "matrix" ? "0 2px 4px rgba(0,0,0,0.1)" : "none", border: "none", fontWeight: "600", cursor: "pointer", color: viewMode === "matrix" ? "#3b82f6" : "var(--text-secondary)", transition: "all 0.2s" }}
          >
            Matrix View
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem" }}>
          <button onClick={handleExportExcel} className="btn-ghost" style={{ padding: "8px", display: "flex", alignItems: "center", gap: "0.5rem" }} title="Export Excel">
            <FileSpreadsheet size={18} />
          </button>
          <button onClick={handleExportPDF} className="btn-ghost" style={{ padding: "8px", display: "flex", alignItems: "center", gap: "0.5rem" }} title="Export PDF">
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {viewMode === "daily" ? (
            <>
              <label style={{ fontWeight: "600" }}>Date:</label>
              <input 
                type="date" 
                className="input-glass" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
              />
            </>
          ) : (
            <>
              <DateRangePicker 
                startDate={matrixDateRange.start}
                endDate={matrixDateRange.end}
                setStartDate={(s) => setMatrixDateRange(prev => ({...prev, start: s}))}
                setEndDate={(e) => setMatrixDateRange(prev => ({...prev, end: e}))}
                defaultRange="mtd"
              />
            </>
          )}
        </div>
        
        {viewMode === "daily" && (
          <button onClick={handleMarkAllPresent} className="btn" style={{ background: "#10b981", color: "white", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle size={18} /> Mark All Present
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ overflowX: "auto" }}>
          {viewMode === "daily" ? (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>Student Name</th>
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>Status</th>
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.1)", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers || loadingAttendance ? (
                  <tr><td colSpan={3} style={{ padding: "2rem", textAlign: "center" }}>Loading...</td></tr>
                ) : classStudents.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No students found in this class.</td></tr>
                ) : (
                  classStudents.map(user => (
                    <tr key={user.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", cursor: "pointer" }} onClick={() => navigate(`/attendance/student/${user.id}`)}>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: "500" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                            {user.name.charAt(0)}
                          </div>
                          {user.name}
                        </div>
                      </td>
                      
                      <td style={{ padding: "1rem" }}>
                        <span style={{ 
                          padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500", textTransform: "capitalize",
                          background: user.status === "present" ? "rgba(16, 185, 129, 0.2)" : user.status === "late" ? "rgba(245, 158, 11, 0.2)" : user.status === "absent" ? "rgba(239, 68, 68, 0.2)" : "rgba(0,0,0,0.08)",
                          color: user.status === "present" ? "#10b981" : user.status === "late" ? "#f59e0b" : user.status === "absent" ? "#ef4444" : "var(--text-secondary)"
                        }}>
                          {user.status}
                        </span>
                      </td>

                      <td style={{ padding: "1rem", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          <button 
                            onClick={() => handleSingleUpdate(user.id, "present")}
                            style={{ 
                              padding: "4px 12px", borderRadius: "6px", border: "1px solid #10b981",
                              background: user.status === "present" ? "#10b981" : "transparent", color: user.status === "present" ? "white" : "#10b981", fontSize: "12px", fontWeight: "600",
                              cursor: "pointer", transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => { if (user.status !== "present") { e.target.style.background = "#10b981"; e.target.style.color = "white"; } }}
                            onMouseLeave={(e) => { if (user.status !== "present") { e.target.style.background = "transparent"; e.target.style.color = "#10b981"; } }}
                          >
                            Present
                          </button>
                          <button 
                            onClick={() => handleSingleUpdate(user.id, "late")}
                            style={{ 
                              padding: "4px 12px", borderRadius: "6px", border: "1px solid #f59e0b",
                              background: user.status === "late" ? "#f59e0b" : "transparent", color: user.status === "late" ? "white" : "#f59e0b", fontSize: "12px", fontWeight: "600",
                              cursor: "pointer", transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => { if (user.status !== "late") { e.target.style.background = "#f59e0b"; e.target.style.color = "white"; } }}
                            onMouseLeave={(e) => { if (user.status !== "late") { e.target.style.background = "transparent"; e.target.style.color = "#f59e0b"; } }}
                          >
                            Late
                          </button>
                          <button 
                            onClick={() => handleSingleUpdate(user.id, "absent")}
                            style={{ 
                              padding: "4px 12px", borderRadius: "6px", border: "1px solid #ef4444",
                              background: user.status === "absent" ? "#ef4444" : "transparent", color: user.status === "absent" ? "white" : "#ef4444", fontSize: "12px", fontWeight: "600",
                              cursor: "pointer", transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => { if (user.status !== "absent") { e.target.style.background = "#ef4444"; e.target.style.color = "white"; } }}
                            onMouseLeave={(e) => { if (user.status !== "absent") { e.target.style.background = "transparent"; e.target.style.color = "#ef4444"; } }}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <AttendanceMatrixTable 
              gridDays={gridDays}
              loadingUsers={loadingUsers}
              loadingAttendance={loadingAttendance}
              classStudents={classStudents}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceClassView;
