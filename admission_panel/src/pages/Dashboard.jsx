import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus } from "lucide-react";
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      dispatch(setDashboardLoading(true));
      try {
        const { data: newUserData } = await api.get("/admission_panel/getAllNewUser");
        let newUsers = newUserData?.users || newUserData?.data || [];

        if (startDate || endDate) {
          newUsers = newUsers.filter(u => {
            if (!u.created_at) return true;
            const dDate = new Date(u.created_at);
            if (startDate && dDate < new Date(startDate)) return false;
            if (endDate && dDate > new Date(endDate)) return false;
            return true;
          });
        }

        dispatch(setDashboardStats({
          pendingAdmissions: newUsers.filter(u => u.status === 'Pending').length,
          totalApplications: newUsers.length,
          approvedApplications: newUsers.filter(u => u.status === 'Approved').length,
          rejectedApplications: newUsers.filter(u => u.status === 'Rejected').length,
        }));
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        dispatch(setDashboardLoading(false));
      }
    };

    fetchDashboardData();
  }, [dispatch, startDate, endDate]);

  const dateParams = `${startDate ? `startDate=${startDate}&` : ""}${endDate ? `endDate=${endDate}` : ""}`;

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

      <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Users size={18} color="var(--accent-primary)"/> Application Overview
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard title="Total Applications" value={loading ? "..." : stats.totalApplications || 0} icon={Users} color="59, 130, 246" onClick={() => navigate(`/admissions?${dateParams}`)} />
        <StatCard title="Pending Review" value={loading ? "..." : stats.pendingAdmissions || 0} icon={UserPlus} color="245, 158, 11" onClick={() => navigate(`/admissions?${dateParams}`)} />
        <StatCard title="Approved" value={loading ? "..." : stats.approvedApplications || 0} icon={UserPlus} color="16, 185, 129" onClick={() => navigate(`/admissions?${dateParams}`)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
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
      </div>
    </div>
  );
};

export default Dashboard;
