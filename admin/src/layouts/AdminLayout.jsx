import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, LayoutDashboard, Users, BookOpen, UserCircle, Settings, UserCheck, IndianRupee, FileEdit, Clock, Calendar, ClipboardCheck, Bell, DollarSign, MessageSquare, Info, ShieldAlert, MapPin, ExternalLink } from "lucide-react";
import { logout } from "../features/authSlice";

const AdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const navLinkStyle = ({ isActive }) => ({
    display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", 
    borderRadius: "6px", fontWeight: "500", transition: "all 0.3s", fontSize: "0.875rem",
    textDecoration: "none",
    background: isActive ? "var(--accent-light)" : "transparent",
    color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside className="glass-panel" style={{ width: "240px", padding: "1rem", display: "flex", flexDirection: "column", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, height: "100vh" }}>
        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img src="/thearcschoollogo.jpeg" alt="The Arc School" style={{ height: "48px", width: "48px", borderRadius: "50%", objectFit: "cover" }} />
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1.2 }}>The Arc School</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Admin Portal</p>
          </div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <NavLink to="/dashboard" style={navLinkStyle}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          
          {user?.type === "admin" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem", marginBottom: "0.5rem", paddingLeft: "1rem", paddingRight: "1rem" }}>
                <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", fontWeight: "700" }}>People</span>
                <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }}></div>
              </div>
              <NavLink to="/users/student" style={navLinkStyle}><Users size={18} /> Students</NavLink>
              <NavLink to="/users/teacher" style={navLinkStyle}><UserCircle size={18} /> Teachers</NavLink>
              <NavLink to="/users/parent" style={navLinkStyle}><Users size={18} /> Parents</NavLink>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem", marginBottom: "0.5rem", paddingLeft: "1rem", paddingRight: "1rem" }}>
                <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", fontWeight: "700" }}>Staff</span>
                <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }}></div>
              </div>
              <NavLink to="/users/admission" style={navLinkStyle}><UserCheck size={18} /> Counselors</NavLink>
              <NavLink to="/users/finance" style={navLinkStyle}><IndianRupee size={18} /> Accountants</NavLink>
            </>
          )}
          
          {user?.type === "admin" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem", marginBottom: "0.5rem", paddingLeft: "1rem", paddingRight: "1rem" }}>
                <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", fontWeight: "700" }}>Academics</span>
                <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }}></div>
              </div>
              <NavLink to="/admissions" style={navLinkStyle}><UserCheck size={18} /> Admissions Pipeline</NavLink>
              <NavLink to="/classes" style={navLinkStyle}><BookOpen size={18} /> Classes</NavLink>
              <NavLink to="/subjects" style={navLinkStyle}><BookOpen size={18} /> Subjects</NavLink>
              <NavLink to="/timetable" style={navLinkStyle}><Clock size={18} /> Timetable</NavLink>
              <NavLink to="/attendance" style={navLinkStyle}><UserCheck size={18} /> Attendance</NavLink>
              <NavLink to="/exams" style={navLinkStyle}><ClipboardCheck size={18} /> Exams & Grading</NavLink>
              <NavLink to="/salary" style={navLinkStyle}><DollarSign size={18} /> Salary Management</NavLink>
              <NavLink to="/communication/inbox" style={navLinkStyle}><MessageSquare size={18} /> Communication</NavLink>
              <NavLink to="/notification" style={navLinkStyle}><Bell size={18} /> Notifications</NavLink>
              <NavLink to="/school-info" style={navLinkStyle}><Info size={18} /> School Info</NavLink>
            </>
          )}

          {(user?.type === "admin" || user?.type === "finance") && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem", marginBottom: "0.5rem", paddingLeft: "1rem", paddingRight: "1rem" }}>
                <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", fontWeight: "700" }}>Management</span>
                <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }}></div>
              </div>
              {user?.type === "admin" && (
                <>
                  <NavLink to="/events" style={navLinkStyle}><Calendar size={18} /> Events & Calendar</NavLink>
                  <NavLink to="/holidays" style={navLinkStyle}><Calendar size={18} /> Public Holidays</NavLink>
                  <NavLink to="/rooms" style={navLinkStyle}><MapPin size={18} /> Rooms Management</NavLink>
                </>
              )}
              <NavLink to="/fees" style={navLinkStyle}><IndianRupee size={18} /> Fees</NavLink>
              {user?.type === "admin" && (
                <NavLink to="/complaints" style={navLinkStyle}><ShieldAlert size={18} /> Complaints</NavLink>
              )}
            </>
          )}

          {user?.type === "admin" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem", marginBottom: "0.5rem", paddingLeft: "1rem", paddingRight: "1rem" }}>
                <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", fontWeight: "700" }}>Portals</span>
                <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }}></div>
              </div>
              <a href="http://localhost:5175/dashboard" style={{ ...navLinkStyle({ isActive: false }), color: "var(--text-secondary)" }}>
                <ExternalLink size={18} /> Admission Portal
              </a>
              <a href="http://localhost:5176/dashboard" style={{ ...navLinkStyle({ isActive: false }), color: "var(--text-secondary)" }}>
                <ExternalLink size={18} /> Finance Portal
              </a>
            </>
          )}
        </nav>

        <div style={{ marginTop: "auto", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
          <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
              {user?.name?.charAt(0) || "A"}
            </div>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: "600" }}>{user?.name || "Admin"}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{user?.type || "Administrator"}</p>
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

export default AdminLayout;
