import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { X, Download, UserCheck } from "lucide-react";
import { generateReportCardPDF } from "../utils/reportCardPDF";

const StudentResultsModal = ({ studentResult, onClose }) => {
  if (!studentResult) return null;

  // Prepare data for the charts
  const chartData = studentResult.subjects.map((sub) => ({
    subject: sub.subject,
    "Marks Obtained": sub.marksObtained,
    "Max Marks": sub.maxMarks,
    Percentage: ((sub.marksObtained / sub.maxMarks) * 100).toFixed(1),
  }));

  return (
    <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "800px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", borderBottom: "1px solid rgba(0,0,0,0.1)", paddingBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ padding: "1rem", background: "rgba(59, 130, 246, 0.1)", borderRadius: "50%", color: "#3b82f6" }}>
              <UserCheck size={32} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0, color: "#1e293b" }}>{studentResult.studentName}</h2>
              <p style={{ color: "var(--text-secondary)", margin: "4px 0 0 0" }}>Admission ID: {studentResult.admissionNumber}</p>
              <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", background: "rgba(0,0,0,0.05)", padding: "4px 10px", borderRadius: "12px" }}>
                  Class: {studentResult.class} {studentResult.section ? `(${studentResult.section})` : ""}
                </span>
                <span style={{ fontSize: "0.875rem", background: "rgba(0,0,0,0.05)", padding: "4px 10px", borderRadius: "12px" }}>
                  Term: {studentResult.term}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "0.5rem", borderRadius: "50%" }}>
            <X size={24} />
          </button>
        </div>

        {/* Highlight Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
          <div className="glass-card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Overall Percentage</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: studentResult.percentage >= 40 ? "#16a34a" : "#ef4444" }}>
              {studentResult.percentage.toFixed(1)}%
            </div>
          </div>
          <div className="glass-card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Total Marks</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#3b82f6" }}>
              {studentResult.totalMarksObtained} <span style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>/ {studentResult.totalMaxMarks}</span>
            </div>
          </div>
          <div className="glass-card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Final Grade</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: studentResult.gradeColor || "#f97316" }}>
              {studentResult.grade}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem" }}>Subject Performance Analysis</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginBottom: "2rem" }}>
          <div className="glass-card" style={{ padding: "1.5rem", height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Marks Obtained" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="Max Marks" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(0,0,0,0.1)" }}>
          <button 
            onClick={() => generateReportCardPDF(studentResult)}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem" }}
          >
            <Download size={18} /> Download Official Report Card
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentResultsModal;
