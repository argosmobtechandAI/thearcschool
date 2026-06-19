import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import { Users, UserX, Clock, HelpCircle, ChevronRight, PieChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";
import { formatDate } from "../components/DateRangePicker";

const Attendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { users, classes, loadingUsers } = useSelector((state) => state.data);

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const todayString = formatDate(new Date());

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
    if (classes.length === 0) dispatch(fetchClasses());
  }, [dispatch, users.length, classes.length]);

  const fetchAttendance = async () => {
    try {
      setLoadingAttendance(true);
      const res = await api.get('/user/attendance', {
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

    return {
      studentPercentage: studentTotal ? Math.round((studentPresent / studentTotal) * 100) : 0,
      studentPresent,
      studentAbsent,
      studentLate,
      studentNotMarked,
      studentTotal,
    };
  }, [users, attendanceRecords]);

  const groupedClasses = useMemo(() => {
    if (!classes || !users) return {};
    
    const classStats = classes.map(cls => {
      const classStudents = users.filter(u => u.type === 'student' && u.classes && u.classes.includes(cls.id));
      const total = classStudents.length;
      const present = classStudents.filter(u => 
        attendanceRecords.some(a => a.student_id === u.id && a.status === 'present')
      ).length;
      
      return {
        id: cls.id,
        className: cls.className,
        section: cls.section,
        total,
        present,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0
      };
    }).sort((a, b) => a.section.localeCompare(b.section)); // Sort sections within group

    const groups = {};
    classStats.forEach(cls => {
      if (!groups[cls.className]) {
        groups[cls.className] = [];
      }
      groups[cls.className].push(cls);
    });
    
    // Sort group keys logically if possible (e.g., Nursery, KG, 1, 2...)
    // For now, just rely on natural order or a predefined sort if needed.
    return groups;
  }, [classes, users, attendanceRecords]);

  const getPercentageColor = (pct) => {
    if (pct >= 85) return "#10b981";
    if (pct >= 70) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Student Attendance Dashboard</h1>
          <p style={{ color: "var(--text-secondary)" }}>Snapshot of today's attendance metrics</p>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        
        {/* Present */}
        <div onClick={() => navigate('/attendance/status/present')} className="glass-card hover-bg" style={{ padding: "1.5rem", borderLeft: "4px solid #10b981", cursor: "pointer", transition: "transform 0.2s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase" }}>Present Today</p>
              <h2 style={{ fontSize: "2rem", fontWeight: "700", margin: "0.5rem 0", color: "#10b981" }}>
                {stats.studentPercentage}%
              </h2>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                {stats.studentPresent} out of {stats.studentTotal}
              </p>
            </div>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
              <Users size={24} />
            </div>
          </div>
        </div>

        {/* Absent */}
        <div onClick={() => navigate('/attendance/status/absent')} className="glass-card hover-bg" style={{ padding: "1.5rem", borderLeft: "4px solid #ef4444", cursor: "pointer", transition: "transform 0.2s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase" }}>Absent Today</p>
              <h2 style={{ fontSize: "2rem", fontWeight: "700", margin: "0.5rem 0", color: "#ef4444" }}>
                {stats.studentAbsent}
              </h2>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                Students missing
              </p>
            </div>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
              <UserX size={24} />
            </div>
          </div>
        </div>

        {/* Late */}
        <div onClick={() => navigate('/attendance/status/late')} className="glass-card hover-bg" style={{ padding: "1.5rem", borderLeft: "4px solid #f59e0b", cursor: "pointer", transition: "transform 0.2s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase" }}>Late Today</p>
              <h2 style={{ fontSize: "2rem", fontWeight: "700", margin: "0.5rem 0", color: "#f59e0b" }}>
                {stats.studentLate}
              </h2>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                Students arrived late
              </p>
            </div>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
              <Clock size={24} />
            </div>
          </div>
        </div>

        {/* Not Marked */}
        <div onClick={() => navigate('/attendance/status/not-marked')} className="glass-card hover-bg" style={{ padding: "1.5rem", borderLeft: "4px solid #8b5cf6", cursor: "pointer", transition: "transform 0.2s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase" }}>Not Marked</p>
              <h2 style={{ fontSize: "2rem", fontWeight: "700", margin: "0.5rem 0", color: "#8b5cf6" }}>
                {stats.studentNotMarked}
              </h2>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                Pending submission
              </p>
            </div>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
              <HelpCircle size={24} />
            </div>
          </div>
        </div>

      </div>

      <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem" }}>Classes Overview</h2>

      {loadingUsers || loadingAttendance ? (
        <div style={{ padding: "2rem", textAlign: "center" }}>Loading class metrics...</div>
      ) : Object.keys(groupedClasses).length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No classes found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {Object.entries(groupedClasses).sort(([a], [b]) => a.localeCompare(b)).map(([className, sections]) => (
            <div key={className} style={{ background: "rgba(0,0,0,0.02)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "4px", height: "24px", background: "var(--primary-gradient)", borderRadius: "2px" }}></span>
                Class {className}
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {sections.map(cls => (
                  <div 
                    key={cls.id} 
                    onClick={() => navigate(`/attendance/class/${cls.id}`)}
                    className="glass-card hover-bg animate-fade-in" 
                    style={{ padding: "1.25rem", cursor: "pointer", transition: "transform 0.2s" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <div>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Section {cls.section}</h4>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{cls.total} Students</p>
                      </div>
                      <div style={{ 
                        background: `rgba(${cls.percentage >= 85 ? '16, 185, 129' : cls.percentage >= 70 ? '245, 158, 11' : '239, 68, 68'}, 0.1)`, 
                        color: getPercentageColor(cls.percentage),
                        padding: "6px 12px", 
                        borderRadius: "20px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.875rem"
                      }}>
                        <PieChart size={14} /> {cls.percentage}%
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                      <span>Present: {cls.present}</span>
                    </div>
                    
                    <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden", marginBottom: "1rem" }}>
                      <div style={{ 
                        height: "100%", 
                        width: `${cls.percentage}%`, 
                        background: getPercentageColor(cls.percentage),
                        transition: "width 1s ease-in-out"
                      }} />
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#3b82f6", fontSize: "0.875rem", fontWeight: "600" }}>
                      <span>Manage Attendance</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Attendance;
