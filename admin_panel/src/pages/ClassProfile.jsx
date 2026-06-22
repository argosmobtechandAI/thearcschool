import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchClasses, fetchUsers, fetchSubjects } from "../features/dataSlice";
import api from "../services/api";
import { toast } from "react-toastify";
import { ArrowLeft, Users, GraduationCap, Calendar, FileText, User, BookOpen } from "lucide-react";
import TableFilterHeader from "../components/TableFilterHeader";

const ClassProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { classes, users, subjects, loadingClasses, loadingUsers, loadingSubjects } = useSelector((state) => state.data);

  const [activeTab, setActiveTab] = useState("overview");
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");

  useEffect(() => {
    if (classes.length === 0) dispatch(fetchClasses());
    if (users.length === 0) dispatch(fetchUsers());
    if (subjects.length === 0) dispatch(fetchSubjects());
  }, [dispatch, classes.length, users.length, subjects.length]);

  const cls = useMemo(() => {
    return classes.find(c => String(c.id) === String(id)) || null;
  }, [classes, id]);

  const classStudents = useMemo(() => {
    if (!cls || !cls.student) return [];
    return cls.student
      .map(studentId => users.find(u => u.id === studentId))
      .filter(Boolean);
  }, [cls, users]);

  const classTeachers = useMemo(() => {
    if (!cls || !cls.teacher) return [];
    return cls.teacher
      .map(teacherId => users.find(u => u.id === teacherId))
      .filter(Boolean);
  }, [cls, users]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return classStudents;
    return classStudents.filter(s => 
      s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || 
      s.admission_number?.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [classStudents, studentSearch]);

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch) return classTeachers;
    return classTeachers.filter(t => 
      t.name?.toLowerCase().includes(teacherSearch.toLowerCase()) || 
      t.email?.toLowerCase().includes(teacherSearch.toLowerCase())
    );
  }, [classTeachers, teacherSearch]);

  const classSubjects = useMemo(() => {
    if (!cls || !subjects) return [];
    return subjects.filter(s => s.classIds?.includes(cls.id));
  }, [cls, subjects]);

  const handleSubjectToggle = async (subject, isAssigned) => {
    try {
      const newClassIds = isAssigned 
        ? [...(subject.classIds || []), cls.id]
        : (subject.classIds || []).filter(id => id !== cls.id);
        
      await api.put(`/admin_panel/subjects/updateSubject/${subject.id}`, { 
        data: { name: subject.name, classIds: newClassIds } 
      });
      toast.success(isAssigned ? "Subject assigned" : "Subject removed");
      dispatch(fetchSubjects());
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update subject");
    }
  };

  if (loadingClasses || loadingUsers || loadingSubjects) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading class data...</div>;
  }

  if (!cls && classes.length > 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>Class Not Found</h2>
        <button onClick={() => navigate('/classes')} className="btn btn-primary">Go Back</button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <FileText size={16} /> },
    { id: "students", label: `Students (${classStudents.length})`, icon: <GraduationCap size={16} /> },
    { id: "teachers", label: `Teachers (${classTeachers.length})`, icon: <User size={16} /> },
    { id: "subjects", label: `Subjects (${classSubjects.length})`, icon: <BookOpen size={16} /> },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => navigate('/classes')} className="btn-ghost" style={{ padding: "0.5rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Class {cls?.className} - {cls?.section}</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Detailed breakdown of class data</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => navigate(`/timetable/class/${cls?.id}`)} className="btn-ghost" style={{ padding: "0.5rem 1rem", border: "1px solid var(--glass-border)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
            <Calendar size={16} /> Timetable
          </button>
          <button onClick={() => navigate(`/attendance/class/${cls?.id}`)} className="btn-ghost" style={{ padding: "0.5rem 1rem", border: "1px solid var(--glass-border)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
            <Users size={16} /> Attendance
          </button>
        </div>
      </div>

      {cls && (
        <>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
                <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <GraduationCap size={32} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Total Students</h3>
                    <div style={{ fontSize: "2rem", fontWeight: "700" }}>{classStudents.length}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      Boys: {classStudents.filter(s => s.gender === 'male').length} | Girls: {classStudents.filter(s => s.gender === 'female').length}
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(168, 85, 247, 0.1)", color: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={32} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Assigned Teachers</h3>
                    <div style={{ fontSize: "2rem", fontWeight: "700" }}>{classTeachers.length}</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BookOpen size={32} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Subjects Taught</h3>
                    <div style={{ fontSize: "2rem", fontWeight: "700" }}>{classSubjects.length}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "students" && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ flexShrink: 0 }}>
          <TableFilterHeader
                  searchQuery={studentSearch}
                  setSearchQuery={setStudentSearch}
                  searchPlaceholder="Search students by name or admission no..."
                />
        </div>
                
                {filteredStudents.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                    <GraduationCap size={48} style={{ opacity: 0.2, margin: "0 auto 1rem" }} />
                    <p>No students found.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                          <th style={{ padding: "1rem" }}>Adm No.</th>
                          <th style={{ padding: "1rem" }}>Name</th>
                          <th style={{ padding: "1rem" }}>Gender</th>
                          <th style={{ padding: "1rem" }}>Contact</th>
                          <th style={{ padding: "1rem", textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(student => (
                          <tr key={student.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                            <td style={{ padding: "1rem" }}>{student.admission_number || "N/A"}</td>
                            <td style={{ padding: "1rem", fontWeight: "500" }}>{student.name}</td>
                            <td style={{ padding: "1rem", textTransform: "capitalize" }}>{student.gender || "N/A"}</td>
                            <td style={{ padding: "1rem" }}>
                              <div style={{ fontSize: "0.875rem" }}>{student.email}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{student.phone}</div>
                            </td>
                            <td style={{ padding: "1rem", textAlign: "right" }}>
                              <button onClick={() => navigate(`/student-profile/${student.id}`)} className="btn-ghost" style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", borderRadius: "4px", border: "1px solid var(--glass-border)" }}>
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "teachers" && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ flexShrink: 0 }}>
          <TableFilterHeader
                  searchQuery={teacherSearch}
                  setSearchQuery={setTeacherSearch}
                  searchPlaceholder="Search teachers by name or email..."
                />
        </div>
                
                {filteredTeachers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                    <User size={48} style={{ opacity: 0.2, margin: "0 auto 1rem" }} />
                    <p>No teachers found.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                          <th style={{ padding: "1rem" }}>Name</th>
                          <th style={{ padding: "1rem" }}>Email</th>
                          <th style={{ padding: "1rem" }}>Contact</th>
                          <th style={{ padding: "1rem", textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeachers.map(teacher => (
                          <tr key={teacher.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                            <td style={{ padding: "1rem", fontWeight: "500" }}>{teacher.name}</td>
                            <td style={{ padding: "1rem" }}>{teacher.email}</td>
                            <td style={{ padding: "1rem" }}>{teacher.phone || "N/A"}</td>
                            <td style={{ padding: "1rem", textAlign: "right" }}>
                              <button onClick={() => navigate(`/teacher-profile/${teacher.id}`)} className="btn-ghost" style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", borderRadius: "4px", border: "1px solid var(--glass-border)" }}>
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "subjects" && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "600" }}>Manage Class Subjects</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Check the subjects that are taught in this class.</p>
                </div>
                
                {subjects.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                    <BookOpen size={48} style={{ opacity: 0.2, margin: "0 auto 1rem" }} />
                    <p>No subjects found in the system. Go to Subject Management to add some.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                    {subjects.map(subject => {
                      const isAssigned = subject.classIds?.includes(cls.id);
                      return (
                        <label 
                          key={subject.id} 
                          className="table-row-hover"
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "0.75rem", 
                            padding: "1rem", 
                            border: "1px solid var(--glass-border)", 
                            borderRadius: "8px", 
                            cursor: "pointer",
                            background: isAssigned ? "rgba(59, 130, 246, 0.05)" : "transparent"
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isAssigned}
                            onChange={(e) => handleSubjectToggle(subject, e.target.checked)}
                            style={{ width: "18px", height: "18px", accentColor: "var(--accent-primary)" }}
                          />
                          <span style={{ fontWeight: "500" }}>{subject.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ClassProfile;
