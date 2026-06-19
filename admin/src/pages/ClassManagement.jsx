import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchClasses, fetchUsers } from "../features/dataSlice";
import { Plus, Edit, Trash2, Users, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import TableFilterHeader from "../components/TableFilterHeader";
import { useSortableData } from "../hooks/useSortableData";

const ClassManagement = () => {
  const dispatch = useDispatch();
  const { classes, users, loadingClasses } = useSelector((state) => state.data);

  // Main Page States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColumns, setSelectedColumns] = useState(["className", "section", "teachers", "students"]);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeacherSelectModalOpen, setIsTeacherSelectModalOpen] = useState(false);
  const [isStudentSelectModalOpen, setIsStudentSelectModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  
  // Student Filter States (for Modal)
  const [studentSearch, setStudentSearch] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("");
  const [studentGenderFilter, setStudentGenderFilter] = useState("");
  const [studentFormFilter, setStudentFormFilter] = useState("");
  const [studentSchoolStatusFilter, setStudentSchoolStatusFilter] = useState("");
  const [studentTcFilter, setStudentTcFilter] = useState("");
  
  // Teacher Filter States (for Modal)
  const [teacherSearch, setTeacherSearch] = useState("");

  const [formData, setFormData] = useState({
    className: "8",
    section: "A",
    subject: "",
    teachers: [],
    students: [],
  });

  const teachers = useMemo(() => users.filter((u) => u.type === "teacher"), [users]);
  const students = useMemo(() => users.filter((u) => u.type === "student"), [users]);

  useEffect(() => {
    dispatch(fetchClasses());
    if (users.length === 0) dispatch(fetchUsers());
  }, [dispatch, users.length]);

  // Main page classes filtering
  const filteredClasses = useMemo(() => {
    return classes.filter(
      (c) =>
        c.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.section.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classes, searchQuery]);

  const { items: sortedClasses, requestSort, sortConfig } = useSortableData(filteredClasses);

  // Teacher selection filtering
  const filteredTeachersForSelect = useMemo(() => {
    const search = teacherSearch.toLowerCase();
    return teachers.filter(t => (t.name && t.name.toLowerCase().includes(search)) || (t.email && t.email.toLowerCase().includes(search)));
  }, [teachers, teacherSearch]);

  // Student selection filtering (Advanced Panel)
  const filteredStudentsForSelect = useMemo(() => {
    const search = studentSearch.toLowerCase();
    let result = students.filter(s => (s.name && s.name.toLowerCase().includes(search)) || (s.email && s.email.toLowerCase().includes(search)));

    if (studentGenderFilter) {
      result = result.filter(s => s.gender?.toLowerCase() === studentGenderFilter.toLowerCase());
    }
    
    if (studentClassFilter) {
      if (studentClassFilter === "unassigned") {
        result = result.filter(s => !s.classes || s.classes.length === 0);
      } else {
        result = result.filter(s => s.classes && s.classes.includes(Number(studentClassFilter)));
      }
    }

    if (studentFormFilter) {
      result = result.filter(s => String(!!s.form_submitted) === studentFormFilter);
    }
    if (studentSchoolStatusFilter) {
      result = result.filter(s => String(!!s.leave_school) === studentSchoolStatusFilter);
    }
    if (studentTcFilter) {
      result = result.filter(s => String(!!s.tc_received) === studentTcFilter);
    }

    // Sort selected to top
    result.sort((a, b) => {
      const aSelected = formData.students.includes(a.id);
      const bSelected = formData.students.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

    return result;
  }, [students, studentSearch, studentGenderFilter, studentClassFilter, studentFormFilter, studentSchoolStatusFilter, studentTcFilter, formData.students]);

  const studentTableFilters = useMemo(() => {
    return [
      {
        label: "Assignment Status",
        value: studentClassFilter,
        onChange: setStudentClassFilter,
        options: [
          { label: "Unassigned Only", value: "unassigned" },
          ...classes.map(c => ({ label: `${c.className} ${c.section}`, value: c.id }))
        ]
      },
      {
        label: "Gender",
        value: studentGenderFilter,
        onChange: setStudentGenderFilter,
        options: [{ label: "Male", value: "male" }, { label: "Female", value: "female" }]
      },
      {
        label: "Form Status",
        value: studentFormFilter,
        onChange: setStudentFormFilter,
        options: [{ label: "Submitted", value: "true" }, { label: "Pending", value: "false" }]
      },
      {
        label: "School Status",
        value: studentSchoolStatusFilter,
        onChange: setStudentSchoolStatusFilter,
        options: [{ label: "Active", value: "false" }, { label: "Left School", value: "true" }]
      },
      {
        label: "TC Status",
        value: studentTcFilter,
        onChange: setStudentTcFilter,
        options: [{ label: "Received", value: "true" }, { label: "Pending", value: "false" }]
      }
    ];
  }, [classes, studentClassFilter, studentGenderFilter, studentFormFilter, studentSchoolStatusFilter, studentTcFilter]);

  const handleOpenModal = (cls = null) => {
    if (cls) {
      setEditingClass(cls.id);
      setFormData({
        className: cls.className,
        section: cls.section,
        subject: cls.subject || "",
        teachers: cls.teacher || [],
        students: cls.student || [],
      });
    } else {
      setEditingClass(null);
      setFormData({ className: "8", section: "A", subject: "", teachers: [], students: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (editingClass) {
        payload.id = editingClass;
        await api.put("/admin_panel/class/updateClass", { data: payload });
        toast.success("Class updated successfully");
      } else {
        await api.post("/admin_panel/class/createClass", { data: payload });
        toast.success("Class created successfully");
      }
      setIsModalOpen(false);
      dispatch(fetchClasses());
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this class?")) {
      try {
        await api.delete(`/admin_panel/class/deleteClass/${id}`);
        toast.success("Class deleted successfully");
        dispatch(fetchClasses());
      } catch (error) {
        toast.error("Failed to delete class");
      }
    }
  };

  const getTeacherName = (teacherId) => {
    const t = teachers.find((u) => u.id === teacherId);
    return t ? t.name : "Unassigned";
  };

  const exportColumnsList = [
    { key: "className", label: "Class Level" },
    { key: "section", label: "Section" },
    { key: "teachers", label: "Assigned Teachers" },
    { key: "students", label: "Total Students" }
  ];

  const renderCell = (cls, key) => {
    switch (key) {
      case "className": return `Class ${cls.className}`;
      case "section": return cls.section;
      case "teachers": return cls.teacher?.length > 0 ? cls.teacher.map(t => getTeacherName(t)).join(", ") : "Unassigned";
      case "students": return (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Users size={14} style={{ color: "var(--text-secondary)" }}/>
          <span>{cls.student?.length || 0}</span>
        </div>
      );
      default: return "N/A";
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Class Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage your academic classes</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          <Plus size={18} /> Add Class
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "1rem" }}>
        <TableFilterHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search classes or sections..."
          filters={[]}
          exportColumns={exportColumnsList}
          selectedColumns={selectedColumns}
          setSelectedColumns={setSelectedColumns}
          onExportExcel={() => {}}
          onExportPDF={() => {}}
        />

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr>
                {exportColumnsList.map(col => selectedColumns.includes(col.key) && (
                  <th key={col.key} style={{ cursor: "pointer" }} onClick={() => requestSort(col.key)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
                      {col.label}
                      {sortConfig?.key === col.key ? (
                        sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      ) : (
                        <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />
                      )}
                    </div>
                  </th>
                ))}
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingClasses ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} style={{ padding: "2rem", textAlign: "center" }}>Loading...</td>
                </tr>
              ) : sortedClasses.length === 0 ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No classes found.</td>
                </tr>
              ) : (
                sortedClasses.map(cls => (
                  <tr key={cls.id}>
                    {exportColumnsList.map(col => {
                      if (!selectedColumns.includes(col.key)) return null;
                      return <td key={col.key}>{renderCell(cls, col.key)}</td>;
                    })}
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button onClick={() => handleOpenModal(cls)} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#3b82f6", background: "rgba(59, 130, 246, 0.1)", borderRadius: "4px", border: "none", cursor: "pointer" }}>
                          <Edit size={14} style={{ marginRight: "0.25rem" }} /> Edit
                        </button>
                        <button onClick={() => handleDelete(cls.id)} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px", border: "none", cursor: "pointer" }}>
                          <Trash2 size={14} style={{ marginRight: "0.25rem" }} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setIsModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>
              {editingClass ? "Edit Class" : "Create New Class"}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Class Level (e.g. 8, 9, 10)</label>
                <input required className="input-glass" value={formData.className} onChange={(e) => setFormData({ ...formData, className: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Section (e.g. A, B)</label>
                <input required className="input-glass" maxLength={1} value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Teachers</label>
                <button
                  type="button"
                  onClick={() => setIsTeacherSelectModalOpen(true)}
                  className="input-glass"
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "rgba(255,255,255,0.05)" }}
                >
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Select teachers...</span>
                  <span style={{ background: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem" }}>
                    {formData.teachers.length} Selected
                  </span>
                </button>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Students</label>
                <button
                  type="button"
                  onClick={() => setIsStudentSelectModalOpen(true)}
                  className="input-glass"
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "rgba(255,255,255,0.05)" }}
                >
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Select students...</span>
                  <span style={{ background: "rgba(59, 130, 246, 0.2)", color: "#93c5fd", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem" }}>
                    {formData.students.length} Selected
                  </span>
                </button>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingClass ? "Save Changes" : "Create Class"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTeacherSelectModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={() => setIsTeacherSelectModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem", display: "flex", flexDirection: "column", maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem" }}>Select Teachers</h2>
            <input 
              className="input-glass" 
              placeholder="Search teachers by name or email..." 
              value={teacherSearch} 
              onChange={e => setTeacherSearch(e.target.value)} 
              style={{ marginBottom: "1rem" }}
            />
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.5rem", background: "rgba(0,0,0,0.02)" }}>
              {filteredTeachersForSelect.map(t => (
                <label key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "8px", cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <input 
                    type="checkbox" 
                    checked={formData.teachers.includes(t.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, teachers: [...formData.teachers, t.id] });
                      } else {
                        setFormData({ ...formData, teachers: formData.teachers.filter(id => id !== t.id) });
                      }
                    }}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span style={{ fontSize: "0.875rem" }}>{t.name} <span style={{ color: "var(--text-secondary)" }}>({t.email})</span></span>
                </label>
              ))}
              {filteredTeachersForSelect.length === 0 && (
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>No teachers found</div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" onClick={() => setIsTeacherSelectModalOpen(false)} className="btn btn-primary">Done</button>
            </div>
          </div>
        </div>
      )}

      {isStudentSelectModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={() => setIsStudentSelectModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "800px", padding: "2rem", display: "flex", flexDirection: "column", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Select Students</h2>
              <span style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "4px 12px", borderRadius: "12px", fontSize: "0.875rem", fontWeight: "600" }}>
                {formData.students.length} Selected
              </span>
            </div>
            
            <div style={{ border: "1px solid var(--glass-border)", padding: "1rem", borderRadius: "8px", marginBottom: "1rem", background: "white" }}>
              <TableFilterHeader
                searchQuery={studentSearch}
                setSearchQuery={setStudentSearch}
                searchPlaceholder="Search by name/email..."
                filters={studentTableFilters}
                exportColumns={[]}
                selectedColumns={[]}
                setSelectedColumns={() => {}}
                onExportExcel={() => {}}
                onExportPDF={() => {}}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                onClick={() => {
                  const visibleIds = filteredStudentsForSelect.map(s => s.id);
                  const newSelected = [...new Set([...formData.students, ...visibleIds])];
                  setFormData({ ...formData, students: newSelected });
                }}
              >
                Select All Visible
              </button>
              <button 
                type="button" 
                className="btn btn-ghost" 
                style={{ fontSize: "0.75rem", padding: "4px 8px", color: "#ef4444" }}
                onClick={() => setFormData({ ...formData, students: [] })}
              >
                Clear All
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.5rem", background: "rgba(0,0,0,0.02)" }}>
              {filteredStudentsForSelect.map(s => {
                const isSelected = formData.students.includes(s.id);
                return (
                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "10px", cursor: "pointer", borderBottom: "1px solid var(--glass-border)", background: isSelected ? "rgba(59, 130, 246, 0.05)" : "transparent", transition: "var(--transition)", borderRadius: "4px" }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, students: [...formData.students, s.id] });
                        } else {
                          setFormData({ ...formData, students: formData.students.filter(id => id !== s.id) });
                        }
                      }}
                      style={{ width: "18px", height: "18px", accentColor: "var(--accent-primary)" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: isSelected ? "600" : "500" }}>
                        {s.name} <span style={{ color: "var(--text-secondary)", fontWeight: "400" }}>({s.email})</span>
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Gender: <span style={{ textTransform: "capitalize" }}>{s.gender || 'N/A'}</span> | Status: {s.classes?.length > 0 ? `Assigned (${s.classes.length})` : 'Unassigned'} | Form: {s.form_submitted ? 'Submitted' : 'Pending'} | TC: {s.tc_received ? 'Received' : 'Pending'}
                      </span>
                    </div>
                  </label>
                );
              })}
              {filteredStudentsForSelect.length === 0 && (
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textAlign: "center", padding: "3rem" }}>No students found matching filters</div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" onClick={() => setIsStudentSelectModalOpen(false)} className="btn btn-primary">Done ({formData.students.length})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
