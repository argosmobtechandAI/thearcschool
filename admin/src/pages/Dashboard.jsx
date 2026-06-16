import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Users, GraduationCap, Calendar, CreditCard } from "lucide-react";
import api from "../services/api";
import { toast } from "react-toastify";

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
    <div style={{ width: "48px", height: "48px", borderRadius: "var(--radius-md)", background: `rgba(${color}, 0.15)`, color: `rgb(${color})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={28} />
    </div>
    <div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.25rem" }}>{title}</p>
      <h3 style={{ fontSize: "1.5rem", fontWeight: "700" }}>{value}</h3>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({ users: 0, classes: 0 });
  const [topper, setTopper] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: userData } = await api.get("/user/getUser");
        const { data: classData } = await api.get("/class/getClass");
        
        try {
          const { data: topperData } = await api.get("/user/getTopper");
          if (topperData?.success && topperData.topper) {
            setTopper({ name: topperData.topper.name, score: topperData.score });
          }
        } catch (e) {
          console.error("Failed to fetch topper", e);
        }

        setStats({
          users: userData?.users?.length || 0,
          classes: classData?.classes?.length || 0,
        });
      } catch (error) {
        toast.error("Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.25rem" }}>Dashboard Overview</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Welcome back, {user?.name || "Admin"}! Here is what's happening today.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard title="Total Users" value={loading ? "..." : stats.users} icon={Users} color="59, 130, 246" />
        <StatCard title="Active Classes" value={loading ? "..." : stats.classes} icon={GraduationCap} color="16, 185, 129" />
        <StatCard title="Events Today" value="0" icon={Calendar} color="245, 158, 11" />
        <StatCard title="Pending Fees" value="₹0" icon={CreditCard} color="239, 68, 68" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="glass-panel" style={{ padding: "1rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
            Recent Activity
          </h3>
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No recent activity to show
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
            Topper of the Month
          </h3>
          {topper ? (
            <div style={{ padding: "1rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.5rem" }}>
                {topper.name?.charAt(0)}
              </div>
              <div>
                <h4 style={{ fontSize: "1.25rem", fontWeight: "700" }}>{topper.name}</h4>
                <p style={{ color: "var(--text-secondary)", fontWeight: "500", marginTop: "0.25rem", fontSize: "1.1rem" }}>Score: {topper.score}</p>
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
