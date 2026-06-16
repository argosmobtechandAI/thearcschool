import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchExams, fetchCourses, fetchClasses, fetchUsers } from "../features/dataSlice";
import { toast } from "react-toastify";
import api, { uploadFile } from "../services/api";
import { BookOpen, Calendar, Trash2, Edit } from "lucide-react";
import TableFilterHeader from "../components/TableFilterHeader";
import DateRangePicker from "../components/DateRangePicker";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const coursesTypes = ["exam", "Material", "Assignment"];

const Exams = () => {
  const dispatch = useDispatch();
  const { exams, courses, classes, users } = useSelector((state) => state.data);

  const [courseType, setCourseType] = useState("exam");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    title: "", date: "", dueDate: "", class: "", section: "", time: "", duration: "", marks: "", points: "", subject: "", chapter: "",
  });
  
  const [fileUpload, setFileUpload] = useState(null);

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
      const matchesStatus = !statusFilter || (courseType === "exam" ? item.status === statusFilter : true);
      
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

      return matchesSearch && matchesClass && matchesStatus && matchesDate;
    });
  }, [courseType, courses, exams, searchQuery, dateRange, classFilter, statusFilter]);

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

  const handleSchedule = async (e) => {
    e.preventDefault();
    try {
      let contentArray = [];
      if (courseType !== "exam" && fileUpload) {
        const url = await handleFileUpload();
        if (url) contentArray.push(url);
      }

      if (courseType === "exam") {
        if (editingItem) {
          await api.put(`/exams/updateExams/${editingItem}`, { data: formData });
        } else {
          await api.post("/exams/createExams", { data: formData });
        }
      } else {
        const payload = { ...formData, type: courseType };
        if (contentArray.length > 0) payload.content = contentArray;
        
        if (editingItem) {
          await api.put(`/course/updateCourse/${editingItem}`, { data: payload });
        } else {
          await api.post("/course/createCourse", { data: payload });
        }
      }

      toast.success(`${courseType} saved successfully`);
      dispatch(fetchExams());
      dispatch(fetchCourses());
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Are you sure you want to delete this ${courseType}?`)) {
      try {
        if (courseType === "exam") {
          await api.delete(`/exams/deleteExams/${id}`);
        } else {
          await api.delete(`/course/deleteCourse/${id}`);
        }
        toast.success("Deleted successfully");
        dispatch(fetchExams());
        dispatch(fetchCourses());
      } catch (error) {
        toast.error("Failed to delete");
      }
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item.id);
      setFormData({
        title: item.title || "",
        date: item.date || "",
        dueDate: item.dueDate || "",
        class: item.class || "",
        section: item.section || "",
        time: item.time || "",
        duration: item.duration || "",
        marks: item.marks || "",
        points: item.points || "",
        subject: item.subject || "",
        chapter: item.chapter || "",
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: "", date: "", dueDate: "", class: "", section: "", time: "", duration: "", marks: "", points: "", subject: "", chapter: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFileUpload(null);
  };

  const exportColumnsList = useMemo(() => {
    return [
      { key: "title", label: "Title" },
      { key: "class", label: "Class" },
      { key: "subject", label: "Subject" },
      { key: "date", label: courseType === "exam" ? "Date" : "Due Date" },
      { key: "marks", label: courseType === "exam" ? "Marks" : "Points" }
    ];
  }, [courseType]);

  const handleExportExcel = (selectedKeys) => {
    const dataToExport = materials?.map(item => {
      const row = {};
      const addIfSelected = (key, val) => {
         if (!selectedKeys || selectedKeys.includes(key)) {
           const label = exportColumnsList.find(c => c.key === key)?.label;
           if (label) row[label] = val;
         }
      };
      addIfSelected("title", item.title);
      addIfSelected("class", `${item.class} - ${item.section}`);
      addIfSelected("subject", item.subject);
      addIfSelected("date", courseType === "exam" ? item.date : item.dueDate);
      addIfSelected("marks", courseType === "exam" ? item.marks : item.points);
      return row;
    }) || [];
    exportToExcel(dataToExport, `${courseType}_Report`);
    toast.success("Excel downloaded");
  };

  const handleExportPDF = (selectedKeys) => {
    const activeColumns = exportColumnsList.filter(c => !selectedKeys || selectedKeys.includes(c.key));
    const columnLabels = activeColumns.map(c => c.label);

    const dataToExport = materials?.map(item => {
      const row = [];
      const addIfSelected = (key, val) => {
         if (!selectedKeys || selectedKeys.includes(key)) row.push(val);
      };
      addIfSelected("title", item.title);
      addIfSelected("class", `${item.class} - ${item.section}`);
      addIfSelected("subject", item.subject);
      addIfSelected("date", courseType === "exam" ? item.date : item.dueDate);
      addIfSelected("marks", courseType === "exam" ? item.marks : item.points);
      return row;
    }) || [];
    exportToPDF(columnLabels, dataToExport, `${courseType}_Report`, `${courseType} Report`);
    toast.success("PDF downloaded");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Academic Oversight</h1>
          <p style={{ color: "var(--text-secondary)" }}>Monitor course performance and schedules</p>
        </div>
        <div className="glass-panel" style={{ padding: "0.5rem", display: "flex", gap: "0.5rem" }}>
          {coursesTypes.map((type) => (
            <button
              key={type}
              onClick={() => setCourseType(type)}
              className={`btn ${courseType === type ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", textTransform: "capitalize" }}>{courseType} List</h2>
          <button onClick={() => handleOpenModal()} className="btn btn-primary">
            <Calendar size={16} /> Schedule {courseType}
          </button>
        </div>

        <TableFilterHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder={`Search ${courseType}...`}
          exportColumns={exportColumnsList}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          filters={[
            {
              label: "All Classes",
              value: classFilter,
              onChange: setClassFilter,
              options: [...new Set(classes?.map(c => c.className))].map(className => ({ value: className, label: className }))
            },
            ...(courseType === "exam" ? [{
              label: "All Statuses",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "Upcoming", label: "Upcoming" },
                { value: "Completed", label: "Completed" }
              ]
            }] : [])
          ]}
        >
          <DateRangePicker onRangeChange={setDateRange} />
        </TableFilterHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                      Class: {item.class} - {item.section} • {courseType === "exam" ? `Date: ${item.date}` : `Due: ${item.dueDate}`}
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      Subject: {item.subject} {courseType !== "exam" && `• Chapter: ${item.chapter}`}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ padding: "0.25rem 0.75rem", background: "rgba(0,0,0,0.05)", borderRadius: "16px", fontSize: "0.875rem" }}>
                    {courseType === "exam" ? `Marks: ${item.marks}` : `Points: ${item.points}`}
                  </span>
                  <button onClick={() => handleOpenModal(item)} className="btn-ghost" style={{ padding: "0.5rem", border: "none", background: "none", cursor: "pointer", color: "#60a5fa" }}>
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="btn-ghost" style={{ padding: "0.5rem", border: "none", background: "none", cursor: "pointer", color: "#ef4444" }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={handleCloseModal}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "600px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", textTransform: "capitalize" }}>
              {editingItem ? `Edit ${courseType}` : `Schedule ${courseType}`}
            </h2>
            <form onSubmit={handleSchedule} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Title</label>
                <input required className="input-glass" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>{courseType === "exam" ? "Date" : "Due Date"}</label>
                  <input required type="date" className="input-glass" value={courseType === "exam" ? formData.date : formData.dueDate} onChange={(e) => setFormData({ ...formData, [courseType === "exam" ? "date" : "dueDate"]: e.target.value })} />
                </div>
                
                {courseType === "exam" ? (
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Time</label>
                    <input required type="time" className="input-glass" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
                  </div>
                ) : (
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Chapter</label>
                    <input required className="input-glass" value={formData.chapter} onChange={(e) => setFormData({ ...formData, chapter: e.target.value })} />
                  </div>
                )}
                
                {courseType === "exam" ? (
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Duration (mins)</label>
                    <input required type="number" className="input-glass" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
                  </div>
                ) : (
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Upload File</label>
                    <input type="file" style={{ fontSize: "0.875rem" }} onChange={(e) => setFileUpload(e.target.files[0])} />
                  </div>
                )}
                
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>{courseType === "exam" ? "Marks" : "Points"}</label>
                  <input required type="number" className="input-glass" value={courseType === "exam" ? formData.marks : formData.points} onChange={(e) => setFormData({ ...formData, [courseType === "exam" ? "marks" : "points"]: e.target.value })} />
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
                <button type="submit" className="btn btn-primary">{editingItem ? "Update" : "Schedule"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
