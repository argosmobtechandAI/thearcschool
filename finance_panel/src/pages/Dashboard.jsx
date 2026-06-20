import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFinanceStats } from "../features/dataSlice";
import { IndianRupee, Users, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";


const Dashboard = () => {
  const dispatch = useDispatch();
  const { financeStats, loadingFinanceStats, globalDateRange } = useSelector((state) => state.data);
  const { startDate, endDate } = globalDateRange;

  const { user } = useSelector((state) => state.auth);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  useEffect(() => {
    dispatch(fetchFinanceStats({ startDate, endDate }));
    
    const fetchDashboard = async () => {
      setLoadingDashboard(true);
      try {
        const res = await api.get(`/finance_panel/financeDashboard?startDate=${startDate || ''}&endDate=${endDate || ''}`);
        if (res.data.success) {
          setDashboardData(res.data.data);
        }
      } catch (err) {
        console.error("Dashboard data error", err);
      } finally {
        setLoadingDashboard(false);
      }
    };
    
    if (user?.can_view_revenue || user?.type === 'admin') {
      fetchDashboard();
    }
  }, [dispatch, startDate, endDate, user]);

  const dateParams = `${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`;

  if (loadingFinanceStats || !financeStats) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading dashboard stats...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>Accounts Dashboard</h1>
          <p style={{ color: "var(--text-secondary)" }}>Overview of school finances and fee collections.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <Link to={`/metrics?view=collected${dateParams}`} style={{ textDecoration: "none" }} className="hover-scale">
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                <IndianRupee size={24} />
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase" }}>Total Collected</p>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>₹{financeStats.totalPaid.toLocaleString()}</h3>
              </div>
            </div>
            <ArrowRight size={20} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
          </div>
        </Link>

        <Link to={`/metrics?view=dues${dateParams}`} style={{ textDecoration: "none" }} className="hover-scale">
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
                <TrendingDown size={24} />
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase" }}>Pending Dues</p>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>₹{financeStats.balance.toLocaleString()}</h3>
              </div>
            </div>
            <ArrowRight size={20} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
          </div>
        </Link>

        <Link to={`/metrics?view=students${dateParams}`} style={{ textDecoration: "none" }} className="hover-scale">
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-primary)" }}>
                <Users size={24} />
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase" }}>Active Students</p>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>{financeStats.totalStudents}</h3>
              </div>
            </div>
            <ArrowRight size={20} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
          </div>
        </Link>

        <Link to={`/metrics?view=exempted${dateParams}`} style={{ textDecoration: "none" }} className="hover-scale">
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase" }}>Exempted</p>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>{financeStats.exemptedStudents}</h3>
              </div>
            </div>
            <ArrowRight size={20} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
          </div>
        </Link>
      </div>

      {(user?.can_view_revenue || user?.type === 'admin') && dashboardData && (
        <>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "1.5rem", marginTop: "2rem" }}>Revenue Overview</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
                <IndianRupee size={24} />
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase" }}>Net Revenue</p>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>₹{dashboardData.totalRevenue?.toLocaleString() || 0}</h3>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase" }}>Total Income</p>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>₹{((dashboardData.totalFeeCollected || 0) + (dashboardData.totalIncome || 0)).toLocaleString()}</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Fees: ₹{dashboardData.totalFeeCollected || 0} + Other: ₹{dashboardData.totalIncome || 0}</p>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
                <TrendingDown size={24} />
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase" }}>Total Expenses</p>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>₹{dashboardData.totalExpense?.toLocaleString() || 0}</h3>
              </div>
            </div>
          </div>
        </>
      )}

      {/* <div className="glass-panel" style={{ padding: "2rem" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem" }}>Welcome to the Finance Panel</h3>
        <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          This module is designed for the manual collection of fees. Given the rural context of the school, online payment gateways are not integrated. 
          Use the <strong>Student Ledger</strong> from the sidebar to view individual student dues, record cash or cheque payments, and manage fee exemptions.
        </p>
      </div> */}
    </div>
  );
};

export default Dashboard;
