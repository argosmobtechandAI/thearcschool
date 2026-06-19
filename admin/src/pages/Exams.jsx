import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchExams, fetchCourses, fetchClasses, fetchUsers } from "../features/dataSlice";
import { toast } from "react-toastify";
import api, { uploadFile } from "../services/api";
import { BookOpen, Calendar, Trash2, Edit, Plus, FileSpreadsheet } from "lucide-react";
import TableFilterHeader from "../components/TableFilterHeader";
import DateRangePicker from "../components/DateRangePicker";

const coursesTypes = ["exam", "Material", "Assignment"];

const Exams = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { exams, courses, classes, users } = useSelector((state) => state.data);

  const [courseType, setCourseType] = useState("exam");
  const [mode, setMode] = useState("view");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // For assignments and materials
  const [editingItem, setEditingItem] = useState(null);
  
  // Combined form state
  const [formData, setFormData] = useState({
    title: "", dueDate: "", class: "", section: "", points: "", subject: "", chapter: "",
  });
  
  // Date Sheet State
  const [dateSheetData, setDateSheetData] = useState({
    title: "", class: "", section: "",
    subjects: []
  });
  const [dateSheetSubject, setDateSheetSubject] = useState({
    subject: "", date: "", time: "", duration: "", marks: "", invigilator_id: ""
  });
  
  const [fileUpload, setFileUpload] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchExams());
    dispatch(fetchCourses());
    dispatch(fetchClasses());
    dispatch(fetchUsers());
  }, [dispatch]);

  const materials = useMemo(() => {
    let list = [];
    if (courseType === "exam") list = exams;
    else if (courseType === "Material") list = courses?.filter((c) => c.type === "Material");
    else list = courses?.filter((c) => c.type === "Assignment");
    
    if (!list) return [];
    
    return list.filter(item => {
      const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.subject?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = !classFilter || item.class === classFilter;
      
      let matchesDate = true;
      if (dateRange.start || dateRange.end) {
        const itemDateStr = courseType === "exam" ? item.date : item.dueDate;
        if (itemDateStr) {
          const itemDate = new Date(itemDateStr);
          if (dateRange.start && dateRange.end) {
            matchesDate = itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
          } else if (dateRange.start) {
            matchesDate = itemDate >= new Date(dateRange.start);
          } else if (dateRange.end) {
            matchesDate = itemDate <= new Date(dateRange.end);
          }
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesClass && matchesDate;
    });
  }, [courseType, courses, exams, searchQuery, dateRange, classFilter]);

  // Group exams into Date Sheets
  const groupedDateSheets = useMemo(() => {
    if (courseType !== "exam") return [];
    const groups = {};
    materials.forEach(ex => {
      const key = `${ex.title}_${ex.class_id}`;
      if (!groups[key]) {
        groups[key] = {
          title: ex.title,
          class_id: ex.class_id,
          className: ex.class,
          section: ex.section,
          subjects: []
        };
      }
      groups[key].subjects.push(ex);
    });
    return Object.values(groups);
  }, [materials, courseType]);

  const handleFileUpload = async () => {
    if (!fileUpload) return null;
    try {
      const url = await uploadFile(fileUpload);
      return url;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleAddSubjectToDateSheet = () => {
    if (!dateSheetSubject.subject || !dateSheetSubject.date || !dateSheetSubject.time || !dateSheetSubject.marks) {
      return toast.warn("Subject, Date, Time, and Marks are required");
    }
    setDateSheetData({
      ...dateSheetData,
      subjects: [...dateSheetData.subjects, { ...dateSheetSubject }]
    });
    setDateSheetSubject({ subject: "", date: "", time: "", duration: "", marks: "", invigilator_id: "" });
  };

  const handleRemoveSubjectFromDateSheet = (index) => {
    const newSubs = [...dateSheetData.subjects];
    newSubs.splice(index, 1);
    setDateSheetData({ ...dateSheetData, subjects: newSubs });
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (courseType === "exam") {
        if (dateSheetData.subjects.length === 0) {
          toast.warn("Please add at least one subject to the date sheet.");
          setLoading(false);
          return;
        }
        await api.post("/admin_panel/exams/datesheet", { data: dateSheetData });
      } else {
        let contentArray = [];
        if (fileUpload) {
          const url = await handleFileUpload();
          if (url) contentArray.push(url);
        }
        const payload = { ...formData, type: courseType };
        if (contentArray.length > 0) payload.content = contentArray;
        
        if (editingItem) {
          await api.put(`/course/updateCourse/${editingItem}`, { data: payload });
        } else {
          await api.post("/course/createCourse", { data: payload });
        }
      }

      toast.success(`${courseType === "exam" ? "Date Sheet" : courseType} saved successfully`);
      dispatch(fetchExams());
      dispatch(fetchCourses());
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDateSheet = async (title, class_id) => {
    if (window.confirm(`Are you sure you want to delete the entire Date Sheet "${title}"?`)) {
      try {
        const subjectsToDelete = exams.filter(e => e.title === title && e.class_id === class_id);
        for (let sub of subjectsToDelete) {
          await api.delete(`/admin_panel/exams/deleteExams/${sub.id}`);
        }
        toast.success("Date Sheet Deleted successfully");
        dispatch(fetchExams());
      } catch (error) {
        toast.error("Failed to delete Date Sheet");
      }
    }
  };

  const handleDeleteCourse = async (id) => {
    if (window.confirm(`Are you sure you want to delete this ${courseType}?`)) {
      try {
        await api.delete(`/course/deleteCourse/${id}`);
        toast.success("Deleted successfully");
        dispatch(fetchCourses());
      } catch (error) {
        toast.error("Failed to delete");
      }
    }
  };

  const handleOpenModal = (item = null) => {
    if (courseType === "exam") {
      setDateSheetData({ title: "", class: "", section: "", subjects: [] });
      setDateSheetSubject({ subject: "", date: "", time: "", duration: "", marks: "", invigilator_id: "" });
    } else {
      if (item) {
        setEditingItem(item.id);
        setFormData({
          title: item.title || "",
          dueDate: item.dueDate || "",
          class: item.class || "",
          section: item.section || "",
          points: item.points || "",
          subject: item.subject || "",
          chapter: item.chapter || "",
        });
      } else {
        setEditingItem(null);
        setFormData({
          title: "", dueDate: "", class: "", section: "", points: "", subject: "", chapter: "",
        });
      }
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFileUpload(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Academic Oversight</h1>
          <p style={{ color: "var(--text-secondary)" }}>Monitor course performance and schedules</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div className="glass-panel" style={{ padding: "0.5rem", display: "flex", gap: "0.5rem" }}>
            {coursesTypes.map((type) => (
              <button
                key={type}
                onClick={() => { setCourseType(type); setMode("view"); }}
                className={`btn ${courseType === type ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
              >
                {type === "exam" ? "Exams Date Sheets" : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", textTransform: "capitalize" }}>{courseType === "exam" ? "Date Sheets" : courseType} List</h2>
          <button onClick={() => handleOpenModal()} className="btn btn-primary">
            <Calendar size={16} /> Create {courseType === "exam" ? "Date Sheet" : courseType}
          </button>
        </div>

        <TableFilterHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder={`Search ${courseType}...`}
          filters={[
            {
              label: "All Classes",
              value: classFilter,
              onChange: setClassFilter,
              options: [...new Set(classes?.map(c => c.className))].map(className => ({ value: className, label: className }))
            }
          ]}
        >
          <DateRangePicker onRangeChange={setDateRange} />
        </TableFilterHeader>

        {courseType === "exam" ? (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {groupedDateSheets.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                No Date Sheets found.
              </div>
            ) : (
              groupedDateSheets.map((ds, idx) => (
                <div key={idx} className="glass-card" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-primary)" }}>{ds.title}</h3>
                      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Class {ds.className} - {ds.section} • {ds.subjects.length} Subjects</p>
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button 
                        onClick={() => navigate(`/exams/results/${encodeURIComponent(ds.title)}/${ds.class_id}`)}
                        className="btn btn-ghost" 
                        style={{ background: "rgba(96, 165, 250, 0.1)", color: "#2563eb", padding: "0.5rem 1rem" }}
                      >
                        <FileSpreadsheet size={16} style={{ marginRight: "0.5rem" }}/> View Results
                      </button>
                      <button onClick={() => handleDeleteDateSheet(ds.title, ds.class_id)} className="btn-ghost" style={{ padding: "0.5rem", color: "#ef4444", borderRadius: "8px" }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    {ds.subjects.sort((a,b) => new Date(a.date) - new Date(b.date)).map(sub => (
                      <div key={sub.id} style={{ padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "8px", minWidth: "150px" }}>
                        <div style={{ fontWeight: "600", marginBottom: "4px" }}>{sub.subject}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{sub.date} • {sub.time}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>Max Marks: {sub.marks}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {materials?.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                No {courseType}s found.
              </div>
            ) : (
              materials?.map((item) => (
                <div key={item.id} className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ padding: "0.75rem", background: "rgba(0,0,0,0.08)", borderRadius: "12px", color: "#60a5fa" }}>
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontWeight: "600", fontSize: "1.1rem", marginBottom: "0.25rem" }}>{item.title}</h4>
                      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                        Class: {item.class} - {item.section} • Due: {item.dueDate}
                      </p>
                      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                        Subject: {item.subject} • Chapter: {item.chapter}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ padding: "0.25rem 0.75rem", background: "rgba(0,0,0,0.05)", borderRadius: "16px", fontSize: "0.875rem" }}>
                      Points: {item.points}
                    </span>
                    <button onClick={() => handleOpenModal(item)} className="btn-ghost" style={{ padding: "0.5rem", border: "none", background: "none", cursor: "pointer", color: "#60a5fa" }}>
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDeleteCourse(item.id)} className="btn-ghost" style={{ padding: "0.5rem", border: "none", background: "none", cursor: "pointer", color: "#ef4444" }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={handleCloseModal}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "800px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", textTransform: "capitalize" }}>
              {courseType === "exam" ? "Create Date Sheet" : (editingItem ? `Edit ${courseType}` : `Create ${courseType}`)}
            </h2>

            {courseType === "exam" ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date Sheet Title</label>
                    <input required className="input-glass" placeholder="e.g. Term 1 Finals" value={dateSheetData.title} onChange={(e) => setDateSheetData({ ...dateSheetData, title: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Class & Section</label>
                    <select className="input-glass" required value={`${dateSheetData.class}-${dateSheetData.section}`} onChange={(e) => {
                      const [cls, sec] = e.target.value.split("-");
                      setDateSheetData({ ...dateSheetData, class: cls, section: sec });
                      setDateSheetSubject({ ...dateSheetSubject, subject: "" });
                    }}>
                      <option value="-">Select Class-Section</option>
                      {classes?.map((c) => (
                        <option key={c.id} value={`${c.className}-${c.section}`}>{c.className} - {c.section}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Add Subject to Date Sheet</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Subject</label>
                      <select className="input-glass" value={dateSheetSubject.subject} onChange={(e) => setDateSheetSubject({ ...dateSheetSubject, subject: e.target.value })}>
                        <option value="">Select Subject</option>
                        {classes?.find(c => c.className === dateSheetData.class && c.section === dateSheetData.section)?.teachersSubject?.map((ts, i) => (
                          <option key={i} value={ts.subject}>{ts.subject}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Date</label>
                      <input type="date" className="input-glass" value={dateSheetSubject.date} onChange={(e) => setDateSheetSubject({ ...dateSheetSubject, date: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Time</label>
                      <input type="time" className="input-glass" value={dateSheetSubject.time} onChange={(e) => setDateSheetSubject({ ...dateSheetSubject, time: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Duration (mins)</label>
                      <input type="number" className="input-glass" value={dateSheetSubject.duration} onChange={(e) => setDateSheetSubject({ ...dateSheetSubject, duration: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Max Marks</label>
                      <input type="number" className="input-glass" value={dateSheetSubject.marks} onChange={(e) => setDateSheetSubject({ ...dateSheetSubject, marks: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Invigilator (Optional)</label>
                      <select className="input-glass" value={dateSheetSubject.invigilator_id} onChange={(e) => setDateSheetSubject({ ...dateSheetSubject, invigilator_id: e.target.value })}>
                        <option value="">Select Invigilator</option>
                        {users?.filter(u => u.type === 'teacher').map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="button" onClick={handleAddSubjectToDateSheet} className="btn btn-ghost" style={{ width: "100%", background: "rgba(0,0,0,0.03)" }}>
                    <Plus size={16} /> Add Subject
                  </button>
                </div>

                {dateSheetData.subjects.length > 0 && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Subjects Added:</h4>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ background: "rgba(0,0,0,0.03)", textAlign: "left" }}>
                          <th style={{ padding: "0.5rem" }}>Subject</th>
                          <th style={{ padding: "0.5rem" }}>Date</th>
                          <th style={{ padding: "0.5rem" }}>Time</th>
                          <th style={{ padding: "0.5rem" }}>Marks</th>
                          <th style={{ padding: "0.5rem", textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dateSheetData.subjects.map((sub, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                            <td style={{ padding: "0.5rem" }}>{sub.subject}</td>
                            <td style={{ padding: "0.5rem" }}>{sub.date}</td>
                            <td style={{ padding: "0.5rem" }}>{sub.time}</td>
                            <td style={{ padding: "0.5rem" }}>{sub.marks}</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>
                              <button onClick={() => handleRemoveSubjectFromDateSheet(idx)} className="btn-ghost" style={{ color: "#ef4444", padding: "4px" }}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
                  <button type="button" onClick={handleCloseModal} className="btn btn-ghost">Cancel</button>
                  <button onClick={handleSchedule} disabled={loading || dateSheetData.subjects.length === 0} className="btn btn-primary">{loading ? "Saving..." : "Publish Date Sheet"}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSchedule} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Title</label>
                  <input required className="input-glass" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Due Date</label>
                    <input required type="date" className="input-glass" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Chapter</label>
                    <input required className="input-glass" value={formData.chapter} onChange={(e) => setFormData({ ...formData, chapter: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Upload File</label>
                    <input type="file" style={{ fontSize: "0.875rem" }} onChange={(e) => setFileUpload(e.target.files[0])} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Points</label>
                    <input required type="number" className="input-glass" value={formData.points} onChange={(e) => setFormData({ ...formData, points: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Class & Section</label>
                  <select className="input-glass" required value={`${formData.class}-${formData.section}`} onChange={(e) => {
                    const [cls, sec] = e.target.value.split("-");
                    setFormData({ ...formData, class: cls, section: sec, subject: "" });
                  }}>
                    <option value="">Select Class-Section</option>
                    {classes?.map((c) => (
                      <option key={c.id} value={`${c.className}-${c.section}`}>{c.className} - {c.section}</option>
                    ))}
                  </select>
                </div>

                {formData.class && (
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Subject</label>
                    <select className="input-glass" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })}>
                      <option value="">Select Subject</option>
                      {classes?.find(c => c.className === formData.class && c.section === formData.section)?.teachersSubject?.map((ts, i) => (
                        <option key={i} value={ts.subject}>{ts.subject}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
                  <button type="button" onClick={handleCloseModal} className="btn btn-ghost">Cancel</button>
                  <button type="submit" disabled={loading} className="btn btn-primary">{editingItem ? "Update" : "Schedule"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
