import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, UserMinus, Percent, CalendarDays, Clock, Sparkles } from "lucide-react";
import api from "../services/api";
import { setDashboardLoading, setDashboardStats } from "../features/dashboardSlice";
import DateRangePicker from "../components/DateRangePicker";

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
  const { stats, loading } = useSelector((state) => state.dashboard);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [spotlightOfToday, setSpotlightOfToday] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      dispatch(setDashboardLoading(true));
      try {
        const { data: newUserData } = await api.get("/admission_panel/getAllNewUser");
        let newUsers = newUserData?.users || newUserData?.data || [];

        // Data privacy: Counselors only see metrics for their assigned leads
        if (user?.type === "admission") {
          newUsers = newUsers.filter(u => String(u.assigned_to) === String(user.id));
        }

        if (startDate || endDate) {
          newUsers = newUsers.filter(u => {
            if (!u.created_at) return true;
            const dDate = new Date(u.created_at);
            if (startDate) {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              if (dDate < start) return false;
            }
            if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              if (dDate > end) return false;
            }
            return true;
          });
        }

        const today = new Date().toDateString();
        dispatch(setDashboardStats({
          pendingAdmissions: newUsers.filter(u => u.status?.toLowerCase() === 'pending').length,
          totalApplications: newUsers.length,
          approvedApplications: newUsers.filter(u => u.status?.toLowerCase() === 'approved').length,
          rejectedApplications: newUsers.filter(u => u.status?.toLowerCase() === 'rejected').length,
          todayInquiries: newUsers.filter(u => u.created_at && new Date(u.created_at).toDateString() === today).length,
          recentApplications: newUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
        }));
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }

      try {
        const { data: spotlightRes } = await api.get("/spotlight/today");
        if (spotlightRes?.success && spotlightRes.data) {
          setSpotlightOfToday(spotlightRes.data);
        }
      } catch (e) {
        console.error("No spotlight found today");
      } finally {
        dispatch(setDashboardLoading(false));
      }
    };

    fetchDashboardData();
  }, [dispatch, startDate, endDate]);

  const dateParams = `${startDate ? `startDate=${startDate}&` : ""}${endDate ? `endDate=${endDate}` : ""}`;
  
  const conversionRate = stats.totalApplications > 0 
    ? Math.round((stats.approvedApplications / stats.totalApplications) * 100) 
    : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "0.5rem" }}>Admission Pipeline</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Welcome back, {user?.name || "Counselor"}! Here is the current admission status.</p>
        </div>
        <DateRangePicker 
          startDate={startDate} 
          endDate={endDate} 
          setStartDate={setStartDate} 
          setEndDate={setEndDate} 
          defaultRange="mtd" 
        />
      </div>

      {/* Spotlight of the Day Banner */}
      {spotlightOfToday && (
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", gap: "1.5rem", alignItems: "center", border: "1px solid var(--primary-color)", background: "rgba(99, 102, 241, 0.05)" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(99, 102, 241, 0.15)", color: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--primary-color)", letterSpacing: "1px" }}>Spotlight of the Day</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginTop: "0.25rem", marginBottom: "0.5rem" }}>{spotlightOfToday.title}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.5", margin: 0 }}>{spotlightOfToday.description}</p>
          </div>
          {spotlightOfToday.image_url && (
            <img src={spotlightOfToday.image_url} alt="Spotlight" style={{ width: "120px", height: "80px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--glass-border)", flexShrink: 0 }} />
          )}
        </div>
      )}

      <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Users size={18} color="var(--accent-primary)"/> Application Overview
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard title="Total Applications" value={loading ? "..." : stats.totalApplications || 0} icon={Users} color="59, 130, 246" onClick={() => navigate(`/admissions?${dateParams}`)} />
        <StatCard title="Pending Review" value={loading ? "..." : stats.pendingAdmissions || 0} icon={Clock} color="245, 158, 11" onClick={() => navigate(`/admissions?status=Pending&${dateParams}`)} />
        <StatCard title="Approved" value={loading ? "..." : stats.approvedApplications || 0} icon={UserPlus} color="16, 185, 129" onClick={() => navigate(`/admissions?status=Approved&${dateParams}`)} />
        <StatCard title="Rejected" value={loading ? "..." : stats.rejectedApplications || 0} icon={UserMinus} color="239, 68, 68" onClick={() => navigate(`/admissions?status=Rejected&${dateParams}`)} />
        <StatCard title="Today's Inquiries" value={loading ? "..." : stats.todayInquiries || 0} icon={CalendarDays} color="139, 92, 246" onClick={() => navigate(`/admissions?${dateParams}`)} />
        <StatCard title="Conversion Rate" value={loading ? "..." : `${conversionRate}%`} icon={Percent} color="14, 165, 233" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
            Needs Attention
          </h3>
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            {(stats.pendingAdmissions || 0) > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
                <div 
                  onClick={() => navigate(`/admissions?${dateParams}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "1rem", borderRadius: "12px", display: "flex", alignItems: "center", gap: "1rem", width: "100%", maxWidth: "400px", justifyContent: "center", cursor: "pointer", transition: "transform 0.2s" }}
                >
                  <UserPlus size={24} />
                  <div>
                    <h4 style={{ fontWeight: "700", fontSize: "1.1rem" }}>{stats.pendingAdmissions} Pending Admissions</h4>
                    <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>Require review</p>
                  </div>
                </div>
              </div>
            ) : (
              "You're all caught up! No applications pending review."
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Recent Applications</h3>
            <button onClick={() => navigate(`/admissions`)} className="btn-ghost" style={{ fontSize: "0.875rem", color: "var(--accent-primary)" }}>View All</button>
          </div>
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading...</div>
          ) : stats.recentApplications?.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "0.5rem" }}>Name</th>
                    <th style={{ padding: "0.5rem" }}>Date</th>
                    <th style={{ padding: "0.5rem" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentApplications.map(app => (
                    <tr key={app.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>{app.name}</td>
                      <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <span style={{
                          background: app.status?.toLowerCase() === "approved" ? "rgba(16, 185, 129, 0.15)" : app.status?.toLowerCase() === "rejected" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: app.status?.toLowerCase() === "approved" ? "#047857" : app.status?.toLowerCase() === "rejected" ? "#b91c1c" : "#b45309",
                          padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "600", textTransform: "capitalize"
                        }}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No recent applications found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
