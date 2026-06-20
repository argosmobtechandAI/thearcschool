import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, LayoutDashboard, UserPlus, ExternalLink } from "lucide-react";
import { logout } from "../features/authSlice";

const AdmissionLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentStatus = searchParams.get("status");

  const getLinkStyle = (path, matchStatus = null) => {
    // If we're matching the dashboard
    let isActive = false;
    if (path === "/dashboard") {
      isActive = location.pathname === "/dashboard";
    } else {
      // If we're matching /admissions with a specific status
      if (matchStatus) {
        isActive = location.pathname === path && currentStatus === matchStatus;
      } else {
        // "All Applications" - matches when there is NO status
        isActive = location.pathname === path && !currentStatus;
      }
    }

    return {
      display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", 
      borderRadius: "6px", fontWeight: "500", transition: "all 0.3s", fontSize: "0.875rem",
      textDecoration: "none",
      background: isActive ? "var(--accent-light)" : "transparent",
      color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
    };
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside className="glass-panel" style={{ width: "240px", padding: "1rem", display: "flex", flexDirection: "column", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, height: "100vh" }}>
        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img src="/thearcschoollogo.jpeg" alt="The Arc School" style={{ height: "48px", width: "48px", borderRadius: "50%", objectFit: "cover", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1.2 }}>The Arc School</h2>
            <p style={{ color: "var(--accent-primary)", fontSize: "0.875rem", fontWeight: "600" }}>Admission Panel</p>
          </div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <NavLink to="/dashboard" style={() => getLinkStyle("/dashboard")}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem", marginBottom: "0.5rem", paddingLeft: "1rem", paddingRight: "1rem" }}>
            <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", fontWeight: "700" }}>Pipeline</span>
            <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }}></div>
          </div>
          <NavLink to="/admissions" style={() => getLinkStyle("/admissions", null)}>
            <UserPlus size={18} /> All Applications
          </NavLink>
          <NavLink to="/admissions?status=Pending" style={() => getLinkStyle("/admissions", "Pending")}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", marginLeft: "4px" }}></div>
            Pending Review
          </NavLink>
          <NavLink to="/admissions?status=Approved" style={() => getLinkStyle("/admissions", "Approved")}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", marginLeft: "4px" }}></div>
            Approved
          </NavLink>
          <NavLink to="/admissions?status=Rejected" style={() => getLinkStyle("/admissions", "Rejected")}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", marginLeft: "4px" }}></div>
            Rejected
          </NavLink>

          {(user?.type === "admin" || user?.type === "principal") && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem", marginBottom: "0.5rem", paddingLeft: "1rem", paddingRight: "1rem" }}>
                <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", fontWeight: "700" }}>Portals</span>
                <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }}></div>
              </div>
              <a href="http://localhost:5174/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none", color: "var(--text-secondary)" }}>
                <ExternalLink size={18} /> Admin Portal
              </a>
              <a href="http://localhost:5176/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none", color: "var(--text-secondary)" }}>
                <ExternalLink size={18} /> Finance Portal
              </a>
            </>
          )}
        </nav>

        <div style={{ marginTop: "auto", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
          <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
              {user?.name?.charAt(0) || "C"}
            </div>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: "600" }}>{user?.name || "Counselor"}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{user?.type || "Admission"}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", color: "#ef4444" }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto", height: "100vh" }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdmissionLayout;
