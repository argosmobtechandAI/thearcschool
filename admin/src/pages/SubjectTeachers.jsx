import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSubjects, fetchClasses, fetchUsers, fetchSubjectTeachers } from "../features/dataSlice";
import api from "../services/api";
import { toast } from "react-toastify";
import { Search } from "lucide-react";
import TableFilterHeader from "../components/TableFilterHeader";
import CustomSelect from "../components/CustomSelect";

const SubjectTeachers = () => {
  const dispatch = useDispatch();
  const { subjects, classes, users, subjectTeachers, loadingSubjects, loadingSubjectTeachers } = useSelector((state) => state.data);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchSubjects());
    dispatch(fetchClasses());
    dispatch(fetchUsers());
    dispatch(fetchSubjectTeachers());
  }, [dispatch]);

  const staff = useMemo(() => {
    const teachers = users?.filter((u) => u.type === "teacher") || [];
    return teachers.sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const teacherOptions = useMemo(() => {
    return staff.map(t => ({ value: t.id, label: t.name }));
  }, [staff]);

  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    return subjects.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subjects, searchQuery]);

  const handleAssignTeacher = async (subjectId, classId, teacherId) => {
    setLoading(true);
    try {
      await api.post("/admin_panel/subjectTeachers/assign", {
        data: { subjectId, classId, teacherId }
      });
      toast.success("Teacher assigned successfully");
      dispatch(fetchSubjectTeachers()); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const getAssignedTeacherId = (subjectId, classId) => {
    if (!subjectTeachers) return "";
    const assignment = subjectTeachers.find(st => st.subject_id === subjectId && st.class_id === classId);
    return assignment ? assignment.teacher_id : "";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Subject Teachers</h1>
          <p style={{ color: "var(--text-secondary)" }}>Assign teachers to specific subjects and classes</p>
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <TableFilterHeader>
          <div style={{ display: "flex", gap: "1rem", flex: 1 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
              <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                type="text"
                placeholder="Search subjects..."
                className="input-glass"
                style={{ paddingLeft: "2.75rem", width: "100%" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </TableFilterHeader>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        {(loadingSubjects || loadingSubjectTeachers) ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>
        ) : filteredSubjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
            <p>No subjects found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600" }}>Subject Name</th>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", color: "var(--text-secondary)", fontWeight: "600" }}>Class Assignements</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((subject) => {
                  const subjectClasses = subject.classIds?.map(cId => classes?.find(c => c.id === cId)).filter(Boolean) || [];
                  // Sort classes intelligently
                  subjectClasses.sort((a, b) => {
                    const nameA = String(a.className || a.name);
                    const nameB = String(b.className || b.name);
                    const sectionA = String(a.section || "");
                    const sectionB = String(b.section || "");
                    const cmp = nameA.localeCompare(nameB, undefined, {numeric: true});
                    if (cmp !== 0) return cmp;
                    return sectionA.localeCompare(sectionB);
                  });

                  return (
                    <tr key={subject.id} className="table-row-hover" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <td style={{ padding: "1rem", fontWeight: "600", color: "var(--text-primary)", verticalAlign: "top" }}>{subject.name}</td>
                      <td style={{ padding: "1rem" }}>
                        {subjectClasses.length > 0 ? (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                            {subjectClasses.map(cls => (
                              <div key={cls.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(0,0,0,0.02)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                                <span style={{ fontWeight: "500", minWidth: "80px" }}>{cls.className || cls.name} {cls.section ? `- ${cls.section}` : ""}</span>
                                <CustomSelect
                                  options={teacherOptions}
                                  value={getAssignedTeacherId(subject.id, cls.id)}
                                  onChange={(val) => handleAssignTeacher(subject.id, cls.id, val)}
                                  placeholder="-- Unassigned --"
                                  disabled={loading}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>No classes assigned to this subject.</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectTeachers;
