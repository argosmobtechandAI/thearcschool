import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Edit2, Save, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

const ExamResults = () => {
  const { title, class_id } = useParams();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editGrades, setEditGrades] = useState({});

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

  useEffect(() => {
    fetchResults();
  }, [title, class_id]);

  const handleEditToggle = () => {
    if (!isEditing) {
      // Initialize edit state keyed by studentId -> subjectName
      const initialEdits = {};
      results.forEach(student => {
        initialEdits[student.student_id] = {};
        subjects.forEach(sub => {
          initialEdits[student.student_id][sub.subject] = student.grades[sub.subject]?.marksObtained ?? "";
        });
      });
      setEditGrades(initialEdits);
    }
    setIsEditing(!isEditing);
  };

  const handleGradeChange = (studentId, subjectName, value, maxMarks) => {
    if (value !== "" && Number(value) > maxMarks) {
      toast.warn(`Marks cannot exceed ${maxMarks}`);
      return;
    }
    setEditGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectName]: value
      }
    }));
  };

  const handleSaveGrades = async () => {
    const payloadGrades = [];
    
    Object.keys(editGrades).forEach(studentId => {
      Object.keys(editGrades[studentId]).forEach(subjectName => {
        const marks = editGrades[studentId][subjectName];
        const student = results.find(s => s.student_id === studentId);
        const exam_id = student?.grades[subjectName]?.exam_id;
        
        if (exam_id) {
          payloadGrades.push({
            student_id: studentId,
            exam_id: exam_id,
            marks: marks
          });
        }
      });
    });

    if (payloadGrades.length === 0) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await api.post(`/admin_panel/exams/datesheet/${encodeURIComponent(title)}/${class_id}/grades/bulk`, { grades: payloadGrades });
      if (res.data.success) {
        toast.success("Grades saved successfully");
        setIsEditing(false);
        fetchResults();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save grades");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => navigate("/exams")} className="btn btn-ghost" style={{ padding: "0.5rem" }}>
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>{decodeURIComponent(title)} Results</h1>
            <p style={{ color: "var(--text-secondary)" }}>
              {isEditing ? "Edit mode active. Save when done." : "Matrix of student marks for this Date Sheet"}
            </p>
          </div>
        </div>
        <div>
          {isEditing ? (
            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={handleEditToggle} className="btn btn-ghost" disabled={saving}>
                <X size={16} /> Cancel
              </button>
              <button onClick={handleSaveGrades} className="btn btn-primary" disabled={saving}>
                <Save size={16} /> {saving ? "Saving..." : "Save Grades"}
              </button>
            </div>
          ) : (
            <button onClick={handleEditToggle} className="btn btn-primary" disabled={loading || subjects.length === 0}>
              <Edit2 size={16} /> Edit Grades
            </button>
          )}
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
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", width: "100px" }}>Sec</th>
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", width: "120px" }}>Admission No</th>
                  <th style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", minWidth: "150px" }}>Student Name</th>
                  {subjects.map((sub, idx) => (
                    <th key={idx} style={{ padding: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)", textAlign: "center", minWidth: "100px" }}>
                      {sub.subject} <br />
                      <span style={{ fontSize: "0.75rem", fontWeight: "normal" }}>(Max: {sub.maxMarks})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={subjects.length + 3} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                      No students found in this class.
                    </td>
                  </tr>
                ) : (
                  results.map((student) => (
                    <tr key={student.student_id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", fontSize: "0.875rem" }}>
                      <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{student.section}</td>
                      <td style={{ padding: "1rem" }}>{student.admission_number || "N/A"}</td>
                      <td style={{ padding: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{student.name}</td>
                      {subjects.map((sub, idx) => {
                        const markData = student.grades[sub.subject];
                        const displayMark = markData?.marksObtained;
                        
                        return (
                          <td key={idx} style={{ padding: "0.5rem 1rem", textAlign: "center" }}>
                            {isEditing ? (
                              <input
                                type="number"
                                className="input-glass"
                                style={{ width: "80px", textAlign: "center", padding: "0.25rem", margin: "0 auto", display: "block" }}
                                value={editGrades[student.student_id]?.[sub.subject] ?? ""}
                                onChange={(e) => handleGradeChange(student.student_id, sub.subject, e.target.value, sub.maxMarks)}
                                min="0"
                                max={sub.maxMarks}
                              />
                            ) : (
                              displayMark !== null && displayMark !== undefined ? (
                                <span style={{ fontWeight: "600" }}>{displayMark}</span>
                              ) : (
                                <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>-</span>
                              )
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
