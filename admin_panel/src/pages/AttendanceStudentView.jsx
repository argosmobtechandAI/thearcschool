import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUsers } from "../features/dataSlice";
import { ChevronLeft, Calendar, FileSpreadsheet, Download } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const AttendanceStudentView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { users } = useSelector((state) => state.data);

  const [gridMonth, setGridMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [publicHolidays, setPublicHolidays] = useState([]);

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
    api.get('/admin_panel/planner').then(res => {
      const holidays = (res.data.data || []).filter(h => h.category === 'Holiday').map(h => ({ ...h, date: h.start_date }));
      setPublicHolidays(holidays);
    }).catch(console.error);
  }, [dispatch, users.length]);

  const fetchAttendance = async () => {
    try {
      setLoadingAttendance(true);
      const [year, month] = gridMonth.split("-");
      const start = `${year}-${month}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const res = await api.get('/attendance', {
        params: { startDate: start, endDate: end }
      });
      if (res.data.success) {
        setAttendanceRecords(res.data.records.filter(r => r.student_id === studentId));
      }
    } catch (err) {
      toast.error("Failed to load attendance records");
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [gridMonth, studentId]);

  const activeStudent = useMemo(() => users.find(u => u.id === studentId), [users, studentId]);

  const gridDays = useMemo(() => {
    const [year, month] = gridMonth.split("-");
    const numDays = new Date(year, month, 0).getDate();
    const days = [];
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    for (let i = 1; i <= numDays; i++) {
      const d = new Date(year, month - 1, i);
      const isWeekend = d.getDay() === 0; // Only Sunday is weekend
      const fullDateString = `${year}-${month}-${String(i).padStart(2, '0')}`;
      const isPublicHoliday = publicHolidays.some(h => h.date === fullDateString);
      days.push({
        dateNumber: i,
        dayName: dayNames[d.getDay()],
        fullDateString,
        isWeekend,
        isPublicHoliday
      });
    }
    return days;
  }, [gridMonth, publicHolidays]);

  const handleGridCellClick = async (fullDateString, currentStatus) => {
    let newStatus = "present";
    if (currentStatus === "present") newStatus = "absent";
    else if (currentStatus === "absent") newStatus = "late";
    else if (currentStatus === "late") newStatus = "delete";

    try {
      await api.put(`/attendance/${studentId}`, { 
        data: { date: fullDateString, status: newStatus } 
      });
      fetchAttendance(); // refresh quietly
    } catch (err) {
      toast.error("Failed to update cell");
    }
  };

  const handleExportExcel = () => {
    const data = gridDays.map(d => {
      const record = attendanceRecords.find(a => a.date === d.fullDateString);
      let status = "-";
      if (d.isWeekend) status = "Weekend";
      else if (d.isPublicHoliday) status = "Holiday";
      else if (record) status = record.status.charAt(0).toUpperCase() + record.status.slice(1);
      
      return {
        Date: d.fullDateString,
        Day: d.dayName,
        Status: status
      };
    });
    exportToExcel(data, `Attendance_${activeStudent.name}_${gridMonth}`);
  };

  const handleExportPDF = () => {
    const columns = ["Date", "Day", "Status"];
    const data = gridDays.map(d => {
      const record = attendanceRecords.find(a => a.date === d.fullDateString);
      let status = "-";
      if (d.isWeekend) status = "Weekend";
      else if (d.isPublicHoliday) status = "Holiday";
      else if (record) status = record.status.charAt(0).toUpperCase() + record.status.slice(1);
      
      return [d.fullDateString, d.dayName, status];
    });
    exportToPDF(columns, data, `Attendance_${activeStudent.name}_${gridMonth}`, `Attendance History - ${activeStudent.name} (${gridMonth})`);
  };

  if (!activeStudent) {
    return <div style={{ padding: "2rem" }}>Loading student data...</div>;
  }

  const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
  const lateCount = attendanceRecords.filter(a => a.status === 'late').length;
  const absentCount = attendanceRecords.filter(a => a.status === 'absent').length;

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ padding: "8px" }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: "700", color: "white" }}>
            {activeStudent.name.charAt(0)}
          </div>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", lineHeight: 1 }}>{activeStudent.name}</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>Detailed Attendance History</p>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <label style={{ fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={18} /> Month:
          </label>
          <input 
            type="month" 
            className="input-glass" 
            value={gridMonth} 
            onChange={(e) => setGridMonth(e.target.value)} 
          />
        </div>

        <div style={{ display: "flex", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "#10b981" }}>{presentCount}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Present</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "#f59e0b" }}>{lateCount}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Late</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "#ef4444" }}>{absentCount}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Absent</span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem", borderLeft: "1px solid rgba(0,0,0,0.1)", paddingLeft: "1rem", alignItems: "center" }}>
            <button onClick={handleExportExcel} className="btn-ghost" style={{ padding: "8px", display: "flex", alignItems: "center", gap: "0.5rem" }} title="Export Excel">
              <FileSpreadsheet size={18} />
            </button>
            <button onClick={handleExportPDF} className="btn-ghost" style={{ padding: "8px", display: "flex", alignItems: "center", gap: "0.5rem" }} title="Export PDF">
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", fontSize: "12px", fontWeight: "600" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "#10b981", borderRadius: "2px" }}></div> Present</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "#f59e0b", borderRadius: "2px" }}></div> Late</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "#ef4444", borderRadius: "2px" }}></div> Absent</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10b981", borderRadius: "2px" }}></div> Holiday</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "12px", height: "12px", background: "rgba(0,0,0,0.05)", borderRadius: "2px" }}></div> Weekend</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "8px" }}>
          {gridDays.map(day => {
            const record = attendanceRecords.find(a => a.date === day.fullDateString);
            const status = record ? record.status : null;
            
            let cellBg = "rgba(0,0,0,0.02)";
            let cellColor = "var(--text-primary)";
            let borderColor = "rgba(0,0,0,0.05)";
            let label = "-";
            
            if (day.isWeekend) {
              cellBg = "rgba(0,0,0,0.05)";
              borderColor = "transparent";
              label = "W";
            } else if (day.isPublicHoliday) {
              cellBg = "rgba(16, 185, 129, 0.1)";
              cellColor = "#10b981";
              borderColor = "#10b981";
              label = "H";
            } else {
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
            }
            
            return (
              <div 
                key={day.dateNumber} 
                onClick={() => !day.isWeekend && !day.isPublicHoliday && handleGridCellClick(day.fullDateString, status)}
                className={(!day.isWeekend && !day.isPublicHoliday) ? "hover-bg" : ""}
                style={{ 
                  padding: "10px", 
                  borderRadius: "8px",
                  border: `1px solid ${borderColor}`, 
                  background: cellBg,
                  color: cellColor,
                  cursor: day.isWeekend || day.isPublicHoliday ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "80px"
                }}
                title={day.isPublicHoliday ? "Public Holiday" : `Click to toggle attendance for ${day.fullDateString}`}
              >
                <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>{day.dateNumber}</div>
                <div style={{ fontSize: "10px", opacity: 0.8, textTransform: "uppercase" }}>{day.dayName}</div>
                <div style={{ marginTop: "auto", fontWeight: "800", fontSize: "14px" }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AttendanceStudentView;
