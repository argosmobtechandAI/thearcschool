import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  CreditCard, 
  BookOpen, 
  Clock, 
  UserCheck, 
  Building, 
  Sparkles, 
  Award, 
  TrendingUp,
  FileSignature,
  FileEdit,
  FileText,
  ClipboardCheck,
  MessageSquare,
  Image as ImageIcon
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import api from "../services/api";
import { setDashboardLoading, setDashboardStats, setDashboardTopper, setFeeStatusFilter } from "../features/dashboardSlice";
import DateRangePicker, { formatDate } from "../components/DateRangePicker";
import { useNavigate } from "react-router";

const StatCard = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
  <div 
    className="glass-card table-row-hover" 
    style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "0.75rem", 
      padding: "0.8rem 0.95rem", 
      cursor: onClick ? "pointer" : "default", 
      transition: "transform 0.2s, box-shadow 0.2s", 
      borderRadius: "10px" 
    }}
    onClick={onClick}
    onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = "translateY(-2px)")}
    onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = "translateY(0)")}
    title={onClick ? `Click to view ${title}` : undefined}
  >
    <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: `rgba(${color}, 0.14)`, color: `rgb(${color})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={19} strokeWidth={2.3} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", marginBottom: "0.15rem", textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {title}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
        <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>
          {value}
        </h3>
        {subtitle && (
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: "600", whiteSpace: "nowrap" }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [admissionData, setAdmissionData] = useState([]);
  const [studentOfWeekList, setStudentOfWeekList] = useState([]);
  const [spotlightOfToday, setSpotlightOfToday] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState({
    consentsCount: 0,
    courseworkCount: 0,
    examsCount: 0,
    circularsCount: 0,
    galleryCount: 0,
  });
  
  const { user } = useSelector((state) => state.auth);
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
          { data: roomData },
          { data: consentsData },
          { data: courseData },
          { data: examsData },
          { data: circularsData },
          { data: galleryData }
        ] = await Promise.all([
          api.get("/admin_panel/users").catch(() => ({ data: { users: [] } })),
          api.get("/admin_panel/class/getClass").catch(() => ({ data: { classes: [] } })),
          api.get("/admission_panel/getAllNewUser").catch(() => ({ data: { data: [] } })),
          api.get("/finance_panel/dashboardStats").catch(() => ({ data: { stats: {} } })),
          api.get("/admin_panel/planner").catch(() => ({ data: { data: [] } })),
          api.get("/attendance", { params: { startDate: today, endDate: today } }).catch(() => ({ data: { records: [] } })),
          api.get("/rooms/getRooms").catch(() => ({ data: { rooms: [] } })),
          api.get("/admin_panel/consents/admin").catch(() => ({ data: { data: [] } })),
          api.get("/course").catch(() => ({ data: { data: [] } })),
          api.get("/admin_panel/exams").catch(() => ({ data: { data: [] } })),
          api.get("/circulars").catch(() => ({ data: { data: [] } })),
          api.get("/gallery").catch(() => ({ data: { data: [] } }))
        ]);

        const users = userData?.users || [];
        const classes = classData?.classes || [];
        const feeStats = feeData?.stats || {};
        const events = eventData?.data || [];
        const attendanceRecords = attendanceData?.records || [];
        const rooms = roomData?.rooms || [];
        const allAdmissions = newUserData?.data || [];
        const consents = consentsData?.data || [];
        const courses = courseData?.data || courseData?.courses || (Array.isArray(courseData) ? courseData : []);
        const exams = examsData?.data || [];
        const circulars = circularsData?.data || circularsData?.circulars || [];
        const gallery = galleryData?.data || [];

        setAdmissionData(allAdmissions);
        setDashboardMetrics({
          consentsCount: consents.length,
          courseworkCount: courses.length,
          examsCount: exams.length,
          circularsCount: circulars.length,
          galleryCount: gallery.length,
        });

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

        try {
          const { data: spotlightRes } = await api.get("/spotlight/today");
          if (spotlightRes?.success && spotlightRes.data) {
            setSpotlightOfToday(spotlightRes.data);
          }
        } catch (e) {
          console.error("No spotlight found today");
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
    <div className="animate-fade-in" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.15rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.65rem", fontWeight: "800", marginBottom: "0.2rem", letterSpacing: "-0.02em" }}>Dashboard Overview</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Welcome back, {user?.name || "Admin"}! Here is what's happening today.</p>
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
      
      {/* Spotlight of the Day Banner */}
      {spotlightOfToday && (
        <div className="glass-panel" style={{ padding: "1rem 1.25rem", display: "flex", gap: "1.25rem", alignItems: "center", border: "1px solid rgba(99, 102, 241, 0.3)", background: "rgba(99, 102, 241, 0.04)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(99, 102, 241, 0.15)", color: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", color: "var(--primary-color)", letterSpacing: "0.08em" }}>Spotlight of the Day</span>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)", marginTop: "0.15rem", marginBottom: "0.3rem" }}>{spotlightOfToday.title}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.4", margin: 0 }}>{spotlightOfToday.description}</p>
          </div>
          {spotlightOfToday.image_url && (
            <img src={spotlightOfToday.image_url} alt="Spotlight" style={{ width: "100px", height: "70px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--glass-border)", flexShrink: 0 }} />
          )}
        </div>
      )}

      {/* Row 1: People & Attendance Overview (6 Cards) */}
      {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal") && (
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.55rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(59, 130, 246, 0.15)", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={14} strokeWidth={2.4} />
            </div>
            People & Attendance Overview
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <StatCard 
              title="Total Students" 
              value={loading ? "..." : stats.totalStudents} 
              icon={Users} 
              color="59, 130, 246" 
              onClick={() => navigate("/users/student")} 
            />
            <StatCard 
              title="Present Today" 
              value={loading ? "..." : `${stats.presentToday || 0} / ${stats.totalStudents || 0}`} 
              subtitle={stats.totalStudents ? `(${Math.round(((stats.presentToday || 0) / stats.totalStudents) * 100)}%)` : ''}
              icon={UserCheck} 
              color="16, 185, 129" 
              onClick={() => navigate("/attendance")} 
            />
            <StatCard 
              title="Total Teachers" 
              value={loading ? "..." : stats.totalTeachers} 
              icon={BookOpen} 
              color="245, 158, 11" 
              onClick={() => navigate("/users/teacher")} 
            />
            <StatCard 
              title="Total Parents" 
              value={loading ? "..." : stats.totalParents} 
              icon={Users} 
              color="219, 39, 119" 
              onClick={() => navigate("/users/parent")} 
            />
            <StatCard 
              title="Active Counselors" 
              value={loading ? "..." : stats.totalCounselors} 
              icon={UserCheck} 
              color="124, 58, 237" 
              onClick={() => navigate("/users/admission")} 
            />
            <StatCard 
              title="Prospects" 
              value={loading ? "..." : stats.totalProspects} 
              icon={TrendingUp} 
              color="2, 132, 199" 
              onClick={() => navigate("/admissions")} 
            />
          </div>
        </div>
      )}

      {/* Row 2: Operations, Finance & Facility (6 Cards) */}
      {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal" || user?.type === "finance") && (
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.55rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", color: "#059669", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={14} strokeWidth={2.4} />
            </div>
            Operations & Financials
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <StatCard 
              title="Collected Fees" 
              value={loading ? "..." : `₹${stats.collectedFees}`} 
              icon={CreditCard} 
              color="21, 128, 61" 
              onClick={() => navigate("/fees")} 
            />
            <StatCard 
              title="Pending Fees" 
              value={loading ? "..." : `₹${stats.pendingFees}`} 
              icon={Clock} 
              color="217, 119, 6" 
              onClick={() => {
                dispatch(setFeeStatusFilter("Defaulters"));
                navigate("/fees");
              }} 
            />
            {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal") && (
              <>
                <StatCard 
                  title="Active Classes" 
                  value={loading ? "..." : stats.activeClasses} 
                  icon={GraduationCap} 
                  color="8, 145, 178" 
                  onClick={() => navigate("/classes")} 
                />
                <StatCard 
                  title="Total Rooms" 
                  value={loading ? "..." : stats.totalRooms} 
                  icon={Building} 
                  color="99, 102, 241" 
                  onClick={() => navigate("/rooms")} 
                />
                <StatCard 
                  title="Events Today" 
                  value={loading ? "..." : stats.eventsToday} 
                  icon={Calendar} 
                  color="239, 68, 68" 
                  onClick={() => navigate("/annual-planner")} 
                />
                <StatCard 
                  title="Consents" 
                  value={loading ? "..." : dashboardMetrics.consentsCount} 
                  subtitle="Forms"
                  icon={FileSignature} 
                  color="192, 38, 211" 
                  onClick={() => navigate("/consents")} 
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Row 3: Academic Pulse & Communications (6 Cards - NEW) */}
      {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal") && (
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.55rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(2, 132, 199, 0.15)", color: "#0284c7", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={14} strokeWidth={2.4} />
            </div>
            Academics & Communications Pulse
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <StatCard 
              title="Active Coursework" 
              value={loading ? "..." : dashboardMetrics.courseworkCount} 
              subtitle="Notes & HW"
              icon={FileEdit} 
              color="2, 132, 199" 
              onClick={() => navigate("/coursework")} 
            />
            <StatCard 
              title="Upcoming Exams" 
              value={loading ? "..." : dashboardMetrics.examsCount} 
              subtitle="Datesheets"
              icon={ClipboardCheck} 
              color="225, 29, 72" 
              onClick={() => navigate("/exams")} 
            />
            <StatCard 
              title="Circulars" 
              value={loading ? "..." : dashboardMetrics.circularsCount} 
              subtitle="Notices"
              icon={FileText} 
              color="234, 88, 12" 
              onClick={() => navigate("/circulars")} 
            />
            <StatCard 
              title="Timetables" 
              value={loading ? "..." : `${stats.activeClasses} Classes`} 
              icon={Clock} 
              color="124, 58, 237" 
              onClick={() => navigate("/timetable")} 
            />
            <StatCard 
              title="Messages" 
              value={loading ? "..." : "Live"} 
              subtitle="Communication"
              icon={MessageSquare} 
              color="16, 185, 129" 
              onClick={() => navigate("/communication/inbox")} 
            />
            <StatCard 
              title="Media Gallery" 
              value={loading ? "..." : dashboardMetrics.galleryCount} 
              subtitle="Photos/Videos"
              icon={ImageIcon} 
              color="219, 39, 119" 
              onClick={() => navigate("/gallery")} 
            />
          </div>
        </div>
      )}

      {/* Two Column Section: Student of Week & Topper */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "0.85rem" }}>
        {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal") && (
          <div className="glass-panel" style={{ padding: "1.15rem", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.75rem", paddingBottom: "0.6rem", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "rgba(147, 51, 234, 0.15)", color: "#9333ea", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Award size={15} strokeWidth={2.4} />
              </div>
              Student of the Week
            </h3>
            <div style={{ padding: "0.25rem 0", flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {studentOfWeekList.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {studentOfWeekList.map(record => (
                    <div key={record.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.85rem", background: "var(--glass-bg)", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                      <div>
                        <p style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "0.88rem" }}>{record.student?.name}</p>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>Class {record.class?.name} - {record.class?.section}</p>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--accent-primary)", fontWeight: "700", background: "var(--accent-light)", padding: "0.2rem 0.55rem", borderRadius: "12px" }}>Awarded</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "1rem 0", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontSize: "0.85rem" }}>Manage and review the Student of the Week awards for all classes.</p>
                </div>
              )}
              <div style={{ marginTop: "auto", paddingTop: "0.5rem", display: "flex", justifyContent: "center" }}>
                <button 
                  onClick={() => navigate("/student-of-week")}
                  className="btn btn-primary"
                  style={{ fontSize: "0.82rem", padding: "0.45rem 1rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  Manage Awards
                </button>
              </div>
            </div>
          </div>
        )}

        {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal") && (
          <div className="glass-panel" style={{ padding: "1.15rem", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.75rem", paddingBottom: "0.6rem", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.15)", color: "#d97706", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={15} strokeWidth={2.4} />
              </div>
              Topper of the Month
            </h3>
            {topper ? (
              <div style={{ padding: "0.75rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", flex: 1, justifyContent: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "1.6rem", boxShadow: "0 3px 12px rgba(99, 102, 241, 0.15)" }}>
                  {topper.name?.charAt(0)}
                </div>
                <div>
                  <h4 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)" }}>{topper.name}</h4>
                  <p style={{ color: "var(--accent-primary)", fontWeight: "700", marginTop: "0.15rem", fontSize: "0.95rem" }}>Score: {topper.score}</p>
                </div>
              </div>
            ) : (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                No top performer data available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Charts Section: Admissions & User Distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "0.85rem" }}>
        {/* Admissions Waterfall Chart */}
        <div className="glass-panel" style={{ padding: "1.15rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", paddingBottom: "0.6rem", borderBottom: "1px solid var(--glass-border)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "rgba(2, 132, 199, 0.15)", color: "#0284c7", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={15} strokeWidth={2.4} />
              </div>
              Admissions Pipeline
            </h3>
            <button 
              onClick={() => navigate("/admissions")}
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem", border: "1px solid var(--glass-border)" }}
            >
              Manage Admissions
            </button>
          </div>
          <div style={{ height: "240px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={admissionStats}
                margin={{ top: 15, right: 20, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" stroke="var(--text-primary)" fontSize={11} fontWeight={600} tickMargin={8} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: "12px" }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={45}>
                  {admissionStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Distribution Radar Chart */}
        <div className="glass-panel" style={{ padding: "1.15rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", paddingBottom: "0.6rem", borderBottom: "1px solid var(--glass-border)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "rgba(124, 58, 237, 0.15)", color: "#7c3aed", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={15} strokeWidth={2.4} />
              </div>
              User Distribution
            </h3>
          </div>
          <div style={{ height: "240px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={userDistributionStats}>
                <PolarGrid stroke="rgba(0,0,0,0.08)" />
                <PolarAngleAxis dataKey="subject" stroke="var(--text-primary)" fontSize={11} fontWeight={600} />
                <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} stroke="var(--text-secondary)" fontSize={10} />
                <Radar name="Users" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                <RechartsTooltip 
                  contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: "12px" }}
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
