import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, LabelList } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import DateRangePicker, { formatDate } from './DateRangePicker';

const COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b'
};

const AttendanceReports = ({ users, classes }) => {
  const [dateRange, setDateRange] = useState({
    start: formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchData();
    }
  }, [dateRange.start, dateRange.end, selectedClassId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { startDate: dateRange.start, endDate: dateRange.end };
      if (selectedClassId) params.classId = selectedClassId;
      const res = await api.get('/attendance', { params });
      if (res.data.success) {
        setRecords(res.data.records);
      }
    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const students = useMemo(() => users.filter(u => u.type === 'student'), [users]);

  const statusDistribution = useMemo(() => {
    let p = 0, a = 0, l = 0;
    records.forEach(r => {
      const status = String(r.status).toLowerCase();
      if (status === 'present') p++;
      else if (status === 'absent') a++;
      else if (status === 'late') l++;
    });
    return [
      { name: 'Present', value: p, color: COLORS.present },
      { name: 'Absent', value: a, color: COLORS.absent },
      { name: 'Late', value: l, color: COLORS.late }
    ];
  }, [records]);

  const classComparison = useMemo(() => {
    if (!classes) return [];
    return classes.map(cls => {
      const classStudents = students.filter(s => s.classes && s.classes.includes(cls.id));
      const classRecords = records.filter(r => classStudents.some(s => s.id === r.student_id));
      
      let present = 0;
      let total = classRecords.length;
      
      classRecords.forEach(r => {
        if (String(r.status).toLowerCase() === 'present') present++;
      });
      
      return {
        name: `${cls.className}-${cls.section}`,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        present,
        total
      };
    }).filter(c => c.total > 0).sort((a, b) => b.percentage - a.percentage);
  }, [classes, students, records]);

  const dailyTrend = useMemo(() => {
    const trend = {};
    records.forEach(r => {
      if (!trend[r.date]) {
        trend[r.date] = { date: r.date, present: 0, total: 0 };
      }
      trend[r.date].total++;
      if (String(r.status).toLowerCase() === 'present') trend[r.date].present++;
    });
    
    return Object.values(trend).sort((a, b) => new Date(a.date) - new Date(b.date)).map(day => ({
      ...day,
      percentage: Math.round((day.present / day.total) * 100)
    }));
  }, [records]);

  const exportCSV = () => {
    const exportData = records.map(r => {
      const student = students.find(s => s.id === r.student_id);
      return {
        Date: r.date,
        'Student Name': student ? student.name : 'Unknown',
        'Student ID': r.student_id,
        Status: String(r.status).charAt(0).toUpperCase() + String(r.status).slice(1).toLowerCase(),
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_Report_${dateRange.start}_to_${dateRange.end}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Summary Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Date Range: ${dateRange.start} to ${dateRange.end}`, 14, 22);
    
    const tableColumn = ["Class", "Total Marked", "Present", "Attendance %"];
    const tableRows = [];

    classComparison.forEach(cls => {
      tableRows.push([
        cls.name,
        cls.total,
        cls.present,
        `${cls.percentage}%`
      ]);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save(`Attendance_Summary_${dateRange.start}_to_${dateRange.end}.pdf`);
  };

  return (
    <div className="animate-fade-in">
      {/* Controls */}
      <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>Filter by Class (Optional)</label>
            <select 
              className="input-glass" 
              value={selectedClassId} 
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ padding: "0.5rem", width: "200px", appearance: "auto" }}
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>Class {cls.className} - {cls.section}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>Date Range</label>
            <DateRangePicker 
              startDate={dateRange.start}
              endDate={dateRange.end}
              setStartDate={(s) => setDateRange(prev => ({...prev, start: s}))}
              setEndDate={(e) => setDateRange(prev => ({...prev, end: e}))}
              defaultRange="mtd"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={exportCSV}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
          >
            <FileText size={18} /> Export Excel Logs
          </button>
          <button 
            onClick={exportPDF}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ef4444", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
          >
            <Download size={18} /> Export PDF Summary
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center" }}>Analyzing records...</div>
      ) : records.length === 0 ? (
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)", background: "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px dashed rgba(0,0,0,0.1)" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-primary)" }}>No data found</h3>
          <p>There are no attendance records for the selected filters.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          
          {/* Status Distribution */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem" }}>Overall Status Distribution</h3>
            <div style={{ height: "250px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Trend */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem" }}>Daily Attendance % Trend</h3>
            <div style={{ height: "250px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrend} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis domain={[0, 100]} tick={{fontSize: 12}} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend verticalAlign="top" height={36} />
                  <Line name="Attendance %" type="monotone" dataKey="percentage" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}}>
                    <LabelList dataKey="percentage" position="top" formatter={(value) => `${value}%`} fontSize={10} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Class Comparison */}
          <div className="glass-card" style={{ padding: "1.5rem", gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem" }}>Class Attendance Comparison</h3>
            <div style={{ height: "300px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classComparison} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis domain={[0, 100]} tick={{fontSize: 12}} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend verticalAlign="top" height={36} payload={[{ value: 'Attendance %', type: 'rect', color: '#10b981' }]} />
                  <Bar name="Attendance %" dataKey="percentage" fill="#10b981" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="percentage" position="top" formatter={(value) => `${value}%`} fontSize={10} />
                    {classComparison.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.percentage < 75 ? '#ef4444' : entry.percentage < 85 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AttendanceReports;
