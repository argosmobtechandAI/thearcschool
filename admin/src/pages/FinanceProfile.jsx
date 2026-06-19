import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Mail, MapPin, IndianRupee, Hash } from "lucide-react";
import api from "../services/api";
import { toast } from "react-toastify";
import TableFilterHeader from "../components/TableFilterHeader";
import { useSortableData } from "../hooks/useSortableData";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const FinanceProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [accountant, setAccountant] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Table State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColumns, setSelectedColumns] = useState(["date", "student_name", "admission_number", "fee_type", "amount_paid", "payment_mode", "remarks"]);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // Fetch Accountant User Details
      const userRes = await api.get(`/user/getUserById/${id}`);
      if (userRes.data.success) {
        setAccountant(userRes.data.user);
      }

      // Fetch Stats
      const statsRes = await api.get(`/finance_panel/accountant/${id}/stats`);
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const payments = stats?.payments || [];

  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      (p.student?.name && p.student.name.toLowerCase().includes(search)) ||
      (p.student?.admission_number && String(p.student.admission_number).toLowerCase().includes(search)) ||
      (p.fee?.title && p.fee.title.toLowerCase().includes(search))
    );
  });

  const { items: sortedData, requestSort, sortConfig } = useSortableData(filteredPayments);

  const exportColumnsList = [
    { key: "date", label: "Date" },
    { key: "student_name", label: "Student Name" },
    { key: "admission_number", label: "Admission No" },
    { key: "fee_type", label: "Fee Type" },
    { key: "amount_paid", label: "Amount Paid" },
    { key: "payment_mode", label: "Mode" },
    { key: "remarks", label: "Remarks" }
  ];

  const handleExportExcel = () => {
    const dataToExport = sortedData.map(p => ({
      date: new Date(p.created_at).toLocaleDateString(),
      student_name: p.student?.name || "N/A",
      admission_number: p.student?.admission_number || "-",
      fee_type: p.fee?.title || "Unknown Fee",
      amount_paid: p.amount_paid,
      payment_mode: p.payment_mode,
      remarks: p.remarks || ""
    }));
    exportToExcel(dataToExport, exportColumnsList, `Accountant_${accountant?.name || 'Ledger'}`);
  };

  const handleExportPDF = () => {
    const dataToExport = sortedData.map(p => [
      new Date(p.created_at).toLocaleDateString(),
      p.student?.name || "N/A",
      p.student?.admission_number || "-",
      p.fee?.title || "Unknown Fee",
      `Rs ${p.amount_paid}`,
      p.payment_mode,
      p.remarks || ""
    ]);
    exportToPDF(exportColumnsList.map(c => c.label), dataToExport, `Accountant_${accountant?.name || 'Ledger'}`, `Ledger for ${accountant?.name}`);
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Profile...</div>;
  if (!accountant) return <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>Accountant not found!</div>;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: "0.5rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Accountant Profile
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>View details and collection ledger for this finance user.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", marginBottom: "2rem", alignItems: "start" }}>
        {/* Profile Card */}
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: "700", marginBottom: "1rem" }}>
            {accountant.name?.charAt(0) || "F"}
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.25rem" }}>{accountant.name}</h2>
          <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "4px 12px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1.5rem" }}>
            {accountant.type}
          </span>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              <Mail size={16} /> <span style={{ wordBreak: "break-all" }}>{accountant.email}</span>
            </div>
            {accountant.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                <Phone size={16} /> <span>{accountant.phone}</span>
              </div>
            )}
            {accountant.address && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                <MapPin size={16} style={{ flexShrink: 0, marginTop: "2px" }} /> <span>{accountant.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IndianRupee size={28} />
            </div>
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Total Collected</p>
              <h3 style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1 }}>₹{stats?.totalCollected?.toLocaleString() || 0}</h3>
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Hash size={28} />
            </div>
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Transactions</p>
              <h3 style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1 }}>{stats?.totalTransactions || 0}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem" }}>Collection Ledger</h3>
        
        <TableFilterHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search student or fee type..."
          filters={[]}
          exportColumns={exportColumnsList}
          selectedColumns={selectedColumns}
          setSelectedColumns={setSelectedColumns}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />

        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)" }}>
                {selectedColumns.includes("date") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer" }} onClick={() => requestSort("created_at")}>DATE</th>}
                {selectedColumns.includes("student_name") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>STUDENT</th>}
                {selectedColumns.includes("admission_number") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>ADM NO</th>}
                {selectedColumns.includes("fee_type") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>FEE TYPE</th>}
                {selectedColumns.includes("amount_paid") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>AMOUNT PAID</th>}
                {selectedColumns.includes("payment_mode") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>MODE</th>}
                {selectedColumns.includes("remarks") && <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>REMARKS</th>}
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr><td colSpan={selectedColumns.length} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No transactions found.</td></tr>
              ) : (
                sortedData.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s" }} className="hover-row">
                    {selectedColumns.includes("date") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{new Date(p.created_at).toLocaleDateString()}</td>}
                    {selectedColumns.includes("student_name") && <td style={{ padding: "1rem", color: "var(--text-primary)", fontWeight: "500" }}>{p.student?.name || "N/A"}</td>}
                    {selectedColumns.includes("admission_number") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{p.student?.admission_number || "-"}</td>}
                    {selectedColumns.includes("fee_type") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{p.fee?.title || "Fee"}</td>}
                    {selectedColumns.includes("amount_paid") && <td style={{ padding: "1rem", color: "#10b981", fontWeight: "600" }}>₹{p.amount_paid}</td>}
                    {selectedColumns.includes("payment_mode") && <td style={{ padding: "1rem" }}><span style={{ background: "white", padding: "2px 8px", borderRadius: "6px", border: "1px solid var(--glass-border)", fontSize: "0.75rem" }}>{p.payment_mode}</span></td>}
                    {selectedColumns.includes("remarks") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{p.remarks || "-"}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceProfile;
