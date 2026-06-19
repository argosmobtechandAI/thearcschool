import React, { useEffect, useState, useMemo } from "react";
import { Calendar, Plus, Trash2, Download } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });

  // Generate a list of academic years (e.g., 2025-2026, 2026-2027)
  const academicYears = useMemo(() => {
    const years = [];
    const currentYear = new Date().getFullYear();
    // Generate 2 years back and 3 years forward
    for (let i = currentYear - 2; i <= currentYear + 3; i++) {
      years.push(`${i}-${i + 1}`);
    }
    return years;
  }, []);

  // Set default academic year based on current date
  useEffect(() => {
    const d = new Date();
    const currentYear = d.getFullYear();
    const isNextYear = d.getMonth() >= 3; // Assuming Academic year starts in April
    if (isNextYear) {
      setAcademicYear(`${currentYear}-${currentYear + 1}`);
    } else {
      setAcademicYear(`${currentYear - 1}-${currentYear}`);
    }
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.get('/holidays');
      setHolidays(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const filteredHolidays = useMemo(() => {
    if (!academicYear) return [];
    const [startYear, endYear] = academicYear.split('-');
    
    // Assuming academic year is from April 1st of startYear to March 31st of endYear
    const startDate = new Date(`${startYear}-04-01`);
    const endDate = new Date(`${endYear}-03-31`);
    
    return holidays.filter(h => {
      const d = new Date(h.date);
      return d >= startDate && d <= endDate;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [holidays, academicYear]);

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.name) {
      toast.error("Please fill out both date and name/comment");
      return;
    }
    try {
      await api.post('/holidays', newHoliday);
      toast.success("Holiday added successfully");
      setNewHoliday({ date: "", name: "" });
      fetchHolidays();
    } catch (error) {
      if (error.response?.data?.error?.includes('unique constraint')) {
        toast.error("A holiday already exists on this date");
      } else {
        toast.error("Failed to add holiday");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this holiday?")) return;
    try {
      await api.delete(`/holidays/${id}`);
      toast.success("Holiday removed");
      fetchHolidays();
    } catch (error) {
      toast.error("Failed to delete holiday");
    }
  };

  const handleExportExcel = () => {
    if (filteredHolidays.length === 0) return toast.warn("No holidays to export");
    const dataToExport = filteredHolidays.map(h => {
      const d = new Date(h.date);
      return {
        Date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        Day: d.toLocaleDateString('en-US', { weekday: 'long' }),
        "Holiday Name": h.name
      };
    });
    exportToExcel(dataToExport, `Public_Holidays_${academicYear}`, `Public Holidays Calendar (${academicYear})`);
  };

  const handleExportPDF = async () => {
    if (filteredHolidays.length === 0) return toast.warn("No holidays to export");
    const columns = ["Date", "Day", "Holiday Name"];
    const dataToExport = filteredHolidays.map(h => {
      const d = new Date(h.date);
      return [
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        d.toLocaleDateString('en-US', { weekday: 'long' }),
        h.name
      ];
    });
    await exportToPDF(columns, dataToExport, `Public_Holidays_${academicYear}`, `Public Holidays Calendar (${academicYear})`);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Public Holidays</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage the annual academic holiday calendar</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={handleExportExcel} className="btn btn-ghost" style={{ border: "1px solid var(--glass-border)", padding: "0.5rem 1rem" }}>
            <Download size={16} /> Export Excel
          </button>
          <button onClick={handleExportPDF} className="btn btn-ghost" style={{ border: "1px solid var(--glass-border)", padding: "0.5rem 1rem" }}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: "2rem" }}>
        
        {/* Left Side: Form */}
        <div className="glass-panel" style={{ padding: "1.5rem", height: "fit-content" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.5rem" }}>Add New Holiday</h2>
          <form onSubmit={handleAddHoliday} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date</label>
              <input 
                type="date" 
                required
                className="input-glass" 
                value={newHoliday.date}
                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Holiday Name / Comment</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Independence Day, Gandhi Jayanti"
                className="input-glass" 
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: "0.5rem", width: "100%", justifyContent: "center" }}>
              <Plus size={18} style={{ marginRight: "0.5rem" }} /> Add Holiday
            </button>
          </form>
        </div>

        {/* Right Side: List */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Holiday Calendar</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Academic Year:</label>
              <select 
                className="input-glass" 
                value={academicYear} 
                onChange={(e) => setAcademicYear(e.target.value)}
                style={{ appearance: "none", minWidth: "150px" }}
              >
                {academicYears.map(year => (
                  <option key={year} value={year} style={{ color: "black" }}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "500" }}>Date</th>
                  <th style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "500" }}>Day</th>
                  <th style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "500" }}>Holiday Name / Comment</th>
                  <th style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "500", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ padding: "2rem", textAlign: "center" }}>Loading holidays...</td></tr>
                ) : filteredHolidays.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No holidays declared for this academic year yet.</td></tr>
                ) : (
                  filteredHolidays.map((holiday) => {
                    const d = new Date(holiday.date);
                    return (
                      <tr key={holiday.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        <td style={{ padding: "1rem", fontWeight: "600" }}>
                          {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                          {d.toLocaleDateString('en-US', { weekday: 'long' })}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <span style={{ 
                            background: "rgba(16, 185, 129, 0.1)", color: "#10b981", 
                            padding: "4px 12px", borderRadius: "12px", fontWeight: "500", fontSize: "0.875rem"
                          }}>
                            {holiday.name}
                          </span>
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            <button 
                              onClick={() => handleDelete(holiday.id)}
                              className="btn-ghost" 
                              style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px", border: "none", cursor: "pointer" }}
                              title="Remove Holiday"
                            >
                              <Trash2 size={14} style={{ marginRight: "0.25rem" }} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Holidays;
