import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { LogOut, LayoutDashboard, Users, BookOpen, UserCircle, Settings, UserCheck, IndianRupee, FileEdit, Clock, Calendar, ClipboardCheck, Bell, DollarSign, MessageSquare, Info, ShieldAlert, MapPin, ExternalLink, TrendingUp, FileSignature } from "lucide-react";
import { toast } from "react-toastify";
import { logout } from "../features/authSlice";
import { messaging } from "../config/firebase";
import { getToken, onMessage } from "firebase/messaging";
import api from "../services/api";

const AdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    if (user && messaging) {
      const setupFCM = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            const token = await getToken(messaging);
            if (token) {
              await api.post('/notifications/register-token', {
                fcm_token: token,
                device_type: 'web'
              });
            }
          }
        } catch (error) {
          console.error("FCM Token Error:", error);
        }
      };

      const fetchUnread = async () => {
        try {
          // Fetch admin's own notifications
          const res = await api.get('/admin_panel/notifications');
          if (res.data && res.data.data) {
            const unreadNotifs = res.data.data.filter(n => !n.is_read && n.type !== 'live_chat').length;
            const unreadChatsCount = res.data.data.filter(n => !n.is_read && n.type === 'live_chat').length;
            setUnreadNotifications(unreadNotifs);
            setUnreadChats(unreadChatsCount);
          }
        } catch (e) {
          console.error("Error fetching unread notifications:", e);
        }
      };

      setupFCM();
      fetchUnread();

      const unsubscribe = onMessage(messaging, (payload) => {
        toast.info(
          <div>
            <strong>{payload.notification.title}</strong>
            <p style={{ margin: 0 }}>{payload.notification.body}</p>
          </div>
        );
        // Increment unread count based on type
        if (payload.data?.type === 'live_chat') {
          setUnreadChats(prev => prev + 1);
        } else {
          setUnreadNotifications(prev => prev + 1);
        }
      });

      const handleNotificationsRead = () => {
        setUnreadNotifications(0);
      };
      window.addEventListener('notificationsRead', handleNotificationsRead);

      return () => {
        unsubscribe();
        window.removeEventListener('notificationsRead', handleNotificationsRead);
      };
    }
  }, [user]);

  const navLinkStyle = ({ isActive }) => ({
    display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.75rem", 
    borderRadius: "6px", fontWeight: "500", transition: "all 0.3s", fontSize: "0.8rem",
    textDecoration: "none",
    background: isActive ? "var(--accent-light)" : "transparent",
    color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
  });

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
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Admin Portal</p>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.15rem", overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: "1rem" }}>
          <NavLink to="/dashboard" style={navLinkStyle}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          
          {user?.type === "admin" && (
            <>
              <NavGroup title="People" />
              <NavLink to="/users/student" style={navLinkStyle}><Users size={16} /> Students</NavLink>
              <NavLink to="/users/teacher" style={navLinkStyle}><UserCircle size={16} /> Teachers</NavLink>
              <NavLink to="/users/parent" style={navLinkStyle}><Users size={16} /> Parents</NavLink>
              <NavGroup title="Staff" />
              <NavLink to="/users/admission" style={navLinkStyle}><UserCheck size={16} /> Counselors</NavLink>
              <NavLink to="/users/finance" style={navLinkStyle}><IndianRupee size={16} /> Accountants</NavLink>
            </>
          )}
          
          {user?.type === "admin" && (
            <>
              <NavGroup title="Academics" />
              <NavLink to="/admissions" style={navLinkStyle}><UserCheck size={16} /> Admissions Pipeline</NavLink>
              <NavLink to="/classes" style={navLinkStyle}><BookOpen size={16} /> Classes</NavLink>
              <NavLink to="/subjects" style={navLinkStyle}><BookOpen size={16} /> Subjects</NavLink>
              <NavLink to="/subject-teachers" style={navLinkStyle}><Users size={16} /> Subject Teachers</NavLink>
              <NavLink to="/timetable" style={navLinkStyle}><Clock size={16} /> Timetable</NavLink>
              <NavLink to="/attendance" style={navLinkStyle}><UserCheck size={16} /> Attendance</NavLink>
              <NavLink to="/exams" style={navLinkStyle}><ClipboardCheck size={16} /> Exams & Grading</NavLink>
              <NavLink to="/communication/inbox" style={navLinkStyle}>
                <MessageSquare size={16} /> Communication
              </NavLink>
              <NavLink to="/notification" style={navLinkStyle}>
                <Bell size={16} /> Notifications
              </NavLink>
              <NavLink to="/school-info" style={navLinkStyle}><Info size={16} /> School Info</NavLink>
              <NavLink to="/consents" style={navLinkStyle}><FileSignature size={16} /> Consents</NavLink>
            </>
          )}

          {(user?.type === "admin" || user?.type === "finance") && (
            <>
              <NavGroup title="Management" />
              {user?.type === "admin" && (
                <>
                  <NavLink to="/annual-planner" style={navLinkStyle}><Calendar size={16} /> Annual Planner</NavLink>
                  <NavLink to="/rooms" style={navLinkStyle}><MapPin size={16} /> Rooms Management</NavLink>
                  <NavLink to="/staff-roles" style={navLinkStyle}><UserCheck size={16} /> Staff Roles</NavLink>
                </>
              )}
              <NavLink to="/fees" style={navLinkStyle}><IndianRupee size={16} /> Fees</NavLink>
              <NavLink to="/pnl" style={navLinkStyle}><TrendingUp size={16} /> Profit & Loss</NavLink>
              {user?.type === "admin" && (
                <NavLink to="/complaints" style={navLinkStyle}><ShieldAlert size={16} /> Complaints</NavLink>
              )}
            </>
          )}

          {user?.type === "admin" && (
            <>
              <NavGroup title="Portals" />
              <a href="https://admission.thearcschool.in" target="_blank" rel="noopener noreferrer" style={{ ...navLinkStyle({ isActive: false }), color: "var(--text-secondary)" }}>
                <ExternalLink size={16} /> Admission Portal
              </a>
              <a href="https://finance.thearcschool.in" target="_blank" rel="noopener noreferrer" style={{ ...navLinkStyle({ isActive: false }), color: "var(--text-secondary)" }}>
                <ExternalLink size={16} /> Finance Portal
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
