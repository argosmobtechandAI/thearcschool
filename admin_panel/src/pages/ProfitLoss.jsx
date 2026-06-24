import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";
import { FileText } from "lucide-react";
import DateRangePicker from "../components/DateRangePicker";

const ProfitLoss = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // The backend uses startDate and endDate query params
      const res = await api.get(`/finance_panel/financeDashboard?startDate=${dateRange.start || ''}&endDate=${dateRange.end || ''}`);
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
    if (user?.can_view_revenue || user?.type === "admin" || user?.type === "super_admin") {
      fetchDashboardData();
    } else {
      setErrorMsg("You do not have permission to view Profit & Loss data. Contact Administrator.");
    }
  }, [dateRange, user]);

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

  if (errorMsg) {
    return (
      <div className="animate-fade-in" style={{ padding: "3rem", textAlign: "center" }}>
        <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "1.5rem", borderRadius: "12px", display: "inline-block" }}>
          {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>Profit & Loss</h1>
          <p style={{ color: "var(--text-secondary)" }}>Detailed statement of income and expenses</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <DateRangePicker onRangeChange={setDateRange} />
          <button className="btn-ghost" onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={18} /> Print
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading statement...</div>
      ) : data ? (
        <div className="glass-panel" style={{ padding: "2rem", '@media print': { border: 'none', boxShadow: 'none' } }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)" }}>Income Statement</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              Period: {dateRange.start ? new Date(dateRange.start).toLocaleDateString() : 'Start'} to {dateRange.end ? new Date(dateRange.end).toLocaleDateString() : 'End'}
            </p>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {/* === REVENUE SECTION === */}
              <tr>
                <td colSpan="2" style={{ padding: "0.75rem 0", fontSize: "1.125rem", fontWeight: "700", color: "var(--text-primary)", borderBottom: "2px solid var(--glass-border)" }}>
                  Operating Revenue
                </td>
              </tr>
              <tr>
                <td style={{ padding: "0.75rem 0 0.75rem 1rem", color: "var(--text-secondary)" }}>Total Fee Collection</td>
                <td style={{ padding: "0.75rem 0", textAlign: "right", fontWeight: "500" }}>₹{data.totalFeeIncome.toLocaleString()}</td>
              </tr>
              {Object.entries(categorizedIncome).map(([category, amount]) => (
                <tr key={category}>
                  <td style={{ padding: "0.75rem 0 0.75rem 1rem", color: "var(--text-secondary)" }}>{category}</td>
                  <td style={{ padding: "0.75rem 0", textAlign: "right", fontWeight: "500" }}>₹{amount.toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{ background: "rgba(16, 185, 129, 0.05)" }}>
                <td style={{ padding: "1rem", fontWeight: "700", color: "#10b981" }}>Total Gross Revenue</td>
                <td style={{ padding: "1rem", textAlign: "right", fontWeight: "700", color: "#10b981", fontSize: "1.125rem" }}>₹{data.totalIncome.toLocaleString()}</td>
              </tr>

              {/* === EXPENSE SECTION === */}
              <tr>
                <td colSpan="2" style={{ padding: "2rem 0 0.75rem 0", fontSize: "1.125rem", fontWeight: "700", color: "var(--text-primary)", borderBottom: "2px solid var(--glass-border)" }}>
                  Operating Expenses
                </td>
              </tr>
              {Object.keys(categorizedExpenses).length === 0 ? (
                <tr>
                  <td colSpan="2" style={{ padding: "1rem", textAlign: "center", color: "var(--text-secondary)", fontStyle: "italic" }}>No expenses recorded</td>
                </tr>
              ) : (
                Object.entries(categorizedExpenses).map(([category, amount]) => (
                  <tr key={category}>
                    <td style={{ padding: "0.75rem 0 0.75rem 1rem", color: "var(--text-secondary)" }}>{category}</td>
                    <td style={{ padding: "0.75rem 0", textAlign: "right", fontWeight: "500" }}>₹{amount.toLocaleString()}</td>
                  </tr>
                ))
              )}
              <tr style={{ background: "rgba(239, 68, 68, 0.05)" }}>
                <td style={{ padding: "1rem", fontWeight: "700", color: "#ef4444" }}>Total Operating Expenses</td>
                <td style={{ padding: "1rem", textAlign: "right", fontWeight: "700", color: "#ef4444", fontSize: "1.125rem" }}>₹{data.totalExpenses.toLocaleString()}</td>
              </tr>

              {/* === NET PROFIT === */}
              <tr>
                <td colSpan="2" style={{ padding: "1rem" }}></td>
              </tr>
              <tr style={{ borderTop: "3px double var(--glass-border)", borderBottom: "3px double var(--glass-border)" }}>
                <td style={{ padding: "1.25rem 0", fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)" }}>Net Profit / (Loss)</td>
                <td style={{ padding: "1.25rem 0", textAlign: "right", fontSize: "1.25rem", fontWeight: "800", color: data.netRevenue >= 0 ? "#10b981" : "#ef4444" }}>
                  ₹{data.netRevenue.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default ProfitLoss;
