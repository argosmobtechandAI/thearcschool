import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  UserCircle, 
  Settings, 
  UserCheck, 
  IndianRupee, 
  FileEdit, 
  Clock, 
  Calendar, 
  ClipboardCheck, 
  Bell, 
  DollarSign, 
  MessageSquare, 
  Info, 
  ShieldAlert, 
  MapPin, 
  ExternalLink, 
  TrendingUp, 
  FileSignature, 
  Quote, 
  Award, 
  FileText, 
  Sparkles, 
  Image as ImageIcon,
  GraduationCap,
  Briefcase
} from "lucide-react";
import { toast } from "react-toastify";
import { logout } from "../features/authSlice";
import { addLiveChatMessage, fetchSystemMonitorList } from "../features/dataSlice";
import { messaging } from "../config/firebase";
import { getToken, onMessage } from "firebase/messaging";
import api from "../services/api";
import { socket } from "../lib/socket";

const NavItem = ({ to, href, icon: Icon, color, bg, children, badge }) => {
  const content = (
    <>
      <div 
        style={{ 
          width: "26px", 
          height: "26px", 
          borderRadius: "7px", 
          background: bg, 
          color: color, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          flexShrink: 0,
          boxShadow: `0 1px 3px ${bg}`
        }}
      >
        <Icon size={14} strokeWidth={2.4} />
      </div>
      <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: "600" }}>{children}</span>
      {badge}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0.35rem 0.65rem",
          borderRadius: "8px",
          color: "var(--text-secondary)",
          textDecoration: "none",
          transition: "all 0.2s ease",
          marginBottom: "2px"
        }}
        className="table-row-hover"
      >
        {content}
      </a>
    );
  }

  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.35rem 0.65rem",
        borderRadius: "8px",
        color: isActive ? "var(--accent-primary)" : "var(--text-primary)",
        background: isActive ? "var(--accent-light)" : "transparent",
        textDecoration: "none",
        transition: "all 0.2s ease",
        marginBottom: "2px",
        borderLeft: isActive ? "3px solid var(--accent-primary)" : "3px solid transparent"
      })}
    >
      {content}
    </NavLink>
  );
};

const AdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useSelector((state) => state.auth.user);
  const user = authUser || (() => {
    try {
      return JSON.parse(localStorage.getItem('adminUser')) || null;
    } catch(e) {
      return null;
    }
  })();

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
          console.warn("FCM Web Push not enabled or blocked by browser:", error.message);
        }
      };

      const fetchUnread = async () => {
        try {
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
  }, [user, dispatch]);

  useEffect(() => {
    const targetUserId = user?.id;
    if (!targetUserId) return;

    if (!socket.connected) {
      socket.connect();
    }

    const onSocketConnect = () => {
      socket.emit('identify', targetUserId);
    };

    const onReceiveMessage = (newChat) => {
      if (newChat.sender_id !== targetUserId) {
        toast.info(`New message received`);
        if (!window.location.pathname.includes('/communication')) {
          setUnreadChats(prev => prev + 1);
        }
      }
      dispatch(addLiveChatMessage(newChat));
      dispatch(fetchSystemMonitorList());
    };

    socket.on('connect', onSocketConnect);
    socket.on('receive_message', onReceiveMessage);

    if (socket.connected) {
      socket.emit('identify', targetUserId);
    }

    return () => {
      socket.off('connect', onSocketConnect);
      socket.off('receive_message', onReceiveMessage);
    };
  }, [user?.id, dispatch]);

  useEffect(() => {
    if (location.pathname.includes('/communication')) {
      setUnreadChats(0);
    }
  }, [location.pathname]);

  const NavGroup = ({ title }) => (
    <div style={{ 
      marginTop: "1.1rem", 
      marginBottom: "0.35rem", 
      padding: "0 0.5rem", 
      borderBottom: "1px solid var(--glass-border)", 
      paddingBottom: "0.25rem" 
    }}>
      <span style={{ 
        fontSize: "0.72rem", 
        textTransform: "uppercase", 
        letterSpacing: "0.08em", 
        color: "var(--accent-primary)", 
        fontWeight: "800" 
      }}>{title}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
      <style>
        {`
          .sidebar-nav::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      
      {/* Sidebar */}
      <aside className="glass-panel" style={{ width: "235px", padding: "0.85rem", display: "flex", flexDirection: "column", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, height: "100%", overflow: "hidden" }}>
        
        {/* Brand Header */}
        <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img src="/thearcschoollogo.jpeg" alt="The Arc School" style={{ height: "44px", width: "44px", borderRadius: "50%", objectFit: "cover", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }} />
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>The Arc School</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: "600" }}>Admin Portal</p>
          </div>
        </div>

        {/* Navigation Items with Solid Colorful Badges */}
        <nav className="sidebar-nav" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.15rem", overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: "1rem" }}>
          
          <NavItem to="/dashboard" icon={LayoutDashboard} color="#059669" bg="rgba(16, 185, 129, 0.15)">
            Dashboard
          </NavItem>
          
          {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal") && (
            <>
              <NavGroup title="People" />
              <NavItem to="/users/parent" icon={Users} color="#db2777" bg="rgba(219, 39, 119, 0.15)">
                Parents
              </NavItem>
              <NavItem to="/users/student" icon={GraduationCap} color="#2563eb" bg="rgba(37, 99, 235, 0.15)">
                Students
              </NavItem>
              <NavItem to="/users/teacher" icon={UserCircle} color="#d97706" bg="rgba(217, 119, 6, 0.15)">
                Teachers
              </NavItem>

              <NavGroup title="Staff" />
              <NavItem to="/users/finance" icon={IndianRupee} color="#0d9488" bg="rgba(13, 148, 136, 0.15)">
                Accountants
              </NavItem>
              <NavItem to="/users/admission" icon={UserCheck} color="#7c3aed" bg="rgba(124, 58, 237, 0.15)">
                Counselors
              </NavItem>
            </>
          )}
          
          {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal") && (
            <>
              <NavGroup title="Academics" />
              <NavItem to="/admissions" icon={TrendingUp} color="#0284c7" bg="rgba(2, 132, 199, 0.15)">
                Admissions Pipeline
              </NavItem>
              <NavItem to="/attendance" icon={UserCheck} color="#16a34a" bg="rgba(22, 163, 74, 0.15)">
                Attendance
              </NavItem>
              <NavItem to="/circulars" icon={FileText} color="#ea580c" bg="rgba(234, 88, 12, 0.15)">
                Circulars
              </NavItem>
              <NavItem to="/classes" icon={BookOpen} color="#6366f1" bg="rgba(99, 102, 241, 0.15)">
                Classes
              </NavItem>
              <NavItem to="/coursework" icon={FileEdit} color="#0284c7" bg="rgba(2, 132, 199, 0.15)">
                Coursework
              </NavItem>
              <NavItem 
                to="/communication/inbox" 
                icon={MessageSquare} 
                color="#10b981" 
                bg="rgba(16, 185, 129, 0.15)"
                badge={unreadChats > 0 ? (
                  <span style={{ width: "8px", height: "8px", backgroundColor: "#22c55e", borderRadius: "50%", marginLeft: "auto" }} />
                ) : null}
              >
                Communication
              </NavItem>
              <NavItem to="/consents" icon={FileSignature} color="#c026d3" bg="rgba(192, 38, 211, 0.15)">
                Consents
              </NavItem>
              <NavItem to="/exams" icon={ClipboardCheck} color="#e11d48" bg="rgba(225, 29, 72, 0.15)">
                Exams & Grading
              </NavItem>
              <NavItem to="/notification" icon={Bell} color="#f59e0b" bg="rgba(245, 158, 11, 0.15)">
                Notifications
              </NavItem>
              <NavItem to="/school-info" icon={Info} color="#0891b2" bg="rgba(8, 145, 178, 0.15)">
                School Info
              </NavItem>
              <NavItem to="/subject-teachers" icon={Users} color="#4f46e5" bg="rgba(79, 70, 229, 0.15)">
                Subject Teachers
              </NavItem>
              <NavItem to="/subjects" icon={BookOpen} color="#0d9488" bg="rgba(13, 148, 136, 0.15)">
                Subjects
              </NavItem>
              <NavItem to="/timetable" icon={Clock} color="#6366f1" bg="rgba(99, 102, 241, 0.15)">
                Timetable
              </NavItem>
            </>
          )}

          {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal" || user?.type === "finance") && (
            <>
              <NavGroup title="Management" />
              {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal") && (
                <NavItem to="/annual-planner" icon={Calendar} color="#3b82f6" bg="rgba(59, 130, 246, 0.15)">
                  Annual Planner
                </NavItem>
              )}
              <NavItem to="/fees" icon={IndianRupee} color="#15803d" bg="rgba(21, 128, 61, 0.15)">
                Fees
              </NavItem>
              {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal") && (
                <NavItem to="/gallery" icon={ImageIcon} color="#db2777" bg="rgba(219, 39, 119, 0.15)">
                  Gallery
                </NavItem>
              )}
              <NavItem to="/pnl" icon={TrendingUp} color="#b45309" bg="rgba(180, 83, 9, 0.15)">
                Profit & Loss
              </NavItem>
              {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal") && (
                <>
                  <NavItem to="/rooms" icon={MapPin} color="#0891b2" bg="rgba(8, 145, 178, 0.15)">
                    Rooms Management
                  </NavItem>
                  <NavItem to="/spotlight" icon={Sparkles} color="#d97706" bg="rgba(217, 119, 6, 0.15)">
                    Spotlight of the Day
                  </NavItem>
                  <NavItem to="/student-of-week" icon={Award} color="#9333ea" bg="rgba(147, 51, 234, 0.15)">
                    Student of the Week
                  </NavItem>
                  <NavItem to="/thoughts" icon={Quote} color="#7c3aed" bg="rgba(124, 58, 237, 0.15)">
                    Thought of the Day
                  </NavItem>
                </>
              )}
            </>
          )}

          {((user?.type === "admin" || user?.type === "super_admin") || user?.type === "principal") && (
            <>
              <NavGroup title="Portals" />
              <NavItem href="https://admissions.arcschool.cloud" icon={ExternalLink} color="#2563eb" bg="rgba(37, 99, 235, 0.15)">
                Admission Portal
              </NavItem>
              <NavItem href="https://finance.arcschool.cloud" icon={ExternalLink} color="#16a34a" bg="rgba(22, 163, 74, 0.15)">
                Finance Portal
              </NavItem>
            </>
          )}
        </nav>

        {/* User profile & Logout */}
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--glass-border)", paddingTop: "0.85rem" }}>
          <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(27, 139, 59, 0.15)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "0.95rem" }}>
              {user?.name?.charAt(0) || "A"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{user?.name || "System Admin"}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{user?.type || "Super_admin"}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="btn btn-ghost" 
            style={{ 
              width: "100%", 
              justifyContent: "center", 
              color: "#dc2626",
              backgroundColor: "rgba(220, 38, 38, 0.06)",
              border: "1px solid rgba(220, 38, 38, 0.15)",
              fontSize: "0.8rem",
              padding: "0.4rem 0.75rem"
            }}
          >
            <LogOut size={16} strokeWidth={2.4} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "1.25rem", overflowY: "auto", height: "100%", width: "100%" }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
