import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import { ChevronLeft, Download } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { formatDate } from "../components/DateRangePicker";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const AttendanceFilteredView = () => {
  const { statusId } = useParams(); // 'present', 'absent', 'late', 'not-marked'
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { users, classes, loadingUsers } = useSelector((state) => state.data);

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  // We only look at today's snapshot for this filtered view
  const todayString = formatDate(new Date());

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
    if (classes.length === 0) dispatch(fetchClasses());
  }, [dispatch, users.length, classes.length]);

  const fetchAttendance = async () => {
    try {
      setLoadingAttendance(true);
      const res = await api.get('/attendance', {
        params: { startDate: todayString, endDate: todayString }
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
  }, []);

  const filteredStudents = useMemo(() => {
    if (!users || !classes) return [];
    
    // First, map students to their status and class info
    const studentsWithStatus = users
      .filter(u => u.type === 'student')
      .map(user => {
        const record = attendanceRecords.find(a => a.student_id === user.id);
        const status = record ? record.status : "not-marked";
        
        // Find their class
        let classStr = "Unassigned";
        if (user.classes && user.classes.length > 0) {
          const cls = classes.find(c => c.id === user.classes[0]);
          if (cls) classStr = `${cls.className} - ${cls.section}`;
        }

        return {
          ...user,
          status,
          classStr
        };
      });

    // Filter by the selected statusId
    return studentsWithStatus.filter(u => u.status === statusId);
  }, [users, classes, attendanceRecords, statusId]);

  const handleSingleUpdate = async (userId, newStatus) => {
    try {
      await api.put(`/attendance/${userId}`, { 
        data: { date: todayString, status: newStatus } 
      });
      fetchAttendance(); // refresh the records to potentially remove them from this list
      toast.success(`Attendance updated to ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update attendance");
    }
  };

  const statusDisplayNames = {
    'present': 'Present Today',
    'absent': 'Absent Today',
    'late': 'Late Today',
    'not-marked': 'Not Marked Today'
  };

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) return toast.warn("No data to export");
    const dataToExport = filteredStudents.map(student => ({
      "Student Name": student.name,
      "Class": student.classStr,
      "Status": student.status === 'not-marked' ? 'Not Marked' : student.status.toUpperCase()
    }));
    exportToExcel(dataToExport, `Students_${statusId}_${todayString}`, `Students ${statusDisplayNames[statusId] || statusId} - ${todayString}`);
  };

  const handleExportPDF = async () => {
    if (filteredStudents.length === 0) return toast.warn("No data to export");
    const columns = ["Student Name", "Class", "Status"];
    const dataToExport = filteredStudents.map(student => [
      student.name,
      student.classStr,
      student.status === 'not-marked' ? 'Not Marked' : student.status.toUpperCase()
    ]);
    await exportToPDF(columns, dataToExport, `Students_${statusId}_${todayString}`, `Students ${statusDisplayNames[statusId] || statusId} - ${todayString}`);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => navigate("/attendance")} className="btn btn-ghost" style={{ padding: "8px" }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", textTransform: "capitalize" }}>
              Students {statusDisplayNames[statusId] || statusId}
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Showing {filteredStudents.length} students across the entire school
            </p>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={handleExportExcel} className="btn btn-ghost" title="Export to Excel">
            <Download size={18} /> Excel
          </button>
          <button onClick={handleExportPDF} className="btn btn-ghost" title="Export to PDF">
            <Download size={18} /> PDF
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr>
                <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>Student Name</th>
                <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>Class</th>
                <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>Status</th>
                <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.1)", textAlign: "right" }}>Update Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers || loadingAttendance ? (
                <tr><td colSpan={4} style={{ padding: "2rem", textAlign: "center" }}>Loading...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No students match this status.</td></tr>
              ) : (
                filteredStudents.map(user => (
                  <tr key={user.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", cursor: "pointer" }} onClick={() => navigate(`/attendance/student/${user.id}`)}>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: "500" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {user.name.charAt(0)}
                        </div>
                        {user.name}
                      </div>
                    </td>
                    
                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                      {user.classStr}
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <span style={{ 
                        padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500", textTransform: "capitalize",
                        background: user.status === "present" ? "rgba(16, 185, 129, 0.2)" : user.status === "late" ? "rgba(245, 158, 11, 0.2)" : user.status === "absent" ? "rgba(239, 68, 68, 0.2)" : "rgba(0,0,0,0.08)",
                        color: user.status === "present" ? "#10b981" : user.status === "late" ? "#f59e0b" : user.status === "absent" ? "#ef4444" : "var(--text-secondary)"
                      }}>
                        {user.status === 'not-marked' ? 'Not Marked' : user.status}
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

export default AttendanceFilteredView;
