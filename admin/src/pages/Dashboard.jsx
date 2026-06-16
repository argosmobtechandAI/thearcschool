import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Users, GraduationCap, Calendar, CreditCard, UserPlus, BookOpen, Clock, UserCheck } from "lucide-react";
import api from "../services/api";
import { setDashboardLoading, setDashboardStats, setDashboardTopper } from "../features/dashboardSlice";
import { formatDate } from "../components/DateRangePicker";

const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
  <div 
    className="glass-card" 
    style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem", cursor: onClick ? "pointer" : "default", transition: "transform 0.2s" }}
    onClick={onClick}
    onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = "scale(1.02)")}
    onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = "scale(1)")}
  >
    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: `rgba(${color}, 0.15)`, color: `rgb(${color})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={24} />
    </div>
    <div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</p>
      <h3 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-primary)" }}>{value}</h3>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state) => state.auth);
  // Pulling state directly from the simple Redux slice
  const { stats, topper, loading } = useSelector((state) => state.dashboard);

  useEffect(() => {
    const fetchDashboardData = async () => {
      dispatch(setDashboardLoading(true));
      try {
        const today = formatDate(new Date());
        
        // Run all API calls concurrently for speed
        const [
          { data: userData },
          { data: classData },
          { data: newUserData },
          { data: feeData },
          { data: eventData },
          { data: attendanceData }
        ] = await Promise.all([
          api.get("/user/getUser").catch(() => ({ data: { users: [] } })),
          api.get("/class/getClass").catch(() => ({ data: { classes: [] } })),
          api.get("/newUser/getAllNewUser").catch(() => ({ data: { users: [] } })),
          api.get("/fees/getFees").catch(() => ({ data: { fees: [] } })),
          api.get("/events/getAllEvents").catch(() => ({ data: { events: [] } })),
          api.get("/user/attendance", { params: { startDate: today, endDate: today } }).catch(() => ({ data: { records: [] } }))
        ]);

        const users = userData?.users || [];
        const classes = classData?.classes || [];
        const newUsers = newUserData?.users || newUserData?.data || [];
        const fees = feeData?.fees || [];
        const events = eventData?.events || eventData?.data || [];
        const attendanceRecords = attendanceData?.records || [];

        // Calculate "Present Today" by counting students whose status is present
        // First get student IDs to ensure we only count students
        const studentIds = new Set(users.filter(u => u.type === 'student').map(u => u.id));
        const presentToday = attendanceRecords.filter(a => a.status === 'present' && studentIds.has(a.student_id)).length;

        dispatch(setDashboardStats({
          totalStudents: users.filter(u => u.type === 'student').length,
          totalTeachers: users.filter(u => u.type === 'teacher').length,
          totalParents: users.filter(u => u.type === 'parent').length,
          pendingAdmissions: newUsers.filter(u => u.status === 'Pending').length,
          pendingFees: fees.filter(f => f.status === 'Pending').reduce((acc, f) => acc + (Number(f.amount) || 0), 0),
          collectedFees: fees.filter(f => f.status === 'Paid').reduce((acc, f) => acc + (Number(f.amount) || 0), 0),
          activeClasses: classes.length,
          eventsToday: events.filter(e => e.date === today).length,
          presentToday: presentToday
        }));
        
        try {
          const { data: topperData } = await api.get("/user/getTopper");
          if (topperData?.success && topperData.topper) {
            dispatch(setDashboardTopper({ name: topperData.topper.name, score: topperData.score }));
          }
        } catch (e) {
          console.error("No topper found");
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        dispatch(setDashboardLoading(false));
      }
    };

    fetchDashboardData();
  }, [dispatch]);

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "0.5rem" }}>Dashboard Overview</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Welcome back, {user?.name || "Admin"}! Here is what's happening today.</p>
      </div>

      <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Users size={18} color="var(--accent-primary)"/> People & Attendance
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard title="Total Students" value={loading ? "..." : stats.totalStudents} icon={Users} color="59, 130, 246" onClick={() => navigate("/users/student")} />
        <StatCard title="Present Today" value={loading ? "..." : `${stats.presentToday} / ${stats.totalStudents}`} icon={UserCheck} color="16, 185, 129" onClick={() => navigate("/attendance")} />
        <StatCard title="Total Teachers" value={loading ? "..." : stats.totalTeachers} icon={BookOpen} color="168, 85, 247" onClick={() => navigate("/users/teacher")} />
        <StatCard title="Total Parents" value={loading ? "..." : stats.totalParents} icon={Users} color="245, 158, 11" onClick={() => navigate("/users/parent")} />
        <StatCard title="Pending Admissions" value={loading ? "..." : stats.pendingAdmissions} icon={UserPlus} color="239, 68, 68" onClick={() => navigate("/admissions")} />
      </div>

      <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <CreditCard size={18} color="var(--accent-primary)"/> Operations & Financials
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard title="Collected Fees" value={loading ? "..." : `₹${stats.collectedFees}`} icon={CreditCard} color="16, 185, 129" onClick={() => navigate("/fees")} />
        <StatCard title="Pending Fees" value={loading ? "..." : `₹${stats.pendingFees}`} icon={Clock} color="245, 158, 11" onClick={() => navigate("/fees")} />
        <StatCard title="Active Classes" value={loading ? "..." : stats.activeClasses} icon={GraduationCap} color="14, 165, 233" onClick={() => navigate("/classes")} />
        <StatCard title="Events Today" value={loading ? "..." : stats.eventsToday} icon={Calendar} color="236, 72, 153" onClick={() => navigate("/events")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
            Needs Attention
          </h3>
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            {stats.pendingAdmissions > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
                <div 
                  onClick={() => navigate("/admissions")}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "1rem", borderRadius: "12px", display: "flex", alignItems: "center", gap: "1rem", width: "100%", justifyContent: "center", cursor: "pointer", transition: "transform 0.2s" }}
                >
                  <UserPlus size={24} />
                  <div>
                    <h4 style={{ fontWeight: "700", fontSize: "1.1rem" }}>{stats.pendingAdmissions} Pending Admissions</h4>
                    <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>Require review</p>
                  </div>
                </div>
              </div>
            ) : (
              "You're all caught up! No urgent tasks pending."
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
            Topper of the Month
          </h3>
          {topper ? (
            <div style={{ padding: "1rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "2rem", boxShadow: "0 4px 20px rgba(99, 102, 241, 0.2)" }}>
                {topper.name?.charAt(0)}
              </div>
              <div>
                <h4 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary)" }}>{topper.name}</h4>
                <p style={{ color: "var(--accent-primary)", fontWeight: "600", marginTop: "0.25rem", fontSize: "1.1rem" }}>Score: {topper.score}</p>
              </div>
            </div>
          ) : (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
              No top performer data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
