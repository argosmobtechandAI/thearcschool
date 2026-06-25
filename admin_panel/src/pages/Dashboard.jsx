import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Users, GraduationCap, Calendar, CreditCard, BookOpen, Clock, UserCheck, Building } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import api from "../services/api";
import { setDashboardLoading, setDashboardStats, setDashboardTopper, setFeeStatusFilter } from "../features/dashboardSlice";
import DateRangePicker, { formatDate } from "../components/DateRangePicker";
import { useNavigate } from "react-router";

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
    <div style={{ display: "flex", flexDirection: "column" }}>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</p>
      <h3 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-primary)" }}>{value}</h3>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [admissionData, setAdmissionData] = useState([]);
  const [studentOfWeekList, setStudentOfWeekList] = useState([]);
  
  const { user } = useSelector((state) => state.auth);
  // Pulling state directly from the simple Redux slice
  const { stats, topper, loading, globalDateRange } = useSelector((state) => state.dashboard);
  const startDate = globalDateRange?.start || "";
  const endDate = globalDateRange?.end || "";

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
          { data: attendanceData },
          { data: roomData }
        ] = await Promise.all([
          api.get("/admin_panel/users").catch(() => ({ data: { users: [] } })),
          api.get("/admin_panel/class/getClass").catch(() => ({ data: { classes: [] } })),
          api.get("/admission_panel/getAllNewUser").catch(() => ({ data: { data: [] } })),
          api.get("/finance_panel/dashboardStats").catch(() => ({ data: { stats: {} } })),
          api.get("/admin_panel/planner").catch(() => ({ data: { data: [] } })),
          api.get("/attendance", { params: { startDate: today, endDate: today } }).catch(() => ({ data: { records: [] } })),
          api.get("/rooms/getRooms").catch(() => ({ data: { rooms: [] } }))
        ]);

        const users = userData?.users || [];
        const classes = classData?.classes || [];
        const feeStats = feeData?.stats || {};
        const events = eventData?.data || [];
        const attendanceRecords = attendanceData?.records || [];
        const rooms = roomData?.rooms || [];
        const allAdmissions = newUserData?.data || [];
        setAdmissionData(allAdmissions);

        // Calculate "Present Today" by counting students whose status is present
        // First get student IDs to ensure we only count students
        const studentIds = new Set(users.filter(u => u.type === 'student').map(u => u.id));
        const presentToday = attendanceRecords.filter(a => a.status === 'present' && studentIds.has(a.student_id)).length;

        const totalCounselors = users.filter(u => u.type === 'admission').length;
        const totalProspects = allAdmissions.filter(u => u.status === 'Pending').length;

        dispatch(setDashboardStats({
          totalStudents: users.filter(u => u.type === 'student').length,
          totalTeachers: users.filter(u => u.type === 'teacher').length,
          totalParents: users.filter(u => u.type === 'parent').length,
          totalCounselors,
          totalProspects,
          pendingFees: feeStats.balance || 0,
          collectedFees: feeStats.totalPaid || 0,
          activeClasses: classes.length,
          eventsToday: events.filter(e => e.start_date === today).length,
          presentToday: presentToday,
          totalRooms: rooms.length
        }));
        
        try {
          const { data: topperData } = await api.get("/user/getTopper");
          if (topperData?.success && topperData.topper) {
            dispatch(setDashboardTopper({ name: topperData.topper.name, score: topperData.score }));
          }
        } catch (e) {
          console.error("No topper found");
        }
        
        try {
          const { data: sowData } = await api.get("/admin/student-of-week");
          if (sowData?.success && sowData.data) {
            setStudentOfWeekList(sowData.data.slice(0, 3));
          }
        } catch (e) {
          console.error("No student of week found");
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        dispatch(setDashboardLoading(false));
      }
    };

    fetchDashboardData();
  }, [dispatch]);

  const filteredAdmissions = admissionData.filter(u => {
    if (!startDate || !endDate) return true;
    const date = new Date(u.created_at);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  });

  const admissionStats = [
    { name: 'Total Applicants', count: filteredAdmissions.length, fill: '#6366f1' },
    { name: 'Prospects (Pending)', count: filteredAdmissions.filter(u => u.status === 'Pending').length, fill: '#f59e0b' },
    { name: 'Admitted', count: filteredAdmissions.filter(u => u.status === 'Approved').length, fill: '#10b981' },
    { name: 'Rejected', count: filteredAdmissions.filter(u => u.status === 'Rejected').length, fill: '#ef4444' }
  ];

  const userDistributionStats = [
    { subject: 'Students', A: stats.totalStudents || 0, fullMark: Math.max(stats.totalStudents || 10, 50) },
    { subject: 'Teachers', A: stats.totalTeachers || 0, fullMark: Math.max(stats.totalTeachers || 10, 50) },
    { subject: 'Parents', A: stats.totalParents || 0, fullMark: Math.max(stats.totalParents || 10, 50) },
    { subject: 'Counselors', A: stats.totalCounselors || 0, fullMark: Math.max(stats.totalCounselors || 10, 50) },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "0.5rem" }}>Dashboard Overview</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Welcome back, {user?.name || "Admin"}! Here is what's happening today.</p>
        </div>
        <DateRangePicker 
          startDate={startDate}
          endDate={endDate}
          setStartDate={(s) => dispatch({ type: 'dashboard/setGlobalDateRange', payload: { start: s, end: endDate } })}
          setEndDate={(e) => dispatch({ type: 'dashboard/setGlobalDateRange', payload: { start: startDate, end: e } })}
          onRangeChange={(range) => dispatch({ type: 'dashboard/setGlobalDateRange', payload: range })}
          defaultRange="mtd"
        />
      </div>

      {(user?.type === "admin" || user?.type === "principal") && (
        <>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Users size={18} color="var(--accent-primary)"/> People Overview
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <StatCard title="Total Students" value={loading ? "..." : stats.totalStudents} icon={Users} color="99, 102, 241" onClick={() => navigate("/users/student")} />
            <StatCard title="Present Today" value={loading ? "..." : `${stats.presentToday || 0} / ${stats.totalStudents || 0}`} icon={UserCheck} color="16, 185, 129" onClick={() => navigate("/attendance")} />
            <StatCard title="Total Teachers" value={loading ? "..." : stats.totalTeachers} icon={BookOpen} color="168, 85, 247" onClick={() => navigate("/users/teacher")} />
            <StatCard title="Total Parents" value={loading ? "..." : stats.totalParents} icon={Users} color="245, 158, 11" onClick={() => navigate("/users/parent")} />
            <StatCard title="Active Counselors" value={loading ? "..." : stats.totalCounselors} icon={UserCheck} color="14, 165, 233" onClick={() => navigate("/users/admission")} />
            <StatCard title="Active Prospects" value={loading ? "..." : stats.totalProspects} icon={UserCheck} color="236, 72, 153" onClick={() => navigate("/admissions")} />
          </div>
        </>
      )}

      {(user?.type === "admin" || user?.type === "principal" || user?.type === "finance") && (
        <>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CreditCard size={18} color="var(--accent-primary)"/> Operations & Financials
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <StatCard title="Collected Fees" value={loading ? "..." : `₹${stats.collectedFees}`} icon={CreditCard} color="16, 185, 129" onClick={() => navigate("/fees")} />
            <StatCard title="Pending Fees" value={loading ? "..." : `₹${stats.pendingFees}`} icon={Clock} color="245, 158, 11" onClick={() => {
              dispatch(setFeeStatusFilter("Defaulters"));
              navigate("/fees");
            }} />
            {(user?.type === "admin" || user?.type === "principal") && (
              <>
                <StatCard title="Active Classes" value={loading ? "..." : stats.activeClasses} icon={GraduationCap} color="14, 165, 233" onClick={() => navigate("/classes")} />
                <StatCard title="Total Rooms" value={loading ? "..." : stats.totalRooms} icon={Building} color="99, 102, 241" onClick={() => navigate("/rooms")} />
                <StatCard title="Events Today" value={loading ? "..." : stats.eventsToday} icon={Calendar} color="236, 72, 153" onClick={() => navigate("/annual-planner")} />
              </>
            )}
          </div>
        </>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {(user?.type === "admin" || user?.type === "principal") && (
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <UserCheck size={20} color="var(--accent-primary)" /> Student of the Week
            </h3>
            <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
              {studentOfWeekList.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {studentOfWeekList.map(record => (
                    <div key={record.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "var(--glass-bg)", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                      <div>
                        <p style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "0.95rem" }}>{record.student?.name}</p>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Class {record.class?.name} - {record.class?.section}</p>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--accent-primary)", fontWeight: "500", background: "var(--accent-light)", padding: "0.25rem 0.5rem", borderRadius: "12px" }}>Awarded</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "1rem 0", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p>Manage and review the Student of the Week awards for all classes.</p>
                </div>
              )}
              <div style={{ marginTop: "auto", display: "flex", justifyContent: "center" }}>
                <button 
                  onClick={() => navigate("/student-of-week")}
                  className="btn btn-primary"
                  style={{ fontSize: "0.9rem", padding: "0.6rem 1.2rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  Manage Awards
                </button>
              </div>
            </div>
          </div>
        )}

        {(user?.type === "admin" || user?.type === "principal") && (
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
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "1rem" }}>
        {/* Admissions Waterfall Chart */}
        <div className="glass-panel" style={{ marginTop: "1rem", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <UserCheck size={20} color="var(--accent-primary)" /> Admissions Pipeline
            </h3>
            <button 
              onClick={() => navigate("/admissions")}
              className="btn btn-secondary"
              style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
            >
              Manage Admissions
            </button>
          </div>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={admissionStats}
                margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="var(--text-primary)" fontWeight={600} tickMargin={10} />
                <YAxis stroke="var(--text-secondary)" />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={60}>
                  {admissionStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Distribution Radar Chart */}
        <div className="glass-panel" style={{ marginTop: "1rem", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={20} color="var(--accent-primary)" /> User Distribution
            </h3>
          </div>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={userDistributionStats}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" stroke="var(--text-primary)" fontWeight={600} />
                <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} stroke="var(--text-secondary)" />
                <Radar name="Users" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                <RechartsTooltip 
                  contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
