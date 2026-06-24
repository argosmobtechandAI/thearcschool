import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Search, FileText, CheckCircle, Clock, XCircle, X, Download, Printer } from "lucide-react";
import { fetchClasses } from "../features/dataSlice";
import { createConsent, getConsents, getConsentReport, updateConsent, deleteConsent } from "../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "../index.css"; // assuming standard styles are loaded

const Consents = () => {
  const dispatch = useDispatch();
  const { classes } = useSelector((state) => state.data);

  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterClass, setFilterClass] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newConsent, setNewConsent] = useState({ title: "", description: "", class_id: "", event_date: "" });

  const [selectedConsent, setSelectedConsent] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'student_name', direction: 'asc' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editConsent, setEditConsent] = useState(null);

  useEffect(() => {
    dispatch(fetchClasses());
    loadConsents();
  }, []);

  const loadConsents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClass) params.class_id = filterClass;
      if (filterDate) params.date = filterDate;
      const res = await getConsents(params);
      setConsents(res.data.data || []);
    } catch (err) {
      console.error("Failed to load consents", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadConsents();
  }, [filterClass, filterDate]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createConsent(newConsent);
      setShowCreateModal(false);
      setNewConsent({ title: "", description: "", class_id: "", event_date: "" });
      loadConsents();
    } catch (err) {
      console.error("Failed to create consent", err);
      alert(err.response?.data?.message || "Failed to create consent");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateConsent(editConsent.id, editConsent);
      setShowEditModal(false);
      setEditConsent(null);
      loadConsents();
    } catch (err) {
      console.error("Failed to update consent", err);
      alert(err.response?.data?.message || "Failed to update consent");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this consent? This will also remove all student responses for it.")) {
      try {
        await deleteConsent(id);
        loadConsents();
      } catch (err) {
        console.error("Failed to delete consent", err);
        alert(err.response?.data?.message || "Failed to delete consent");
      }
    }
  };

  const openReport = async (id) => {
    setShowReportModal(true);
    setReportLoading(true);
    try {
      const res = await getConsentReport(id);
      setReportData(res.data.data);
    } catch (err) {
      console.error("Failed to load report", err);
    }
    setReportLoading(false);
  };

  const getSortedResponses = () => {
    if (!reportData?.responses) return [];
    const sortableItems = [...reportData.responses];
    sortableItems.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      switch (sortConfig.key) {
        case 'student_name':
          aVal = a.student?.name || '';
          bVal = b.student?.name || '';
          break;
        case 'roll_no':
          aVal = a.student?.admission_number || '';
          bVal = b.student?.admission_number || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'responded_on':
          aVal = a.responded_at ? new Date(a.responded_at).getTime() : 0;
          bVal = b.responded_at ? new Date(b.responded_at).getTime() : 0;
          break;
        default:
          break;
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportMainXLS = () => {
    if (!consents.length) return;
    const wsData = consents.map((consent, index) => ({
      "S.No.": index + 1,
      "Title": consent.title,
      "Class": `${consent.class?.name || ''} ${consent.class?.section || ''}`.trim(),
      "Event Date": consent.event_date ? new Date(consent.event_date).toLocaleDateString() : 'N/A',
      "Created At": new Date(consent.created_at).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consents");
    XLSX.writeFile(wb, "Student_Consents.xlsx");
  };

  const exportMainPDF = () => {
    if (!consents.length) return;
    const doc = new jsPDF();
    doc.text("Student Consents", 14, 15);
    
    const tableColumn = ["S.No.", "Title", "Class", "Event Date", "Created At"];
    const tableRows = consents.map((consent, index) => [
      index + 1,
      consent.title,
      `${consent.class?.name || ''} ${consent.class?.section || ''}`.trim(),
      consent.event_date ? new Date(consent.event_date).toLocaleDateString() : 'N/A',
      new Date(consent.created_at).toLocaleDateString()
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.save("Student_Consents.pdf");
  };

  const exportXLS = () => {
    if (!reportData?.responses) return;
    const sorted = getSortedResponses();
    const wsData = sorted.map((res, index) => ({
      "S.No.": index + 1,
      "Student Name": res.student?.name || '-',
      "Roll No": res.student?.admission_number || '-',
      "Status": res.status || 'pending',
      "Responded On": res.responded_at ? new Date(res.responded_at).toLocaleString() : '-'
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consent Report");
    XLSX.writeFile(wb, `${reportData.consent.title || 'Consent'}_Report.xlsx`);
  };

  const exportPDF = () => {
    if (!reportData?.responses) return;
    const doc = new jsPDF();
    doc.text(`Consent Report: ${reportData.consent.title}`, 14, 15);
    
    const sorted = getSortedResponses();
    const tableColumn = ["S.No.", "Student Name", "Roll No", "Status", "Responded On"];
    const tableRows = [];
    
    sorted.forEach((res, index) => {
      const rowData = [
        index + 1,
        res.student?.name || '-',
        res.student?.admission_number || '-',
        res.status || 'pending',
        res.responded_at ? new Date(res.responded_at).toLocaleString() : '-'
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.save(`${reportData.consent.title || 'Consent'}_Report.pdf`);
  };

  return (
    <div className="page-container" style={{ padding: "2rem", height: "100vh", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)" }}>Student Consents</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage parent/student approvals for events & activities</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={exportMainXLS} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "white", border: "1px solid var(--border-color, #e5e7eb)", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "500", color: "var(--text-primary)" }}>
            <Download size={20} /> Export XLS
          </button>
          <button onClick={exportMainPDF} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "white", border: "1px solid var(--border-color, #e5e7eb)", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "500", color: "var(--text-primary)" }}>
            <Printer size={20} /> Export PDF
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              background: "var(--primary-color, #4f46e5)",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: "500",
              boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)"
            }}
          >
            <Plus size={20} />
            Create Consent
          </button>
        </div>
      </div>

      <div style={{
        background: "var(--surface-color, white)",
        padding: "1.5rem",
        borderRadius: "1rem",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        marginBottom: "2rem"
      }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
              Filter by Class
            </label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={{
                width: "100%", padding: "0.75rem", borderRadius: "0.5rem",
                border: "1px solid var(--border-color, #e5e7eb)", outline: "none",
                background: "var(--background-color, #f9fafb)"
              }}
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.section}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
              Filter by Event Date
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{
                width: "100%", padding: "0.75rem", borderRadius: "0.5rem",
                border: "1px solid var(--border-color, #e5e7eb)", outline: "none",
                background: "var(--background-color, #f9fafb)"
              }}
            />
          </div>
          <button
            onClick={() => { setFilterClass(""); setFilterDate(""); }}
            style={{
              padding: "0.75rem 1.5rem", borderRadius: "0.5rem", border: "1px solid var(--border-color)",
              background: "transparent", cursor: "pointer", color: "var(--text-secondary)", fontWeight: "500"
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div style={{
        background: "var(--surface-color, white)",
        borderRadius: "1rem",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        overflow: "hidden"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--background-color, #f9fafb)", borderBottom: "1px solid var(--border-color, #e5e7eb)" }}>
              <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>S.No.</th>
              <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>Title</th>
              <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>Class</th>
              <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>Event Date</th>
              <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>Created At</th>
              <th style={{ padding: "1rem 1.5rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading...</td></tr>
            ) : consents.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No consents found</td></tr>
            ) : (
              consents.map((consent, index) => (
                <tr key={consent.id} style={{ borderBottom: "1px solid var(--border-color, #e5e7eb)" }}>
                  <td style={{ padding: "1rem 1.5rem", color: "var(--text-secondary)" }}>{index + 1}</td>
                  <td style={{ padding: "1rem 1.5rem", fontWeight: "500" }}>{consent.title}</td>
                  <td style={{ padding: "1rem 1.5rem", color: "var(--text-secondary)" }}>{consent.class?.name} {consent.class?.section}</td>
                  <td style={{ padding: "1rem 1.5rem", color: "var(--text-secondary)" }}>{consent.event_date ? new Date(consent.event_date).toLocaleDateString() : 'N/A'}</td>
                  <td style={{ padding: "1rem 1.5rem", color: "var(--text-secondary)" }}>{new Date(consent.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => {
                          setEditConsent(consent);
                          setShowEditModal(true);
                        }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem",
                          background: "var(--primary-light, #eef2ff)", color: "var(--primary-color, #4f46e5)",
                          border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "500", fontSize: "0.875rem"
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(consent.id)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem",
                          background: "#fee2e2", color: "#dc2626",
                          border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "500", fontSize: "0.875rem"
                        }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => openReport(consent.id)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem",
                          background: "var(--primary-light, #eef2ff)", color: "var(--primary-color, #4f46e5)",
                          border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "500", fontSize: "0.875rem"
                        }}
                      >
                        <FileText size={16} /> View Report
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "1rem", width: "100%", maxWidth: "500px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-color, #e5e7eb)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600" }}>Create New Consent</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={24} color="#6b7280" /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: "1.5rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Title</label>
                <input
                  type="text" required value={newConsent.title}
                  onChange={e => setNewConsent({...newConsent, title: e.target.value})}
                  className="input-glass"
                  placeholder="e.g. Zoo Field Trip"
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Class</label>
                <select
                  required value={newConsent.class_id}
                  onChange={e => setNewConsent({...newConsent, class_id: e.target.value})}
                  className="input-glass"
                >
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Event Date</label>
                <input
                  type="date" value={newConsent.event_date}
                  onChange={e => setNewConsent({...newConsent, event_date: e.target.value})}
                  className="input-glass"
                />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Description / Instructions</label>
                <textarea
                  rows="3" value={newConsent.description}
                  onChange={e => setNewConsent({...newConsent, description: e.target.value})}
                  className="input-glass"
                  style={{ resize: "vertical" }}
                  placeholder="Provide any details parents should know..."
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: "0.75rem 1.5rem", borderRadius: "0.5rem", border: "1px solid var(--glass-border)", background: "transparent", cursor: "pointer", fontWeight: "500" }}>Cancel</button>
                <button type="submit" style={{ padding: "0.75rem 1.5rem", borderRadius: "0.5rem", border: "none", background: "var(--primary-color, #4f46e5)", color: "white", cursor: "pointer", fontWeight: "500" }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "1rem", width: "100%", maxWidth: "800px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-color, #e5e7eb)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600" }}>Consent Report</h2>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                {reportData && (
                  <>
                    <button onClick={exportXLS} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "var(--background-color, #f9fafb)", border: "1px solid var(--border-color)", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500", color: "var(--text-primary)" }}>
                      <Download size={16} /> Export XLS
                    </button>
                    <button onClick={exportPDF} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "var(--background-color, #f9fafb)", border: "1px solid var(--border-color)", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500", color: "var(--text-primary)" }}>
                      <Printer size={16} /> Export PDF
                    </button>
                  </>
                )}
                <button onClick={() => setShowReportModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={24} color="#6b7280" /></button>
              </div>
            </div>
            <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
              {reportLoading ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>Loading report details...</div>
              ) : reportData ? (
                <>
                  <div style={{ marginBottom: "2rem", background: "var(--background-color, #f9fafb)", padding: "1.5rem", borderRadius: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem" }}>{reportData.consent.title}</h3>
                    <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>{reportData.consent.description}</p>
                    <div style={{ display: "flex", gap: "2rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      <div><strong style={{ color: "var(--text-primary)" }}>Class:</strong> {reportData.consent.class?.name} {reportData.consent.class?.section}</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Event Date:</strong> {reportData.consent.event_date ? new Date(reportData.consent.event_date).toLocaleDateString() : 'N/A'}</div>
                      <div><strong style={{ color: "var(--text-primary)" }}>Total Students:</strong> {reportData.responses.length}</div>
                    </div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", position: "relative" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color, #e5e7eb)" }}>
                        <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--background-color, #f9fafb)", padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                          S.No.
                        </th>
                        <th onClick={() => requestSort('student_name')} style={{ cursor: "pointer", position: "sticky", top: 0, zIndex: 10, background: "var(--background-color, #f9fafb)", padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                          Student Name {sortConfig.key === 'student_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th onClick={() => requestSort('roll_no')} style={{ cursor: "pointer", position: "sticky", top: 0, zIndex: 10, background: "var(--background-color, #f9fafb)", padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                          Roll No {sortConfig.key === 'roll_no' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th onClick={() => requestSort('status')} style={{ cursor: "pointer", position: "sticky", top: 0, zIndex: 10, background: "var(--background-color, #f9fafb)", padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                          Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th onClick={() => requestSort('responded_on')} style={{ cursor: "pointer", position: "sticky", top: 0, zIndex: 10, background: "var(--background-color, #f9fafb)", padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                          Responded On {sortConfig.key === 'responded_on' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedResponses().map((res, index) => (
                        <tr key={res.id} style={{ borderBottom: "1px solid var(--border-color, #e5e7eb)" }}>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{index + 1}</td>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: "500" }}>{res.student?.name}</td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{res.student?.admission_number || '-'}</td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            {res.status === 'accepted' ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#059669", background: "#d1fae5", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "600" }}>
                                <CheckCircle size={14} /> Accepted
                              </span>
                            ) : res.status === 'declined' ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#dc2626", background: "#fee2e2", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "600" }}>
                                <XCircle size={14} /> Declined
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#d97706", background: "#fef3c7", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "600" }}>
                                <Clock size={14} /> Pending
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                            {res.responded_at ? new Date(res.responded_at).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editConsent && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "1rem", width: "100%", maxWidth: "500px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-color, #e5e7eb)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600" }}>Edit Consent</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={24} color="#6b7280" /></button>
            </div>
            <form onSubmit={handleUpdate} style={{ padding: "1.5rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Title</label>
                <input
                  type="text" required value={editConsent.title || ""}
                  onChange={e => setEditConsent({...editConsent, title: e.target.value})}
                  className="input-glass"
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Class</label>
                <input
                  type="text"
                  disabled
                  value={`${editConsent.class?.name || ''} ${editConsent.class?.section || ''}`}
                  className="input-glass"
                  style={{ background: "#f3f4f6", color: "#9ca3af" }}
                  title="Class cannot be changed after creation"
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Event Date</label>
                <input
                  type="date" value={editConsent.event_date || ""}
                  onChange={e => setEditConsent({...editConsent, event_date: e.target.value})}
                  className="input-glass"
                />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Description / Instructions</label>
                <textarea
                  rows="3" value={editConsent.description || ""}
                  onChange={e => setEditConsent({...editConsent, description: e.target.value})}
                  className="input-glass"
                  style={{ resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: "0.75rem 1.5rem", borderRadius: "0.5rem", border: "1px solid var(--glass-border)", background: "transparent", cursor: "pointer", fontWeight: "500" }}>Cancel</button>
                <button type="submit" style={{ padding: "0.75rem 1.5rem", borderRadius: "0.5rem", border: "none", background: "var(--primary-color, #4f46e5)", color: "white", cursor: "pointer", fontWeight: "500" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consents;
