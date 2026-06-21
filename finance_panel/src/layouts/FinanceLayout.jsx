import { Outlet, useNavigate, NavLink, useLocation, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, LayoutDashboard, FileSpreadsheet, BarChart, Settings, ExternalLink, IndianRupee, TrendingDown, TrendingUp, Users } from "lucide-react";
import { logout } from "../features/authSlice";
import { setGlobalDateRange } from "../features/dataSlice";
import DateRangePicker from "../components/DateRangePicker";

const FinanceLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { globalDateRange } = useSelector((state) => state.data);

  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const navLinkStyle = ({ isActive }) => ({
    display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.75rem", 
    borderRadius: "6px", fontWeight: "500", transition: "all 0.3s", fontSize: "0.8rem",
    textDecoration: "none",
    background: isActive ? "var(--accent-light)" : "transparent",
    color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
  });

  const getMetricStyle = (view) => {
    const isActive = location.pathname === "/metrics" && location.search.includes(`view=${view}`);
    return {
      display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.75rem", 
      borderRadius: "6px", fontWeight: "500", transition: "all 0.3s", fontSize: "0.8rem",
      textDecoration: "none",
      background: isActive ? "var(--accent-light)" : "transparent",
      color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
    };
  };

  const NavGroup = ({ title }) => (
    <div style={{ 
      marginTop: "1.25rem", 
      marginBottom: "0.5rem", 
      padding: "0 0.5rem", 
      borderBottom: "1px solid var(--glass-border)", 
      paddingBottom: "0.3rem" 
    }}>
      <span style={{ 
        fontSize: "0.75rem", 
        textTransform: "uppercase", 
        letterSpacing: "0.1em", 
        color: "var(--accent-primary)", 
        fontWeight: "800" 
      }}>{title}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <style>
        {`
          .sidebar-nav::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      {/* Sidebar */}
      <aside className="glass-panel" style={{ width: "230px", padding: "0.75rem", display: "flex", flexDirection: "column", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, height: "100vh", overflow: "hidden" }}>
        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img src="/thearcschoollogo.jpeg" alt="The Arc School" style={{ height: "48px", width: "48px", borderRadius: "50%", objectFit: "cover" }} />
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1.2 }}>The Arc School</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Finance Portal</p>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.15rem", overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: "1rem" }}>
          <NavLink to="/dashboard" style={navLinkStyle}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          
          <NavGroup title="Metrics" />
          <Link to="/metrics?view=collected" style={getMetricStyle("collected")}><IndianRupee size={16} /> Total Collected</Link>
          <Link to="/metrics?view=dues" style={getMetricStyle("dues")}><TrendingDown size={16} /> Pending Dues</Link>
          <Link to="/metrics?view=students" style={getMetricStyle("students")}><Users size={16} /> Active Students</Link>
          <Link to="/metrics?view=exempted" style={getMetricStyle("exempted")}><TrendingUp size={16} /> Exempted Students</Link>

          <NavGroup title="Master Data" />
          <NavLink to="/student-master" style={navLinkStyle}><Users size={16} /> Student Master</NavLink>

          <NavGroup title="Accounts & Ledger" />
          <NavLink to="/ledger" style={navLinkStyle}><FileSpreadsheet size={16} /> Fee Collection</NavLink>
          <NavLink to="/income" style={navLinkStyle}><IndianRupee size={16} /> Income Ledger</NavLink>
          <NavLink to="/expenses" style={navLinkStyle}><IndianRupee size={16} /> Expense Ledger</NavLink>

          <NavGroup title="Reports" />
          <NavLink to="/profit-loss" style={navLinkStyle}><BarChart size={16} /> Profit & Loss</NavLink>
          <NavLink to="/reports" style={navLinkStyle}><BarChart size={16} /> Fee Reports</NavLink>

          <NavGroup title="Settings & Categories" />
          <NavLink to="/income-categories" style={navLinkStyle}><Settings size={16} /> Income Categories</NavLink>
          <NavLink to="/expense-categories" style={navLinkStyle}><Settings size={16} /> Expense Categories</NavLink>
          <NavLink to="/fee-structures" style={navLinkStyle}><Settings size={16} /> Fee Configuration</NavLink>

          {(user?.type === "admin" || user?.type === "principal") && (
            <>
              <NavGroup title="Portals" />
              <a href="http://localhost:5174/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.75rem", fontSize: "0.8rem", textDecoration: "none", color: "var(--text-secondary)" }}>
                <ExternalLink size={16} /> Admin Portal
              </a>
              <a href="http://localhost:5175/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.75rem", fontSize: "0.8rem", textDecoration: "none", color: "var(--text-secondary)" }}>
                <ExternalLink size={16} /> Admission Portal
              </a>
            </>
          )}
        </nav>

        <div style={{ marginTop: "auto", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
          <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
              {user?.name?.charAt(0) || "F"}
            </div>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: "600" }}>{user?.name || "Accountant"}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{user?.type || "Finance"}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", color: "#ef4444" }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg-main)" }}>
        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          {location.pathname !== "/fee-structures" && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "-2.5rem", position: "relative", zIndex: 10, pointerEvents: "none" }}>
              <div style={{ pointerEvents: "auto" }}>
                <DateRangePicker 
                  startDate={globalDateRange.startDate}
                  endDate={globalDateRange.endDate}
                  onChange={(start, end) => dispatch(setGlobalDateRange({ startDate: start, endDate: end }))}
                />
              </div>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default FinanceLayout;
