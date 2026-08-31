import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink, useLocation, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { 
  LogOut, 
  LayoutDashboard, 
  FileSpreadsheet, 
  BarChart3, 
  Settings, 
  ExternalLink, 
  IndianRupee, 
  TrendingDown, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  Image as ImageIcon, 
  Calendar,
  Layers,
  Sliders,
  FolderKanban,
  Bus
} from "lucide-react";
import { logout } from "../features/authSlice";
import { setGlobalDateRange } from "../features/dataSlice";
import { setAcademicYear } from "../features/settingsSlice";
import DateRangePicker from "../components/DateRangePicker";
import CloseYearModal from "../components/CloseYearModal";

const NavItem = ({ to, isExternal, icon: Icon, iconBg, iconColor, label, isMetric, metricView }) => {
  const location = useLocation();
  const isActive = isMetric 
    ? (location.pathname === "/metrics" && location.search.includes(`view=${metricView}`))
    : (location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to)));

  const content = (
    <>
      <div 
        style={{ 
          width: "26px", 
          height: "26px", 
          borderRadius: "7px", 
          background: iconBg, 
          color: iconColor, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          flexShrink: 0,
          boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
          transition: "all 0.2s"
        }}
      >
        <Icon size={14} strokeWidth={2.4} />
      </div>
      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {isExternal && <ExternalLink size={12} style={{ opacity: 0.5, flexShrink: 0 }} />}
    </>
  );

  const style = {
    display: "flex",
    alignItems: "center",
    gap: "0.55rem",
    padding: "0.35rem 0.6rem",
    borderRadius: "7px",
    fontWeight: isActive ? "700" : "500",
    fontSize: "0.81rem",
    textDecoration: "none",
    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
    background: isActive ? "rgba(27, 139, 59, 0.12)" : "transparent",
    transition: "all 0.15s ease-in-out",
  };

  if (isExternal) {
    return (
      <a href={to} style={style} className="nav-item-hover">
        {content}
      </a>
    );
  }

  if (isMetric) {
    return (
      <Link to={to} style={style} className="nav-item-hover">
        {content}
      </Link>
    );
  }

  return (
    <NavLink to={to} style={style} className="nav-item-hover">
      {content}
    </NavLink>
  );
};

const NavGroup = ({ title, icon: Icon, iconBg, iconColor }) => (
  <div style={{ 
    marginTop: "0.9rem", 
    marginBottom: "0.25rem", 
    padding: "0 0.35rem", 
    display: "flex", 
    alignItems: "center", 
    gap: "0.35rem" 
  }}>
    {Icon && (
      <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: iconBg || "rgba(27, 139, 59, 0.12)", color: iconColor || "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={10} strokeWidth={2.4} />
      </div>
    )}
    <span style={{ 
      fontSize: "0.68rem", 
      textTransform: "uppercase", 
      letterSpacing: "0.08em", 
      color: "var(--accent-primary)", 
      fontWeight: "800" 
    }}>{title}</span>
  </div>
);

const FinanceLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { academicYear } = useSelector((state) => state.settings);
  const { globalDateRange } = useSelector((state) => state.data);

  useEffect(() => {
    // Only initialize the date range to the academic year if it hasn't been set yet
    if (academicYear && academicYear !== "ALL" && !globalDateRange.startDate && !globalDateRange.endDate) {
      const startYear = parseInt(academicYear.split("-")[0]);
      const startDate = `${startYear}-04-01`;
      
      const academicEndDateObj = new Date(`${startYear + 1}-03-31`);
      const today = new Date();
      let endDate;
      
      if (today < academicEndDateObj) {
        endDate = today.toISOString().split('T')[0];
      } else {
        endDate = `${startYear + 1}-03-31`;
      }
      
      dispatch(setGlobalDateRange({ startDate, endDate }));
    }
  }, [academicYear, dispatch, globalDateRange.startDate, globalDateRange.endDate]);

  const [isCloseYearModalOpen, setIsCloseYearModalOpen] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const generateAcademicYears = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 4; i <= currentYear + 1; i++) {
      years.push(`${i}-${i + 1}`);
    }
    return years.reverse();
  };

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
      <style>
        {`
          .sidebar-nav::-webkit-scrollbar {
            display: none;
          }
          .nav-item-hover:hover {
            background: rgba(0, 0, 0, 0.04) !important;
            color: var(--text-primary) !important;
          }
        `}
      </style>
      
      {/* Sidebar */}
      <aside className="glass-panel" style={{ width: "235px", padding: "0.75rem", display: "flex", flexDirection: "column", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, height: "100%", overflow: "hidden", flexShrink: 0 }}>
        {/* Brand Header */}
        <div style={{ marginBottom: "1.1rem", display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.25rem 0.35rem" }}>
          <img src="/thearcschoollogo.jpeg" alt="The Arc School" style={{ height: "42px", width: "42px", borderRadius: "50%", objectFit: "cover", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }} />
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2, letterSpacing: "-0.01em" }}>The Arc School</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: "600" }}>Finance Portal</p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.15rem", overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: "1rem" }}>
          <NavItem 
            to="/dashboard" 
            icon={LayoutDashboard} 
            iconBg="rgba(16, 185, 129, 0.16)" 
            iconColor="#059669" 
            label="Dashboard" 
          />
          
          <NavGroup title="Metrics" icon={BarChart3} iconBg="rgba(16, 185, 129, 0.15)" iconColor="#059669" />
          <NavItem 
            to="/metrics?view=collected" 
            isMetric={true} 
            metricView="collected" 
            icon={IndianRupee} 
            iconBg="rgba(16, 185, 129, 0.18)" 
            iconColor="#059669" 
            label="Total Collected" 
          />
          <NavItem 
            to="/metrics?view=dues" 
            isMetric={true} 
            metricView="dues" 
            icon={TrendingDown} 
            iconBg="rgba(239, 68, 68, 0.18)" 
            iconColor="#dc2626" 
            label="Pending Dues" 
          />
          <NavItem 
            to="/metrics?view=students" 
            isMetric={true} 
            metricView="students" 
            icon={Users} 
            iconBg="rgba(59, 130, 246, 0.18)" 
            iconColor="#2563eb" 
            label="Active Students" 
          />
          <NavItem 
            to="/metrics?view=exempted" 
            isMetric={true} 
            metricView="exempted" 
            icon={TrendingUp} 
            iconBg="rgba(8, 145, 178, 0.18)" 
            iconColor="#0891b2" 
            label="Exempted Students" 
          />

          <NavGroup title="Master Data" icon={GraduationCap} iconBg="rgba(99, 102, 241, 0.15)" iconColor="#6366f1" />
          <NavItem 
            to="/student-master" 
            icon={GraduationCap} 
            iconBg="rgba(99, 102, 241, 0.18)" 
            iconColor="#6366f1" 
            label="Student Master" 
          />
          <NavItem 
            to="/transport" 
            icon={Bus} 
            iconBg="rgba(124, 58, 237, 0.18)" 
            iconColor="#7c3aed" 
            label="Bus Transport" 
          />

          <NavGroup title="Accounts & Ledger" icon={FileSpreadsheet} iconBg="rgba(13, 148, 136, 0.15)" iconColor="#0d9488" />
          <NavItem 
            to="/ledger" 
            icon={FileSpreadsheet} 
            iconBg="rgba(13, 148, 136, 0.18)" 
            iconColor="#0d9488" 
            label="Fee Collection" 
          />
          <NavItem 
            to="/income" 
            icon={IndianRupee} 
            iconBg="rgba(22, 163, 74, 0.18)" 
            iconColor="#16a34a" 
            label="Income Ledger" 
          />
          <NavItem 
            to="/expenses" 
            icon={TrendingDown} 
            iconBg="rgba(234, 88, 12, 0.18)" 
            iconColor="#ea580c" 
            label="Expense Ledger" 
          />

          <NavGroup title="Reports" icon={BarChart3} iconBg="rgba(147, 51, 234, 0.15)" iconColor="#9333ea" />
          <NavItem 
            to="/profit-loss" 
            icon={BarChart3} 
            iconBg="rgba(147, 51, 234, 0.18)" 
            iconColor="#9333ea" 
            label="Profit & Loss" 
          />
          <NavItem 
            to="/reports" 
            icon={FileSpreadsheet} 
            iconBg="rgba(29, 78, 216, 0.18)" 
            iconColor="#1d4ed8" 
            label="Fee Reports" 
          />

          <NavGroup title="Settings & Categories" icon={Settings} iconBg="rgba(124, 58, 237, 0.15)" iconColor="#7c3aed" />
          <NavItem 
            to="/income-categories" 
            icon={Layers} 
            iconBg="rgba(5, 150, 105, 0.18)" 
            iconColor="#059669" 
            label="Income Categories" 
          />
          <NavItem 
            to="/expense-categories" 
            icon={Sliders} 
            iconBg="rgba(225, 29, 72, 0.18)" 
            iconColor="#e11d48" 
            label="Expense Categories" 
          />
          <NavItem 
            to="/fee-structures" 
            icon={Settings} 
            iconBg="rgba(124, 58, 237, 0.18)" 
            iconColor="#7c3aed" 
            label="Fee Configuration" 
          />

          <NavGroup title="Media" icon={ImageIcon} iconBg="rgba(219, 39, 119, 0.15)" iconColor="#db2777" />
          <NavItem 
            to="/gallery" 
            icon={ImageIcon} 
            iconBg="rgba(219, 39, 119, 0.18)" 
            iconColor="#db2777" 
            label="Gallery" 
          />

          {(user?.type === "admin" || user?.type === "principal" || user?.type === "super_admin") && (
            <>
              <NavGroup title="Portals" icon={ExternalLink} iconBg="rgba(2, 132, 199, 0.15)" iconColor="#0284c7" />
              <NavItem 
                to="http://localhost:5174/dashboard" 
                isExternal={true} 
                icon={ExternalLink} 
                iconBg="rgba(2, 132, 199, 0.18)" 
                iconColor="#0284c7" 
                label="Admin Portal" 
              />
              <NavItem 
                to="http://localhost:5175/dashboard" 
                isExternal={true} 
                icon={ExternalLink} 
                iconBg="rgba(139, 92, 246, 0.18)" 
                iconColor="#8b5cf6" 
                label="Admission Portal" 
              />
            </>
          )}
        </nav>

        {/* User Footer Profile */}
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--glass-border)", paddingTop: "0.75rem" }}>
          <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(27, 139, 59, 0.15)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.95rem" }}>
              {user?.name?.charAt(0) || "F"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: "0.82rem", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "Accountant"}</p>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{user?.type || "Finance"}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="btn btn-ghost" 
            style={{ width: "100%", justifyContent: "center", color: "#ef4444", fontSize: "0.8rem", padding: "0.4rem 0.5rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.06)" }}
          >
            <LogOut size={15} strokeWidth={2.4} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden", background: "var(--bg-main)" }}>
        <header style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            padding: "0.55rem 1.25rem", 
            borderBottom: "1px solid var(--glass-border)", 
            background: "rgba(255, 255, 255, 0.8)", 
            backdropFilter: "blur(12px)",
            gap: "1rem", 
            flexWrap: "wrap",
            zIndex: 10,
            flexShrink: 0
          }}>
            {/* Left: Dynamic Page Title & Section Icon Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
              {(() => {
                const path = location.pathname;
                let title = "Accounts Dashboard";
                let subtitle = "Overview of school finances and fee collections";
                let Icon = LayoutDashboard;
                let color = "#059669";
                let bg = "rgba(5, 150, 105, 0.15)";

                if (path.startsWith("/transport")) {
                  title = "Bus Master & Transport Management";
                  subtitle = "Manage student bus enrollment, monthly conveyance fees, and routes";
                  Icon = Bus;
                  color = "#7c3aed";
                  bg = "rgba(124, 58, 237, 0.15)";
                } else if (path.startsWith("/metrics")) {
                  const searchParams = new URLSearchParams(location.search);
                  const view = searchParams.get("view");
                  const titleMap = {
                    collected: "Total Collected Fees",
                    dues: "Pending Fee Dues",
                    students: "Active Students Directory",
                    exempted: "Exempted Students"
                  };
                  title = titleMap[view] || "Financial Metrics";
                  subtitle = "Detailed metric breakdown and logs";
                  Icon = IndianRupee;
                  color = "#059669";
                  bg = "rgba(5, 150, 105, 0.15)";
                } else if (path.startsWith("/student-master")) {
                  title = "Student Master Directory";
                  subtitle = "Complete student profiles and financial master records";
                  Icon = GraduationCap;
                  color = "#6366f1";
                  bg = "rgba(99, 102, 241, 0.15)";
                } else if (path.startsWith("/ledger")) {
                  title = "Fee Collection & Student Ledger";
                  subtitle = "Student dues, payment recording, and receipts";
                  Icon = FileSpreadsheet;
                  color = "#0d9488";
                  bg = "rgba(13, 148, 136, 0.15)";
                } else if (path.startsWith("/income-categories")) {
                  title = "Income Categories";
                  subtitle = "Configure income heads and accounting streams";
                  Icon = Layers;
                  color = "#059669";
                  bg = "rgba(5, 150, 105, 0.15)";
                } else if (path.startsWith("/expense-categories")) {
                  title = "Expense Categories";
                  subtitle = "Configure operational expense categories";
                  Icon = Sliders;
                  color = "#e11d48";
                  bg = "rgba(225, 29, 72, 0.15)";
                } else if (path.startsWith("/income")) {
                  title = "Income Ledger";
                  subtitle = "Record and audit non-fee receipts and other inflows";
                  Icon = IndianRupee;
                  color = "#16a34a";
                  bg = "rgba(22, 163, 74, 0.15)";
                } else if (path.startsWith("/expenses")) {
                  title = "Expense Ledger";
                  subtitle = "Track operational expenses and vendor disbursements";
                  Icon = Sliders;
                  color = "#ea580c";
                  bg = "rgba(234, 88, 12, 0.15)";
                } else if (path.startsWith("/profit-loss")) {
                  title = "Profit & Loss Statement";
                  subtitle = "Comprehensive financial statement and margins";
                  Icon = BarChart3;
                  color = "#9333ea";
                  bg = "rgba(147, 51, 234, 0.15)";
                } else if (path.startsWith("/reports")) {
                  title = "Fee & Financial Reports";
                  subtitle = "Consolidated fee summaries and defaulter statements";
                  Icon = FileSpreadsheet;
                  color = "#1d4ed8";
                  bg = "rgba(29, 78, 216, 0.15)";
                } else if (path.startsWith("/gallery")) {
                  title = "Media & Payment Receipts Gallery";
                  subtitle = "Archived payment receipts and vouchers";
                  Icon = ImageIcon;
                  color = "#db2777";
                  bg = "rgba(219, 39, 119, 0.15)";
                }

                return (
                  <>
                    <div style={{ 
                      width: "32px", 
                      height: "32px", 
                      borderRadius: "8px", 
                      background: bg, 
                      color: color, 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      flexShrink: 0 
                    }}>
                      <Icon size={18} strokeWidth={2.4} />
                    </div>
                    <div>
                      <h1 style={{ 
                        fontSize: "1.15rem", 
                        fontWeight: "800", 
                        color: "var(--text-primary)", 
                        margin: 0, 
                        letterSpacing: "-0.02em", 
                        lineHeight: 1.2,
                        whiteSpace: "nowrap" 
                      }}>
                        {title}
                      </h1>
                      <p style={{ 
                        color: "var(--text-secondary)", 
                        fontSize: "0.72rem", 
                        margin: 0,
                        whiteSpace: "nowrap"
                      }}>
                        {subtitle}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Right: Academic Year + Close Year + Date Range Picker */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", background: "white", padding: "0 0.65rem", borderRadius: "8px", border: "1px solid var(--glass-border)", height: "34px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                <Calendar size={14} style={{ color: "var(--text-secondary)", marginRight: "0.4rem" }} />
                <select 
                  value={academicYear}
                  onChange={(e) => {
                    const selectedYear = e.target.value;
                    dispatch(setAcademicYear(selectedYear));
                    if (selectedYear !== "ALL") {
                      const startYear = parseInt(selectedYear.split("-")[0]);
                      const startDate = `${startYear}-04-01`;
                      const academicEndDateObj = new Date(`${startYear + 1}-03-31`);
                      const today = new Date();
                      let endDate;
                      if (today < academicEndDateObj) {
                        endDate = today.toISOString().split('T')[0];
                      } else {
                        endDate = `${startYear + 1}-03-31`;
                      }
                      dispatch(setGlobalDateRange({ startDate, endDate }));
                    }
                  }}
                  style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.82rem", fontWeight: "600", color: "var(--text-primary)", cursor: "pointer" }}
                >
                  {generateAcademicYears().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              {(user?.type === "admin" || user?.type === "super_admin") && (
                <div>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setIsCloseYearModalOpen(true)}
                    style={{ height: "34px", padding: "0 0.85rem", fontSize: "0.8rem", background: "#ef4444", border: "none" }}
                  >
                    Close Year
                  </button>
                </div>
              )}

              <div>
                <DateRangePicker 
                  startDate={globalDateRange.startDate}
                  endDate={globalDateRange.endDate}
                  onChange={(start, end) => dispatch(setGlobalDateRange({ startDate: start, endDate: end }))}
                  defaultRange="custom"
                  academicYear={academicYear}
                />
              </div>
            </div>
          </header>

        <div style={{ flex: 1, padding: "1.25rem", overflowY: "auto", height: "100%", width: "100%" }}>
          <Outlet />
        </div>
      </main>

      <CloseYearModal 
        isOpen={isCloseYearModalOpen} 
        onClose={() => setIsCloseYearModalOpen(false)} 
        currentAcademicYear={academicYear} 
        generateAcademicYears={generateAcademicYears}
      />
    </div>
  );
};

export default FinanceLayout;
