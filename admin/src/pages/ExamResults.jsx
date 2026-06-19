import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

const ExamResults = () => {
  const { title, class_id } = useParams();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await api.get(`/admin_panel/exams/datesheet/${encodeURIComponent(title)}/${class_id}/grades`);
        if (response.data.success) {
          setSubjects(response.data.subjects || []);
          setResults(response.data.results || []);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [title, class_id]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => navigate("/exams")} className="btn btn-ghost" style={{ padding: "0.5rem" }}>
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>{decodeURIComponent(title)} Results</h1>
          <p style={{ color: "var(--text-secondary)" }}>Read-only matrix of student marks for this Date Sheet</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading results...</div>
        ) : subjects.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No subjects found for this Date Sheet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.03)", textAlign: "left", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>Admission No</th>
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>Student Name</th>
                  {subjects.map((sub, idx) => (
                    <th key={idx} style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", textAlign: "center" }}>
                      {sub.subject} <br />
                      <span style={{ fontSize: "0.75rem", fontWeight: "normal" }}>(Max: {sub.maxMarks})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={subjects.length + 2} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                      No students found in this class.
                    </td>
                  </tr>
                ) : (
                  results.map((student) => (
                    <tr key={student.student_id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", fontSize: "0.875rem" }}>
                      <td style={{ padding: "1rem" }}>{student.admission_number || "N/A"}</td>
                      <td style={{ padding: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{student.name}</td>
                      {subjects.map((sub, idx) => {
                        const markData = student.grades[sub.subject];
                        const mark = markData?.marksObtained;
                        return (
                          <td key={idx} style={{ padding: "1rem", textAlign: "center" }}>
                            {mark !== null && mark !== undefined ? (
                              <span style={{ fontWeight: "600" }}>{mark}</span>
                            ) : (
                              <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamResults;
