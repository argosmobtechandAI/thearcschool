import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import { ChevronLeft, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { formatDate } from "../components/DateRangePicker";

const AttendanceClassView = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { users, classes, loadingUsers } = useSelector((state) => state.data);

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
    if (classes.length === 0) dispatch(fetchClasses());
  }, [dispatch, users.length, classes.length]);

  const fetchAttendance = async () => {
    try {
      setLoadingAttendance(true);
      const res = await api.get('/user/attendance', {
        params: { startDate: selectedDate, endDate: selectedDate }
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
  }, [selectedDate]);

  const activeClass = useMemo(() => classes.find(c => c.id === Number(classId)), [classes, classId]);
  
  const classStudents = useMemo(() => {
    return users
      .filter(u => u.type === 'student' && u.classes && u.classes.includes(Number(classId)))
      .map(user => {
        const record = attendanceRecords.find(a => a.student_id === user.id);
        return {
          ...user,
          status: record ? record.status : "not marked"
        };
      });
  }, [users, classId, attendanceRecords]);

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
      await api.post('/user/attendance/bulk', { data: records });
      toast.success("All students marked as Present!");
      fetchAttendance(); // refresh
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark all present");
    }
  };

  const handleSingleUpdate = async (userId, status) => {
    try {
      await api.put(`/user/updateAttendace/${userId}`, { 
        data: { date: selectedDate, status } 
      });
      fetchAttendance(); // refresh
      toast.success("Attendance updated");
    } catch (err) {
      toast.error("Failed to update attendance");
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
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <label style={{ fontWeight: "600" }}>Date:</label>
          <input 
            type="date" 
            className="input-glass" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
          />
        </div>
        
        <button onClick={handleMarkAllPresent} className="btn" style={{ background: "#10b981", color: "white", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle size={18} /> Mark All Present
        </button>
      </div>

      <div className="glass-panel">
        <div style={{ overflowX: "auto" }}>
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
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                            background: "transparent", color: "#10b981", fontSize: "12px", fontWeight: "600",
                            cursor: "pointer", transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => { e.target.style.background = "#10b981"; e.target.style.color = "white"; }}
                          onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "#10b981"; }}
                        >
                          Present
                        </button>
                        <button 
                          onClick={() => handleSingleUpdate(user.id, "late")}
                          style={{ 
                            padding: "4px 12px", borderRadius: "6px", border: "1px solid #f59e0b",
                            background: "transparent", color: "#f59e0b", fontSize: "12px", fontWeight: "600",
                            cursor: "pointer", transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => { e.target.style.background = "#f59e0b"; e.target.style.color = "white"; }}
                          onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "#f59e0b"; }}
                        >
                          Late
                        </button>
                        <button 
                          onClick={() => handleSingleUpdate(user.id, "absent")}
                          style={{ 
                            padding: "4px 12px", borderRadius: "6px", border: "1px solid #ef4444",
                            background: "transparent", color: "#ef4444", fontSize: "12px", fontWeight: "600",
                            cursor: "pointer", transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => { e.target.style.background = "#ef4444"; e.target.style.color = "white"; }}
                          onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "#ef4444"; }}
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
        </div>
      </div>
    </div>
  );
};

export default AttendanceClassView;
