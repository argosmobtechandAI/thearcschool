import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink, useLocation, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, LayoutDashboard, FileSpreadsheet, BarChart, Settings, ExternalLink, IndianRupee, TrendingDown, TrendingUp, Users, Image as ImageIcon, Calendar } from "lucide-react";
import { logout } from "../features/authSlice";
import { setGlobalDateRange } from "../features/dataSlice";
import { setAcademicYear } from "../features/settingsSlice";
import DateRangePicker from "../components/DateRangePicker";
import CloseYearModal from "../components/CloseYearModal";

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
        // Format today as YYYY-MM-DD
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

          <NavGroup title="Media" />
          <NavLink to="/gallery" style={navLinkStyle}><ImageIcon size={16} /> Gallery</NavLink>

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
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "-2.5rem", position: "relative", zIndex: 10, pointerEvents: "none", gap: "1rem" }}>
              <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", background: "white", padding: "0 0.75rem", borderRadius: "8px", border: "1px solid var(--glass-border)", height: "38px" }}>
                <Calendar size={16} style={{ color: "var(--text-secondary)", marginRight: "0.5rem" }} />
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
                  style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.875rem", fontWeight: "500", color: "var(--text-primary)", cursor: "pointer" }}
                >
                  {generateAcademicYears().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              {(user?.type === "admin" || user?.type === "super_admin") && (
                <div style={{ pointerEvents: "auto" }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setIsCloseYearModalOpen(true)}
                    style={{ height: "38px", background: "#ef4444", border: "none" }}
                  >
                    Close Year
                  </button>
                </div>
              )}

              <div style={{ pointerEvents: "auto" }}>
                <DateRangePicker 
                  startDate={globalDateRange.startDate}
                  endDate={globalDateRange.endDate}
                  onChange={(start, end) => dispatch(setGlobalDateRange({ startDate: start, endDate: end }))}
                  defaultRange="custom" // Prevent internal overwrite of MTD
                  academicYear={academicYear}
                />
              </div>
            </div>
          )}
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
