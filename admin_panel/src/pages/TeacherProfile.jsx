import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchSubjects, fetchSubjectTeachers } from "../features/dataSlice";
import { ArrowLeft, User, Users, Phone, Mail, Calendar, BookOpen, Clock, Activity, Briefcase } from "lucide-react";

const TeacherProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { users, classes, loadingUsers, subjects, subjectTeachers } = useSelector((state) => state.data);
  const teacher = useMemo(() => {
    return users.find(u => String(u.id) === String(id) && u.type === 'teacher') || null;
  }, [users, id]);

  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
    dispatch(fetchSubjects());
    dispatch(fetchSubjectTeachers());
  }, [dispatch, users.length]);

  const teacherClasses = useMemo(() => {
    if (!teacher || !teacher.classes) return [];
    return classes.filter(c => teacher.classes.includes(c.id));
  }, [teacher, classes]);

  const teacherSubjects = useMemo(() => {
    if (!teacher) return [];
    const assigned = subjectTeachers.filter(st => String(st.teacher_id) === String(teacher.id));
    
    const grouped = {};
    assigned.forEach(st => {
      if (!grouped[st.subject_id]) grouped[st.subject_id] = [];
      grouped[st.subject_id].push(st.class_id);
    });

    return Object.keys(grouped).map(subjectId => {
      const subject = subjects.find(s => s.id === subjectId);
      const classNames = grouped[subjectId].map(cid => {
        const c = classes.find(cls => cls.id === cid);
        return c ? `${c.className || c.name} ${c.section || ''}`.trim() : 'Unknown';
      });
      return {
        subject_id: subjectId,
        subjectName: subject?.name || 'Unknown',
        classNames: classNames.join(", ")
      };
    });
  }, [teacher, subjectTeachers, subjects, classes]);

  if (loadingUsers) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading profile...</div>;
  }

  if (!teacher && users.length > 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>Teacher Not Found</h2>
        <button onClick={() => navigate('/users/teacher')} className="btn btn-primary">Go Back</button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <User size={16} /> },
    { id: "academic", label: "Classes & Timetable", icon: <BookOpen size={16} /> },
    { id: "salary", label: "Payroll & Salary", icon: <Briefcase size={16} /> },
    { id: "attendance", label: "Leave & Attendance", icon: <Clock size={16} /> }
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => navigate('/users/teacher')} className="btn-ghost" style={{ padding: "0.5rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Teacher Profile</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Comprehensive view of faculty data</p>
        </div>
      </div>

      {teacher && (
        <>
          <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap", borderLeft: "4px solid #10b981" }}>
            <div style={{ width: "100px", height: "100px", borderRadius: "16px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "3rem", fontWeight: "bold", boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.5)" }}>
              {teacher.name?.charAt(0)?.toUpperCase()}
            </div>
            
            <div style={{ flex: 1, minWidth: "250px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.25rem", color: "var(--text-primary)" }}>{teacher.name}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                    <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "600" }}>
                      Status: {teacher.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    <span style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "600" }}>
                      {teacherClasses.length} Assigned Classes
                    </span>
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn-ghost" style={{ padding: "0.5rem 1rem", border: "1px solid var(--glass-border)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                    <Mail size={16} /> Send Email
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Mail size={16} color="#64748b" /> {teacher.email}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Phone size={16} color="#64748b" /> {teacher.phone || "N/A"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Calendar size={16} color="#64748b" /> DOB: {teacher.dob || "N/A"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Briefcase size={16} color="#64748b" /> DOJ: {teacher.doj || "N/A"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><User size={16} color="#64748b" /> Father/Spouse: {teacher.father_spouse_name || "N/A"}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "1rem", overflowX: "auto" }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.25rem",
                  background: activeTab === tab.id ? "var(--accent-primary)" : "transparent",
                  color: activeTab === tab.id ? "white" : "var(--text-secondary)",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: activeTab === tab.id ? "600" : "500",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap"
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-content" style={{ minHeight: "400px" }}>
            {activeTab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Address & Details</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", color: "var(--text-secondary)" }}>
                    <div><strong style={{ color: "var(--text-primary)" }}>Residential Address:</strong><br/>{teacher.address || "No address on file."}</div>
                    <div><strong style={{ color: "var(--text-primary)" }}>Gender:</strong> {teacher.gender || "N/A"}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "academic" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Class Teacher For</h3>
                  {teacherClasses.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                      <p>No classes assigned as Class Teacher.</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                      {teacherClasses.map((c, idx) => (
                        <div key={idx} style={{ padding: "1rem", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                          <div style={{ fontWeight: "600", color: "#10b981", fontSize: "1.125rem", marginBottom: "0.25rem" }}>{c.name} - {c.section}</div>
                          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Users size={14} />
                            <span>Students: {c.student?.length || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Assigned Subjects</h3>
                  {teacherSubjects.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                      <p>No subjects assigned to this teacher yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                      {teacherSubjects.map((st, idx) => (
                        <div key={idx} style={{ padding: "1rem", background: "rgba(139, 92, 246, 0.1)", borderRadius: "8px", border: "1px solid rgba(139, 92, 246, 0.3)" }}>
                          <div style={{ fontWeight: "600", color: "#8b5cf6", fontSize: "1.125rem", marginBottom: "0.25rem" }}>{st.subjectName}</div>
                          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Users size={14} />
                            <span>Classes: {st.classNames}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "salary" && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Payroll & Salary</h3>
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                  <Briefcase size={48} style={{ opacity: 0.2, margin: "0 auto 1rem" }} />
                  <p>Payroll module integration is pending. Salary details will appear here once connected.</p>
                </div>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Leave & Attendance</h3>
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                  <Clock size={48} style={{ opacity: 0.2, margin: "0 auto 1rem" }} />
                  <p>Attendance tracking module integration is pending.</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherProfile;
