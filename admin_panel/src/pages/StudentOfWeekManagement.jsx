import React, { useState, useEffect } from 'react';
import { Award, RefreshCcw } from 'lucide-react';
import api from '../services/api';

const StudentOfWeekManagement = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/student-of-week');
      if (response.data && response.data.success) {
        if (response.data.table_missing) {
          setTableMissing(true);
        } else {
          setRecords(response.data.data);
          setTableMissing(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch student of week records", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record? The system may auto-generate a new one if this is the current week.")) return;
    try {
      const response = await api.delete(`/admin/student-of-week/${id}`);
      if (response.data?.success) {
        setRecords(records.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete", error);
      alert("Failed to delete record.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Award size={28} color="#eab308" /> Student of the Week
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            The system automatically identifies top students based on recent attendance and performance.
          </p>
        </div>
        <button onClick={fetchRecords} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>Loading records...</div>
        ) : tableMissing ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#d97706", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <Award size={48} color="#d97706" style={{ opacity: 0.5 }} />
            <p style={{ fontWeight: "600" }}>Setup Required</p>
            <p style={{ fontSize: "0.875rem", maxWidth: "400px" }}>The 'student_of_the_week' table is missing from your Supabase database. Please run the SQL setup script provided in the `setup_student_of_week.md` file.</p>
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <Award size={48} color="var(--glass-border)" />
            <p>No students of the week found.</p>
            <p style={{ fontSize: "0.875rem" }}>Records are generated automatically by the system when requested by the mobile app.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600" }}>Student</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600" }}>Week Range</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600" }}>Reason</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="table-row-hover" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        {record.student?.avatar_url ? (
                          <img src={record.student.avatar_url} alt="avatar" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", background: "var(--glass-border)" }} />
                        ) : (
                          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "var(--text-secondary)", fontWeight: "500", fontSize: "0.875rem" }}>
                              {record.student?.name?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: "500", color: "var(--text-primary)" }}>{record.student?.name || 'Unknown Student'}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            Class: {record.class?.name || 'Unknown'} - {record.class?.section || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                      <div style={{ fontSize: "0.875rem" }}>
                        {new Date(record.week_start_date).toLocaleDateString()} - <br/>
                        {new Date(record.week_end_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                      <p style={{ fontSize: "0.875rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={record.reason}>
                        {record.reason}
                      </p>
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right" }}>
                      <button 
                        onClick={() => handleDelete(record.id)}
                        className="btn-ghost" 
                        style={{ display: "inline-flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px", border: "none", cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentOfWeekManagement;
