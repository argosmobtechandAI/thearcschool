import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses, fetchSubjects } from "../features/dataSlice";
import api, { sendBroadcastNotification, getAllNotifications } from "../services/api";
import { toast } from "react-toastify";
import { Bell, BellOff, ArrowLeft, Send, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DateRangePicker from "../components/DateRangePicker";
import Select from "react-select";
import { supabase } from "../lib/supabase";

const routeOptions = [
  { value: "", label: "None (Default)" },
  { value: "DateSheet", label: "Date Sheet" },
  { value: "ExamsList", label: "Exams List" },
  { value: "AttendanceHome", label: "Attendance" },
  { value: "StudentAcademicHistory", label: "Student Grades" }
];

export default function Notifications() {
  const { users, classes, subjects, loading } = useSelector((state) => state.data);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [emailFilter, setEmailFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [userFilter, setUserFilter] = useState(null); // specific user select

  // Send Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [sendMode, setSendMode] = useState("audience"); // 'audience' | 'users' | 'classTeachers'
  const [broadcastData, setBroadcastData] = useState({ 
    title: "", 
    body: "", 
    targetAudience: "all", 
    targetUserIds: [],
    targetClassId: "",
    targetSubjectId: "",
    teacherType: "class", // 'class' | 'subject' | 'both'
    routeScreen: "",
    routeParams: ""
  });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!users || users.length === 0) dispatch(fetchUsers());
    if (!classes || classes.length === 0) dispatch(fetchClasses());
    if (!subjects || subjects.length === 0) dispatch(fetchSubjects());
    
    // Fetch student to class mappings for filtering history
    const fetchClassStudents = async () => {
      const { data } = await supabase.from('class_students').select('student_id, class_id');
      if (data) setClassStudents(data);
    };
    fetchClassStudents();
  }, [users, classes, subjects, dispatch]);

  const fetchHistory = async () => {
    setIsLoadingNotifications(true);
    try {
      const res = await getAllNotifications({ limit: 500 });
      if (res.data?.success) {
        setNotifications(res.data.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch notification history");
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const uniqueSections = useMemo(() => {
    if (!classes) return [];
    return [...new Set(classes.map(c => c.section).filter(Boolean))].sort();
  }, [classes]);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    if (roleFilter !== "all") {
      filtered = filtered.filter(n => n.user?.type?.toLowerCase() === roleFilter);
    }
    
    if (emailFilter.trim()) {
      filtered = filtered.filter(n => n.user?.email?.toLowerCase().includes(emailFilter.toLowerCase()));
    }
    
    if (userFilter && userFilter.value) {
      filtered = filtered.filter(n => n.user_id === userFilter.value);
    }
    
    if (classFilter || sectionFilter) {
      // Find matching class IDs
      const matchingClasses = classes.filter(c => {
        if (classFilter && c.id !== classFilter) return false;
        if (sectionFilter && c.section !== sectionFilter) return false;
        return true;
      });
      const matchingClassIds = matchingClasses.map(c => c.id);
      
      // Find students in those classes
      const matchingStudentIds = new Set(
        classStudents
          .filter(cs => matchingClassIds.includes(cs.class_id))
          .map(cs => cs.student_id)
      );
      
      filtered = filtered.filter(n => matchingStudentIds.has(n.user_id));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title?.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query) ||
        n.user?.name?.toLowerCase().includes(query) ||
        n.user?.email?.toLowerCase().includes(query)
      );
    }
    
    if (dateRange && (dateRange.start || dateRange.end)) {
      filtered = filtered.filter(n => {
        const nDate = new Date(n.created_at || n.date);
        let startMatch = true;
        let endMatch = true;
        
        if (dateRange.start) {
          const startDate = new Date(dateRange.start);
          startDate.setHours(0, 0, 0, 0);
          startMatch = nDate >= startDate;
        }
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          endMatch = nDate <= endDate;
        }
        
        return startMatch && endMatch;
      });
    }
    return filtered;
  }, [notifications, dateRange, searchQuery, roleFilter, emailFilter, userFilter, classFilter, sectionFilter, classes, classStudents]);

  const userOptions = useMemo(() => {
    if (!users) return [];
    return users.map(u => ({
      value: u.id,
      label: `${u.name} (${u.email}) - ${u.type}`
    }));
  }, [users]);

  // Compute targets if sending by class/subject
  const computeTargetUserIds = () => {
    if (sendMode === 'users') {
      return broadcastData.targetUserIds.map(o => o.value);
    }
    if (sendMode === 'classTeachers') {
      const selectedClass = classes?.find(c => c.id === broadcastData.targetClassId);
      if (!selectedClass) return [];

      let ids = new Set();
      if (broadcastData.teacherType === 'class' || broadcastData.teacherType === 'both') {
        if (selectedClass.teacher && Array.isArray(selectedClass.teacher)) {
          selectedClass.teacher.forEach(t => ids.add(t));
        }
      }
      if (broadcastData.teacherType === 'subject' || broadcastData.teacherType === 'both') {
        const relatedSubjects = subjects?.filter(s => s.class_id === selectedClass.id);
        if (relatedSubjects) {
          relatedSubjects.forEach(sub => {
            if (!broadcastData.targetSubjectId || broadcastData.targetSubjectId === sub.id) {
              if (sub.teacher_id) ids.add(sub.teacher_id);
            }
          });
        }
      }
      return Array.from(ids);
    }
    return undefined;
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!broadcastData.title.trim() || !broadcastData.body.trim()) {
      return toast.error("Title and body are required");
    }
    
    let computedUserIds = computeTargetUserIds();

    if (sendMode === 'users' && (!computedUserIds || computedUserIds.length === 0)) {
      return toast.error("Please select at least one user");
    }
    if (sendMode === 'classTeachers' && (!computedUserIds || computedUserIds.length === 0)) {
      return toast.error("No teachers found for the selected class/subject criteria");
    }
    
    let parsedParams = null;
    if (broadcastData.routeParams.trim()) {
      try {
        parsedParams = JSON.parse(broadcastData.routeParams);
      } catch (err) {
        return toast.error("Route Params must be valid JSON object. E.g. {\"studentId\": \"123\"}");
      }
    }

    setIsSending(true);
    try {
      const payload = {
        title: broadcastData.title,
        body: broadcastData.body,
        targetAudience: sendMode === 'audience' ? broadcastData.targetAudience : undefined,
        targetUserIds: computedUserIds,
        routeScreen: broadcastData.routeScreen || undefined,
        routeParams: parsedParams || undefined
      };

      await sendBroadcastNotification(payload);
      toast.success("Notification(s) sent successfully!");
      setShowBroadcastModal(false);
      setBroadcastData({ title: "", body: "", targetAudience: "all", targetUserIds: [], targetClassId: "", targetSubjectId: "", teacherType: "class", routeScreen: "", routeParams: "" });
      fetchHistory(); 
    } catch (error) {
      toast.error("Failed to send notification");
    } finally {
      setIsSending(false);
    }
  };

  if (loading && !users.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading workspace...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", height: "calc(100vh - 40px)", overflow: "hidden" }}>
      {/* Header and Filter Block */}
      <div className="glass-panel animate-fade-in" style={{ padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ padding: "0.5rem" }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: "1.25rem", color: "var(--text-primary)", fontWeight: 600 }}>Notification History</h1>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>View all sent notifications</p>
            </div>
          </div>
          <button 
            onClick={() => setShowBroadcastModal(true)}
            className="btn btn-primary"
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", height: "fit-content" }}
          >
            <Send size={14} /> Send Notification
          </button>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", background: "var(--bg-secondary)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-primary)", padding: "0.4rem 0.5rem", borderRadius: "6px", border: "1px solid var(--glass-border)", flex: 1, minWidth: "120px" }}>
            <Search size={14} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Search text..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "0.8rem" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-primary)", padding: "0.4rem 0.5rem", borderRadius: "6px", border: "1px solid var(--glass-border)", flex: 1, minWidth: "120px" }}>
            <Filter size={14} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Filter Email..." 
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "0.8rem" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-primary)", padding: "0.4rem 0.5rem", borderRadius: "6px", border: "1px solid var(--glass-border)" }}>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: "0.8rem" }}
            >
              <option value="all">All Roles</option>
              <option value="teacher">Teachers</option>
              <option value="student">Students</option>
              <option value="parent">Parents</option>
            </select>
          </div>

          {/* Student Specific Filters */}
          {roleFilter === 'student' && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-primary)", padding: "0.4rem 0.5rem", borderRadius: "6px", border: "1px solid var(--glass-border)" }}>
                <select 
                  value={classFilter} 
                  onChange={(e) => setClassFilter(e.target.value)}
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: "0.8rem", maxWidth: "100px" }}
                >
                  <option value="">Any Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.className || c.name}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-primary)", padding: "0.4rem 0.5rem", borderRadius: "6px", border: "1px solid var(--glass-border)" }}>
                <select 
                  value={sectionFilter} 
                  onChange={(e) => setSectionFilter(e.target.value)}
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: "0.8rem" }}
                >
                  <option value="">Any Sec</option>
                  {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </>
          )}

          <div style={{ flex: "2", minWidth: "150px" }}>
            <Select
              isClearable
              options={userOptions}
              value={userFilter}
              onChange={setUserFilter}
              placeholder="Find User..."
              styles={{
                control: (base) => ({ ...base, minHeight: "32px", height: "32px", fontSize: "0.8rem", borderRadius: "6px", borderColor: "var(--glass-border)" }),
                valueContainer: (base) => ({ ...base, padding: "0 6px" }),
                input: (base) => ({ ...base, margin: 0, padding: 0 }),
                dropdownIndicator: (base) => ({ ...base, padding: "2px" }),
                clearIndicator: (base) => ({ ...base, padding: "2px" })
              }}
            />
          </div>

          <DateRangePicker onRangeChange={setDateRange} value={dateRange} initialPreset="today" />
        </div>
      </div>

      {/* Content */}
      <div className="glass-panel animate-fade-in custom-scrollbar" style={{ flex: 1, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {isLoadingNotifications ? (
           <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
             <p>Loading history...</p>
           </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)" }}>
              <BellOff size={32} style={{ opacity: 0.5, marginBottom: "0.5rem" }} />
              <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>No notifications found</h3>
              <p style={{ fontSize: "0.85rem" }}>Adjust your filters or send a new one.</p>
          </div>
        ) : (
          filteredNotifications.map((item, index) => {
              return (
              <div
                  key={item.id || index}
                  style={{ 
                    display: "flex", 
                    alignItems: "flex-start", 
                    gap: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--glass-border)",
                    borderLeft: "3px solid var(--accent-primary)",
                    backgroundColor: "var(--bg-primary)"
                  }}
              >
                  <div style={{ 
                    padding: "0.5rem", 
                    borderRadius: "50%", 
                    backgroundColor: "#f1f5f9",
                    color: "var(--text-secondary)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                      <Bell size={16} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4 style={{ fontSize: "0.9rem", margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>
                          {item.title}
                      </h4>
                      <span style={{ fontSize: "0.65rem", background: "var(--accent-light)", color: "var(--accent-primary)", padding: "0.15rem 0.4rem", borderRadius: "12px", fontWeight: "bold" }}>
                        {item.type}
                      </span>
                    </div>

                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4, margin: "0.25rem 0" }}>
                        {item.message}
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: 500, margin: 0 }}>
                          To: <span style={{ color: "var(--text-secondary)" }}>{item.user ? `${item.user.name} (${item.user.email})` : "Unknown User"}</span>
                      </p>
                      <p style={{ fontSize: "0.7rem", color: "#94a3b8", display: "flex", alignItems: "center", margin: 0 }}>
                          {new Date(item.created_at || item.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
              </div>
              );
          })
        )}
      </div>

      {/* Broadcast/Send Modal */}
      {showBroadcastModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem"
        }}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
            
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "white", zIndex: 10 }}>
              <h2 style={{ fontSize: "1.1rem", margin: 0, color: "var(--text-primary)" }}>Send Notification</h2>
              <button 
                onClick={() => setShowBroadcastModal(false)} 
                className="btn btn-ghost" 
                style={{ padding: "0.25rem", minWidth: "auto", color: "var(--text-secondary)" }}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSendNotification} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              {/* Send Mode Toggle */}
              <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.75rem", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
                  <input type="radio" name="sendMode" value="audience" checked={sendMode === 'audience'} onChange={() => setSendMode('audience')} />
                  Role Broadcast
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
                  <input type="radio" name="sendMode" value="users" checked={sendMode === 'users'} onChange={() => setSendMode('users')} />
                  Specific Users
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
                  <input type="radio" name="sendMode" value="classTeachers" checked={sendMode === 'classTeachers'} onChange={() => setSendMode('classTeachers')} />
                  Class/Subject Teachers
                </label>
              </div>

              {/* Dynamic Target Input */}
              <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                {sendMode === 'audience' && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                      Target Role
                    </label>
                    <select 
                      className="input-glass"
                      style={{ backgroundColor: "white", padding: "0.4rem 0.5rem", fontSize: "0.85rem" }}
                      value={broadcastData.targetAudience}
                      onChange={(e) => setBroadcastData({...broadcastData, targetAudience: e.target.value})}
                    >
                      <option value="all">All Users</option>
                      <option value="teacher">Teachers</option>
                      <option value="student">Students</option>
                      <option value="parent">Parents</option>
                    </select>
                  </div>
                )}

                {sendMode === 'users' && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                      Select Users
                    </label>
                    <Select
                      isMulti
                      options={userOptions}
                      value={broadcastData.targetUserIds}
                      onChange={(selected) => setBroadcastData({...broadcastData, targetUserIds: selected})}
                      placeholder="Search by name or email..."
                      styles={{ control: (base) => ({ ...base, borderRadius: "6px", borderColor: "#cbd5e1", minHeight: "36px" }) }}
                    />
                  </div>
                )}

                {sendMode === 'classTeachers' && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Class</label>
                        <select 
                          className="input-glass"
                          style={{ backgroundColor: "white", padding: "0.4rem 0.5rem", fontSize: "0.85rem" }}
                          value={broadcastData.targetClassId}
                          onChange={(e) => setBroadcastData({...broadcastData, targetClassId: e.target.value, targetSubjectId: ""})}
                        >
                          <option value="">Select a Class</option>
                          {classes?.map(c => <option key={c.id} value={c.id}>{c.className || c.name} {c.section}</option>)}
                        </select>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Type</label>
                        <select 
                          className="input-glass"
                          style={{ backgroundColor: "white", padding: "0.4rem 0.5rem", fontSize: "0.85rem" }}
                          value={broadcastData.teacherType}
                          onChange={(e) => setBroadcastData({...broadcastData, teacherType: e.target.value})}
                        >
                          <option value="class">Class Teacher Only</option>
                          <option value="subject">Subject Teachers Only</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                    </div>
                    
                    {(broadcastData.teacherType === 'subject' || broadcastData.teacherType === 'both') && (
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Subject (Optional)</label>
                        <select 
                          className="input-glass"
                          style={{ backgroundColor: "white", padding: "0.4rem 0.5rem", fontSize: "0.85rem" }}
                          value={broadcastData.targetSubjectId}
                          onChange={(e) => setBroadcastData({...broadcastData, targetSubjectId: e.target.value})}
                          disabled={!broadcastData.targetClassId}
                        >
                          <option value="">All Subjects in Class</option>
                          {subjects?.filter(s => s.class_id === broadcastData.targetClassId).map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Deep Link Settings */}
              <div style={{ padding: "0.75rem", backgroundColor: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0369a1", margin: "0 0 0.5rem 0" }}>Deep Link (App Navigation)</h3>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#0c4a6e", marginBottom: "0.2rem" }}>Route Screen</label>
                    <select 
                      className="input-glass"
                      style={{ backgroundColor: "white", borderColor: "#bae6fd", padding: "0.4rem 0.5rem", fontSize: "0.85rem" }}
                      value={broadcastData.routeScreen}
                      onChange={(e) => setBroadcastData({...broadcastData, routeScreen: e.target.value})}
                    >
                      {routeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#0c4a6e", marginBottom: "0.2rem" }}>Route Params (JSON)</label>
                    <input 
                      type="text"
                      className="input-glass"
                      style={{ backgroundColor: "white", borderColor: "#bae6fd", padding: "0.4rem 0.5rem", fontSize: "0.85rem" }}
                      placeholder='{"studentId": "..."}'
                      value={broadcastData.routeParams}
                      onChange={(e) => setBroadcastData({...broadcastData, routeParams: e.target.value})}
                      disabled={!broadcastData.routeScreen}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Notification Title
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Action Required: Grades"
                  className="input-glass"
                  style={{ padding: "0.5rem", fontSize: "0.9rem" }}
                  value={broadcastData.title}
                  onChange={(e) => setBroadcastData({...broadcastData, title: e.target.value})}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Message Body
                </label>
                <textarea 
                  required
                  placeholder="Write your message here..."
                  rows="3"
                  className="input-glass"
                  style={{ resize: "vertical", padding: "0.5rem", fontSize: "0.9rem" }}
                  value={broadcastData.body}
                  onChange={(e) => setBroadcastData({...broadcastData, body: e.target.value})}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.25rem" }}>
                <button 
                  type="button" 
                  onClick={() => setShowBroadcastModal(false)}
                  className="btn btn-ghost"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSending}
                  className="btn btn-primary"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
                >
                  {isSending ? "Sending..." : "Send Notification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
