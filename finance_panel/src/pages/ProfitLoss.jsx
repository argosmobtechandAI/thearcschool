import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";
import { 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  FileSpreadsheet, 
  Printer, 
  Layers, 
  PieChart, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const ProfitLoss = () => {
  const { user } = useSelector((state) => state.auth);
  const { globalDateRange } = useSelector((state) => state.data);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { startDate, endDate } = globalDateRange;
      const res = await api.get(`/finance_panel/financeDashboard?startDate=${startDate || ''}&endDate=${endDate || ''}`);
      if (res.data.success) {
        setData(res.data.dashboard);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setErrorMsg("You do not have permission to view Profit & Loss data. Contact Administrator.");
      } else {
        toast.error("Failed to load Profit & Loss data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [globalDateRange]);

  const categorizedIncome = useMemo(() => {
    if (!data?.incomes) return {};
    const acc = {};
    data.incomes.forEach(i => {
      const catName = i.category?.name || "Uncategorized";
      acc[catName] = (acc[catName] || 0) + Number(i.amount);
    });
    return acc;
  }, [data]);

  const categorizedExpenses = useMemo(() => {
    if (!data?.expenses) return {};
    const acc = {};
    data.expenses.forEach(e => {
      const catName = e.category?.name || "Uncategorized";
      acc[catName] = (acc[catName] || 0) + Number(e.amount);
    });
    return acc;
  }, [data]);

  const totalIncome = data?.totalIncome || 0;
  const totalExpenses = data?.totalExpenses || 0;
  const netRevenue = data?.netRevenue || (totalIncome - totalExpenses);
  const profitMargin = totalIncome > 0 ? Math.round((netRevenue / totalIncome) * 100) : 0;

  const handleExportPDF = () => {
    const headers = ["Category / Stream", "Type", "Amount (₹)"];
    const rows = [
      ["Student Fee Collections", "Operating Revenue", `₹${(data?.totalFeeIncome || 0).toLocaleString()}`],
      ...Object.entries(categorizedIncome).map(([cat, val]) => [cat, "Other Inflow", `₹${Number(val).toLocaleString()}`]),
      ["TOTAL GROSS REVENUE", "Total Inflow", `₹${totalIncome.toLocaleString()}`],
      ...Object.entries(categorizedExpenses).map(([cat, val]) => [cat, "Operating Expense", `₹${Number(val).toLocaleString()}`]),
      ["TOTAL OPERATING EXPENSES", "Total Expense", `₹${totalExpenses.toLocaleString()}`],
      ["NET OPERATING PROFIT / (LOSS)", "Net Balance", `₹${netRevenue.toLocaleString()}`]
    ];
    exportToPDF(headers, rows, "Profit & Loss Financial Statement", "Profit_Loss_Statement");
  };

  const handleExportExcel = () => {
    const rows = [
      { Stream: "Student Fee Collections", Classification: "Operating Revenue", Amount: data?.totalFeeIncome || 0 },
      ...Object.entries(categorizedIncome).map(([cat, val]) => ({ Stream: cat, Classification: "Other Inflow", Amount: Number(val) })),
      { Stream: "TOTAL GROSS REVENUE", Classification: "Total Inflow", Amount: totalIncome },
      ...Object.entries(categorizedExpenses).map(([cat, val]) => ({ Stream: cat, Classification: "Operating Expense", Amount: Number(val) })),
      { Stream: "TOTAL OPERATING EXPENSES", Classification: "Total Expense", Amount: totalExpenses },
      { Stream: "NET OPERATING PROFIT / (LOSS)", Classification: "Net Balance", Amount: netRevenue }
    ];
    exportToExcel(rows, "Profit_Loss_Statement");
  };

  if (errorMsg) {
    return (
      <div className="animate-fade-in" style={{ padding: "3rem", textAlign: "center", width: "100%" }}>
        <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "1.5rem", borderRadius: "12px", display: "inline-block" }}>
          {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Top Utility Bar with Statement Period & Action Buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: "600" }}>
            Statement Period: <strong style={{ color: "var(--text-primary)" }}>{globalDateRange.startDate ? new Date(globalDateRange.startDate).toLocaleDateString() : 'Start'} to {globalDateRange.endDate ? new Date(globalDateRange.endDate).toLocaleDateString() : 'End'}</strong>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button 
            className="btn btn-ghost" 
            onClick={handleExportExcel} 
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: "0.4rem 0.8rem", background: "white", border: "1px solid var(--glass-border)" }}
          >
            <FileSpreadsheet size={15} color="#16a34a" /> Export Excel
          </button>
          <button 
            className="btn btn-ghost" 
            onClick={handleExportPDF} 
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: "0.4rem 0.8rem", background: "white", border: "1px solid var(--glass-border)" }}
          >
            <FileText size={15} color="#dc2626" /> Export PDF
          </button>
          <button 
            className="btn btn-ghost" 
            onClick={() => window.print()} 
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: "0.4rem 0.8rem", background: "white", border: "1px solid var(--glass-border)" }}
          >
            <Printer size={15} color="#6366f1" /> Print Report
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading financial statement...</div>
      ) : data ? (
        <>
          {/* 4 Summary Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
            <div className="glass-card" style={{ padding: "0.85rem 1.1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: "rgba(16, 185, 129, 0.15)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ArrowUpRight size={20} strokeWidth={2.4} />
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Total Gross Revenue</p>
                <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1.2 }}>₹{totalIncome.toLocaleString()}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ padding: "0.85rem 1.1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ArrowDownRight size={20} strokeWidth={2.4} />
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Operating Expenses</p>
                <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#dc2626", lineHeight: 1.2 }}>₹{totalExpenses.toLocaleString()}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ padding: "0.85rem 1.1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: netRevenue >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", color: netRevenue >= 0 ? "#059669" : "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IndianRupee size={20} strokeWidth={2.4} />
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Net Operating Balance</p>
                <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: netRevenue >= 0 ? "#059669" : "#dc2626", lineHeight: 1.2 }}>₹{netRevenue.toLocaleString()}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ padding: "0.85rem 1.1rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "10px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "9px", background: "rgba(99, 102, 241, 0.15)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PieChart size={20} strokeWidth={2.4} />
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.15rem" }}>Operating Profit Margin</p>
                <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: profitMargin >= 0 ? "#059669" : "#dc2626", lineHeight: 1.2 }}>{profitMargin >= 0 ? `+${profitMargin}%` : `${profitMargin}%`}</h3>
              </div>
            </div>
          </div>

          {/* Full Canvas 2-Column Ledger Panels: Revenue & Expenses */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1rem" }}>
            {/* Left: Operating Revenue Streams */}
            <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.6rem", borderBottom: "2px solid rgba(16, 185, 129, 0.2)" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", color: "#059669", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <TrendingUp size={14} strokeWidth={2.4} />
                  </div>
                  Operating Revenue (Inflows)
                </h3>
                <span style={{ fontSize: "0.8rem", fontWeight: "800", color: "#059669" }}>
                  ₹{totalIncome.toLocaleString()}
                </span>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "0.75rem 0", fontWeight: "600", color: "var(--text-primary)" }}>Student Fee Collections</td>
                    <td style={{ padding: "0.75rem 0", textAlign: "right", fontWeight: "700", color: "var(--text-primary)" }}>₹{(data.totalFeeIncome || 0).toLocaleString()}</td>
                  </tr>
                  {Object.entries(categorizedIncome).map(([category, amount]) => (
                    <tr key={category} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <td style={{ padding: "0.75rem 0", color: "var(--text-secondary)" }}>{category}</td>
                      <td style={{ padding: "0.75rem 0", textAlign: "right", fontWeight: "600", color: "var(--text-primary)" }}>₹{Number(amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {Object.keys(categorizedIncome).length === 0 && (
                    <tr>
                      <td colSpan="2" style={{ padding: "0.75rem 0", color: "var(--text-secondary)", fontSize: "0.8rem", fontStyle: "italic" }}>
                        No additional non-fee income recorded for this period.
                      </td>
                    </tr>
                  )}
                  <tr style={{ background: "rgba(16, 185, 129, 0.08)", borderRadius: "8px" }}>
                    <td style={{ padding: "0.85rem 0.75rem", fontWeight: "800", color: "#059669", borderTop: "2px solid rgba(16, 185, 129, 0.3)" }}>Total Gross Revenue</td>
                    <td style={{ padding: "0.85rem 0.75rem", textAlign: "right", fontWeight: "800", color: "#059669", fontSize: "1.1rem", borderTop: "2px solid rgba(16, 185, 129, 0.3)" }}>₹{totalIncome.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Operating Expenses */}
            <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.6rem", borderBottom: "2px solid rgba(239, 68, 68, 0.2)" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <TrendingDown size={14} strokeWidth={2.4} />
                  </div>
                  Operating Expenses (Disbursements)
                </h3>
                <span style={{ fontSize: "0.8rem", fontWeight: "800", color: "#dc2626" }}>
                  ₹{totalExpenses.toLocaleString()}
                </span>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <tbody>
                  {Object.keys(categorizedExpenses).length === 0 ? (
                    <tr>
                      <td colSpan="2" style={{ padding: "1.5rem 0", textAlign: "center", color: "var(--text-secondary)", fontStyle: "italic" }}>
                        No operating expenses recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(categorizedExpenses).map(([category, amount]) => (
                      <tr key={category} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                        <td style={{ padding: "0.75rem 0", color: "var(--text-secondary)" }}>{category}</td>
                        <td style={{ padding: "0.75rem 0", textAlign: "right", fontWeight: "600", color: "#dc2626" }}>₹{Number(amount).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                  <tr style={{ background: "rgba(239, 68, 68, 0.08)", borderRadius: "8px" }}>
                    <td style={{ padding: "0.85rem 0.75rem", fontWeight: "800", color: "#dc2626", borderTop: "2px solid rgba(239, 68, 68, 0.3)" }}>Total Operating Expenses</td>
                    <td style={{ padding: "0.85rem 0.75rem", textAlign: "right", fontWeight: "800", color: "#dc2626", fontSize: "1.1rem", borderTop: "2px solid rgba(239, 68, 68, 0.3)" }}>₹{totalExpenses.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Consolidated Statement Card */}
          <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: "2px solid var(--glass-border)", background: "white", borderRadius: "12px", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.05em" }}>Consolidated Summary</span>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--text-primary)", margin: "0.2rem 0 0 0" }}>Net Profit / (Loss) for the Period</h2>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "700", color: netRevenue >= 0 ? "#059669" : "#dc2626", background: netRevenue >= 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)", padding: "0.25rem 0.65rem", borderRadius: "12px", display: "inline-block", marginBottom: "0.3rem" }}>
                {netRevenue >= 0 ? `+${profitMargin}% Net Margin` : `${profitMargin}% Deficit`}
              </span>
              <h1 style={{ fontSize: "2rem", fontWeight: "900", color: netRevenue >= 0 ? "#059669" : "#dc2626", margin: 0, lineHeight: 1 }}>
                ₹{netRevenue.toLocaleString()}
              </h1>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ProfitLoss;
