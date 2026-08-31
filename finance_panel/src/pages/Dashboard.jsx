import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFinanceStats } from "../features/dataSlice";
import { 
  IndianRupee, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Sparkles, 
  PieChart, 
  FileSpreadsheet, 
  GraduationCap, 
  Layers, 
  Sliders, 
  Settings, 
  Image as ImageIcon, 
  ExternalLink,
  Bus,
  AlertCircle,
  Receipt,
  CheckCircle2,
  BarChart3,
  CreditCard
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const StatCard = ({ title, value, subtitle, icon: Icon, color, to, isExternal, onClick }) => {
  const cardContent = (
    <div 
      className="glass-card" 
      style={{ 
        padding: "0.8rem 0.95rem", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        gap: "0.75rem", 
        height: "100%", 
        borderRadius: "10px", 
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: (to || onClick) ? "pointer" : "default"
      }}
      onMouseEnter={e => (to || onClick) && (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={e => (to || onClick) && (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
        <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: `rgba(${color}, 0.14)`, display: "flex", alignItems: "center", justifyContent: "center", color: `rgb(${color})`, flexShrink: 0 }}>
          <Icon size={19} strokeWidth={2.4} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
            <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>
              {value}
            </h3>
            {subtitle && (
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: "600", whiteSpace: "nowrap" }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </div>
      {isExternal ? (
        <ExternalLink size={14} color="var(--text-secondary)" style={{ opacity: 0.5, flexShrink: 0 }} />
      ) : to ? (
        <ArrowRight size={15} color="var(--text-secondary)" style={{ opacity: 0.4, flexShrink: 0 }} />
      ) : null}
    </div>
  );

  if (isExternal) {
    return (
      <a href={to} style={{ textDecoration: "none" }} target="_blank" rel="noopener noreferrer">
        {cardContent}
      </a>
    );
  }

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: "none" }}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div onClick={onClick} style={{ textDecoration: "none" }}>
      {cardContent}
    </div>
  );
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { financeStats, loadingFinanceStats, globalDateRange } = useSelector((state) => state.data);
  const { academicYear } = useSelector((state) => state.settings);
  const { startDate, endDate } = globalDateRange;

  const { user } = useSelector((state) => state.auth);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [spotlightOfToday, setSpotlightOfToday] = useState(null);
  const [additionalMetrics, setAdditionalMetrics] = useState({
    incomeCategoriesCount: 0,
    expenseCategoriesCount: 0,
    feeStructuresCount: 0,
    galleryCount: 0
  });

  useEffect(() => {
    dispatch(fetchFinanceStats({ startDate, endDate, academic_year: academicYear }));
    
    const fetchDashboard = async () => {
      setLoadingDashboard(true);
      try {
        const res = await api.get(`/finance_panel/financeDashboard?startDate=${startDate || ''}&endDate=${endDate || ''}&academic_year=${academicYear || ''}`);
        if (res.data.success) {
          setDashboardData(res.data.data || res.data.dashboard);
        }
      } catch (err) {
        // Ignored if user lacks permission
      } finally {
        setLoadingDashboard(false);
      }
    };
    
    const fetchSpotlight = async () => {
      try {
        const res = await api.get("/spotlight/today");
        if (res.data?.success && res.data.data) {
          setSpotlightOfToday(res.data.data);
        }
      } catch (err) {
        console.error("No spotlight found today", err);
      }
    };

    const fetchAdditionalCounts = async () => {
      try {
        const [
          { data: incomeCat },
          { data: expenseCat },
          { data: structures },
          { data: gallery },
          { data: usersRes }
        ] = await Promise.all([
          api.get("/finance_panel/categories?type=INCOME").catch(() => ({ data: { categories: [] } })),
          api.get("/finance_panel/categories?type=EXPENSE").catch(() => ({ data: { categories: [] } })),
          api.get(`/finance_panel/feeStructures?academic_year=${academicYear || "2024-2025"}`).catch(() => ({ data: { structures: [] } })),
          api.get("/gallery").catch(() => ({ data: { data: [] } })),
          api.get("/admin_panel/users").catch(() => ({ data: { users: [] } }))
        ]);

        const allUsers = usersRes?.users || [];
        const busStudents = allUsers.filter(u => u.type === "student" && Number(u.bus_fee || 0) > 0);

        setAdditionalMetrics({
          incomeCategoriesCount: incomeCat?.categories?.length || 0,
          expenseCategoriesCount: expenseCat?.categories?.length || 0,
          feeStructuresCount: structures?.structures?.length || 0,
          galleryCount: gallery?.data?.length || 0,
          busStudentsCount: busStudents.length
        });
      } catch (e) {
        console.error("Error fetching additional counts", e);
      }
    };

    fetchDashboard();
    fetchSpotlight();
    fetchAdditionalCounts();
  }, [startDate, endDate, academicYear, dispatch]);

  const dateParams = `${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`;

  if (loadingFinanceStats || !financeStats) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading dashboard stats...</div>;
  }

  // Calculate Recovery Rate %
  const totalBillable = (financeStats.totalPaid || 0) + (financeStats.balance || 0);
  const recoveryRate = totalBillable > 0 ? Math.round(((financeStats.totalPaid || 0) / totalBillable) * 100) : 0;

  // Financial Calculations from backend dashboard object
  const totalFeeIncome = dashboardData?.totalFeeIncome ?? dashboardData?.totalFeeCollected ?? (financeStats.totalPaid || 0);
  const totalOtherIncome = dashboardData?.totalOtherIncome ?? 0;
  const totalIncome = dashboardData?.totalIncome ?? (totalFeeIncome + totalOtherIncome);
  const totalExpenses = dashboardData?.totalExpenses ?? dashboardData?.totalExpense ?? 0;
  const netRevenue = dashboardData?.netRevenue ?? (totalIncome - totalExpenses);
  const profitMargin = totalIncome > 0 ? Math.round((netRevenue / totalIncome) * 100) : 0;

  return (
    <div className="animate-fade-in" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Spotlight of the Day Banner */}
      {spotlightOfToday && (
        <div className="glass-panel" style={{ padding: "1rem 1.25rem", display: "flex", gap: "1.25rem", alignItems: "center", border: "1px solid rgba(99, 102, 241, 0.3)", background: "rgba(99, 102, 241, 0.04)", borderRadius: "12px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(99, 102, 241, 0.15)", color: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", color: "var(--primary-color)", letterSpacing: "0.08em" }}>Spotlight of the Day</span>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)", marginTop: "0.15rem", marginBottom: "0.3rem" }}>{spotlightOfToday.title}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.4", margin: 0 }}>{spotlightOfToday.description}</p>
          </div>
          {spotlightOfToday.image_url && (
            <img src={spotlightOfToday.image_url} alt="Spotlight" style={{ width: "100px", height: "70px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--glass-border)", flexShrink: 0 }} />
          )}
        </div>
      )}

      {/* Row 1: Collections & Fee Health (6 Cards) */}
      <div>
        <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.55rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", color: "#059669", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <IndianRupee size={14} strokeWidth={2.4} />
          </div>
          Collections & Fee Health
        </h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <StatCard 
            title="Total Collected" 
            value={`₹${financeStats.totalPaid.toLocaleString()}`} 
            subtitle={`${recoveryRate}% Rec.`}
            icon={IndianRupee} 
            color="16, 185, 129" 
            to={`/metrics?view=collected${dateParams}`} 
          />
          <StatCard 
            title="Pending Dues" 
            value={`₹${financeStats.balance.toLocaleString()}`} 
            subtitle="Outstanding"
            icon={TrendingDown} 
            color="239, 68, 68" 
            to={`/metrics?view=dues${dateParams}`} 
          />
          <StatCard 
            title="Active Students" 
            value={financeStats.totalStudents} 
            subtitle="Enrolled"
            icon={Users} 
            color="59, 130, 246" 
            to={`/metrics?view=students${dateParams}`} 
          />
          <StatCard 
            title="Exempted Students" 
            value={financeStats.exemptedStudents} 
            subtitle="Full/Partial"
            icon={TrendingUp} 
            color="8, 145, 178" 
            to={`/metrics?view=exempted${dateParams}`} 
          />
          <StatCard 
            title="Student Master" 
            value={`${financeStats.totalStudents}`} 
            subtitle="Profiles"
            icon={GraduationCap} 
            color="99, 102, 241" 
            to="/student-master" 
          />
          <StatCard 
            title="Fee Ledger" 
            value={`₹${financeStats.totalPaid.toLocaleString()}`} 
            subtitle="Transactions"
            icon={FileSpreadsheet} 
            color="13, 148, 136" 
            to="/ledger" 
          />
        </div>
      </div>

      {/* Row 2: Revenue, Cashflow & Profit/Loss (6 Cards) */}
      <div>
        <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.55rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.15)", color: "#6366f1", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <PieChart size={14} strokeWidth={2.4} />
          </div>
          Revenue, Cashflow & Statements
        </h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <StatCard 
            title="Net Revenue" 
            value={`₹${netRevenue.toLocaleString()}`} 
            subtitle={profitMargin >= 0 ? `+${profitMargin}%` : `${profitMargin}%`}
            icon={IndianRupee} 
            color="16, 185, 129" 
            to="/profit-loss" 
          />
          <StatCard 
            title="Total Inflow" 
            value={`₹${totalIncome.toLocaleString()}`} 
            subtitle={totalOtherIncome > 0 ? `Fees + ₹${totalOtherIncome.toLocaleString()}` : "Fees Only"}
            icon={TrendingUp} 
            color="22, 163, 74" 
            to="/income" 
          />
          <StatCard 
            title="Total Expenses" 
            value={`₹${totalExpenses.toLocaleString()}`} 
            subtitle="Operational"
            icon={TrendingDown} 
            color="234, 88, 12" 
            to="/expenses" 
          />
          <StatCard 
            title="Fee Reports" 
            value="Audits" 
            subtitle="Statements"
            icon={Receipt} 
            color="29, 78, 216" 
            to="/reports" 
          />
          <StatCard 
            title="Fee Structures" 
            value={`${additionalMetrics.feeStructuresCount} Tiers`} 
            subtitle="Configurations"
            icon={Settings} 
            color="124, 58, 237" 
            to="/fee-structures" 
          />
          <StatCard 
            title="Payment Proofs" 
            value={`${additionalMetrics.galleryCount} Files`} 
            subtitle="Gallery"
            icon={ImageIcon} 
            color="219, 39, 119" 
            to="/gallery" 
          />
        </div>
      </div>

      {/* Row 3: Operations & Categories (4 Cards) */}
      <div>
        <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.55rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(2, 132, 199, 0.15)", color: "#0284c7", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Layers size={14} strokeWidth={2.4} />
          </div>
          Operations & Categories
        </h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <StatCard 
            title="Income Categories" 
            value={`${additionalMetrics.incomeCategoriesCount}`} 
            subtitle="Active Heads"
            icon={Layers} 
            color="5, 150, 105" 
            to="/income-categories" 
          />
          <StatCard 
            title="Expense Categories" 
            value={`${additionalMetrics.expenseCategoriesCount}`} 
            subtitle="Active Heads"
            icon={Sliders} 
            color="225, 29, 72" 
            to="/expense-categories" 
          />
          <StatCard 
            title="Defaulters" 
            value="Review Dues" 
            subtitle="Overdue List"
            icon={AlertCircle} 
            color="217, 119, 6" 
            to={`/metrics?view=dues${dateParams}`} 
          />
          <StatCard 
            title="Bus Transport" 
            value={`${additionalMetrics.busStudentsCount || 0} Students`} 
            subtitle="Transport Master"
            icon={Bus} 
            color="124, 58, 237" 
            to="/transport" 
          />
        </div>
      </div>

      {/* Two-Column Visual Analytics Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "0.85rem" }}>
        {/* Cash Flow Distribution Panel */}
        <div className="glass-panel" style={{ padding: "1.15rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.6rem", borderBottom: "1px solid var(--glass-border)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", color: "#059669", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <BarChart3 size={15} strokeWidth={2.4} />
              </div>
              Cash Flow & Revenue Health
            </h3>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: profitMargin >= 0 ? "#059669" : "#dc2626", background: profitMargin >= 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)", padding: "0.2rem 0.6rem", borderRadius: "12px" }}>
              {profitMargin >= 0 ? `+${profitMargin}% Net Margin` : `${profitMargin}% Deficit`}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", flex: 1, justifyContent: "center" }}>
            {/* Fee Inflow Row */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.25rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Fee Collections (Students)</span>
                <span style={{ color: "var(--text-primary)" }}>₹{totalFeeIncome.toLocaleString()}</span>
              </div>
              <div style={{ height: "7px", background: "rgba(0,0,0,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${totalIncome > 0 ? (totalFeeIncome / totalIncome) * 100 : 100}%`, background: "#10b981", borderRadius: "4px" }}></div>
              </div>
            </div>

            {/* Other Inflow Row */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.25rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Other Income & Grants</span>
                <span style={{ color: "var(--text-primary)" }}>₹{totalOtherIncome.toLocaleString()}</span>
              </div>
              <div style={{ height: "7px", background: "rgba(0,0,0,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${totalIncome > 0 ? (totalOtherIncome / totalIncome) * 100 : 0}%`, background: "#3b82f6", borderRadius: "4px" }}></div>
              </div>
            </div>

            {/* Expenses Row */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.25rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Operating Expenses & Overheads</span>
                <span style={{ color: "#dc2626" }}>₹{totalExpenses.toLocaleString()}</span>
              </div>
              <div style={{ height: "7px", background: "rgba(0,0,0,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0}%`, background: "#ef4444", borderRadius: "4px" }}></div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "auto", paddingTop: "0.5rem", display: "flex", justifyContent: "flex-end" }}>
            <button 
              onClick={() => navigate("/profit-loss")}
              className="btn btn-ghost" 
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              Detailed P&L Statement <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Collection Recovery Rate & Defaulter Widget */}
        <div className="glass-panel" style={{ padding: "1.15rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.6rem", borderBottom: "1px solid var(--glass-border)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.15)", color: "#6366f1", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <CreditCard size={15} strokeWidth={2.4} />
              </div>
              Fee Collection Recovery Rate
            </h3>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#6366f1", background: "rgba(99, 102, 241, 0.12)", padding: "0.2rem 0.6rem", borderRadius: "12px" }}>
              {recoveryRate}% Collected
            </span>
          </div>

          {/* Meter progress */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1, justifyContent: "center" }}>
            <div style={{ height: "12px", background: "rgba(0,0,0,0.06)", borderRadius: "6px", overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${recoveryRate}%`, background: "#10b981", transition: "width 0.5s ease-out" }} title={`Collected: ${recoveryRate}%`}></div>
              <div style={{ width: `${100 - recoveryRate}%`, background: "#ef4444", opacity: 0.8, transition: "width 0.5s ease-out" }} title={`Pending: ${100 - recoveryRate}%`}></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
              <div style={{ padding: "0.5rem", background: "rgba(16, 185, 129, 0.08)", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: "700", color: "#059669", textTransform: "uppercase" }}>Collected</p>
                <h4 style={{ fontSize: "1rem", fontWeight: "800", color: "var(--text-primary)" }}>₹{financeStats.totalPaid.toLocaleString()}</h4>
              </div>
              <div style={{ padding: "0.5rem", background: "rgba(239, 68, 68, 0.08)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: "700", color: "#dc2626", textTransform: "uppercase" }}>Pending</p>
                <h4 style={{ fontSize: "1rem", fontWeight: "800", color: "var(--text-primary)" }}>₹{financeStats.balance.toLocaleString()}</h4>
              </div>
              <div style={{ padding: "0.5rem", background: "rgba(8, 145, 178, 0.08)", borderRadius: "8px", border: "1px solid rgba(8, 145, 178, 0.2)" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: "700", color: "#0891b2", textTransform: "uppercase" }}>Exemptions</p>
                <h4 style={{ fontSize: "1rem", fontWeight: "800", color: "var(--text-primary)" }}>{financeStats.exemptedStudents} St.</h4>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "auto", paddingTop: "0.5rem", display: "flex", justifyContent: "flex-end" }}>
            <button 
              onClick={() => navigate("/ledger")}
              className="btn btn-primary" 
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              Open Student Ledger <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
