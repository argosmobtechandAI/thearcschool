import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTimeTables, fetchClasses, fetchUsers, fetchSubjects, fetchRooms } from "../features/dataSlice";
import { toast } from "react-toastify";
import api from "../services/api";
import { Calendar, Plus, Clock, ChevronLeft, ChevronRight, Edit2, Trash2, Filter } from "lucide-react";
import TimePicker from "../components/TimePicker";
import DateRangePicker, { formatDate } from "../components/DateRangePicker";

const getThisWeek = () => {
  const curr = new Date(); 
  const first = curr.getDate() - curr.getDay() + 1; // Monday
  const last = first + 6; // Sunday
  return { start: formatDate(new Date(curr.setDate(first))), end: formatDate(new Date(curr.setDate(last))) };
};

const TimeTable = () => {
  const dispatch = useDispatch();
  const { classes, timeTables, users, subjects, rooms } = useSelector((state) => state.data);

  const [selectedClass, setSelectedClass] = useState("");
  const [dateRange, setDateRange] = useState(getThisWeek());
  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openAddSingleModal, setOpenAddSingleModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState(null);

  const [newTimeTable, setNewTimeTable] = useState({ date: "", timeTables: [] });
  const [timeSubject, setTimeSubject] = useState({ date: "", subject: "", initialTime: "", finalTime: "", teacher: "", isBreak: false, roomNumber: "" });

  useEffect(() => {
    dispatch(fetchTimeTables());
    dispatch(fetchClasses());
    dispatch(fetchUsers());
    dispatch(fetchSubjects());
    dispatch(fetchRooms());
  }, [dispatch]);

  useEffect(() => {
    if (classes?.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  const activeClassData = useMemo(() => {
    return classes?.find(c => String(c.id) === String(selectedClass));
  }, [selectedClass, classes]);

  const activeTimeTable = useMemo(() => {
    if (!selectedClass || !timeTables?.length) return null;
    return timeTables.find(t => String(t.classId) === String(selectedClass));
  }, [selectedClass, timeTables]);

  const getUserName = (userId) => {
    const user = users?.find(u => u.id === userId);
    return user ? user.name : "Unknown";
  };

  const allTeachers = useMemo(() => users?.filter(u => u.type === "teacher") || [], [users]);

  const allTimeSlots = useMemo(() => {
    if (!activeTimeTable || !activeTimeTable.dates) return [];
    const times = new Set();
    Object.values(activeTimeTable.dates).forEach(periodsForDate => {
      periodsForDate.forEach(p => times.add(p.time));
    });
    return Array.from(times).sort((a, b) => {
      const startA = a.split(" - ")[0];
      const startB = b.split(" - ")[0];
      return startA.localeCompare(startB);
    });
  }, [activeTimeTable]);

  const visibleDates = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    const dates = [];
    let current = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    let count = 0;
    while (current <= end && count < 31) {
      dates.push(formatDate(current));
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  }, [dateRange]);

  const handleAddPeriod = () => {
    if (!newTimeTable.date || !timeSubject.initialTime || !timeSubject.finalTime) {
      toast.error("Please fill required fields for the period");
      return;
    }
    if (!timeSubject.isBreak && (!timeSubject.subject || !timeSubject.teacher)) {
      toast.error("Please select a teacher and subject");
      return;
    }
    if (timeSubject.initialTime >= timeSubject.finalTime) {
      toast.error("End time must be after start time");
      return;
    }
    const formattedTime = `${timeSubject.initialTime} - ${timeSubject.finalTime}`;
    setNewTimeTable({
      ...newTimeTable,
      timeTables: [
        ...newTimeTable.timeTables,
        {
          subject: timeSubject.isBreak ? "Break/Lunch" : timeSubject.subject,
          teacher: timeSubject.isBreak ? null : timeSubject.teacher,
          time: formattedTime,
          isBreak: timeSubject.isBreak,
          roomNumber: timeSubject.roomNumber
        }
      ]
    });
    setTimeSubject({ day: "", subject: "", initialTime: "", finalTime: "", teacher: "", isBreak: false, roomNumber: "" });
  };

  const handleSubmit = async () => {
    if (!newTimeTable.date || newTimeTable.timeTables.length === 0) {
      toast.error("Add at least one period before submitting");
      return;
    }
    setLoading(true);
    try {
      await api.post("/timeTable/createTimeTable", {
        data: {
          classId: selectedClass,
          date: newTimeTable.date,
          timeTables: newTimeTable.timeTables
        }
      });
      toast.success("Timetable created successfully");
      dispatch(fetchTimeTables());
      setOpenModal(false);
      setNewTimeTable({ date: "", timeTables: [] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create timetable");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePeriod = async (id) => {
    if (!window.confirm("Are you sure you want to delete this period?")) return;
    try {
      await api.delete(`/timeTable/deletePeriod/${id}`);
      toast.success("Period deleted successfully");
      dispatch(fetchTimeTables());
    } catch (error) {
      toast.error("Failed to delete period");
    }
  };

  const handleEditClick = (period, date) => {
    const [initialTime, finalTime] = period.time.split(" - ");
    setTimeSubject({
      date: date || "",
      subject: period.subject || "",
      initialTime,
      finalTime,
      teacher: period.teacher || "",
      isBreak: period.isBreak || false,
      roomNumber: period.roomNumber || ""
    });
    setEditingPeriodId(period.id);
    setOpenEditModal(true);
  };

  const handleAddSpecificClick = (date, timeSlot) => {
    const [initialTime, finalTime] = timeSlot.split(" - ");
    setTimeSubject({
      date: date,
      subject: "",
      initialTime,
      finalTime,
      teacher: "",
      isBreak: false,
      roomNumber: ""
    });
    setOpenAddSingleModal(true);
  };

  const handleUpdatePeriod = async () => {
    if (!timeSubject.initialTime || !timeSubject.finalTime) {
      return toast.error("Time is required");
    }
    setLoading(true);
    try {
      const formattedTime = `${timeSubject.initialTime} - ${timeSubject.finalTime}`;
      await api.put(`/timeTable/updatePeriod/${editingPeriodId}`, {
        data: {
          time: formattedTime,
          subject: timeSubject.isBreak ? "Break/Lunch" : timeSubject.subject,
          teacher: timeSubject.isBreak ? null : timeSubject.teacher,
          isBreak: timeSubject.isBreak,
          roomNumber: timeSubject.roomNumber
        }
      });
      toast.success("Period updated successfully");
      dispatch(fetchTimeTables());
      setOpenEditModal(false);
      setTimeSubject({ date: "", subject: "", initialTime: "", finalTime: "", teacher: "", isBreak: false, roomNumber: "" });
    } catch (error) {
      toast.error("Failed to update period");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSinglePeriod = async () => {
    if (!timeSubject.initialTime || !timeSubject.finalTime) {
      return toast.error("Time is required");
    }
    if (!timeSubject.isBreak && (!timeSubject.subject || !timeSubject.teacher)) {
      return toast.error("Please select a teacher and subject");
    }
    setLoading(true);
    try {
      const formattedTime = `${timeSubject.initialTime} - ${timeSubject.finalTime}`;
      await api.post(`/timeTable/addPeriod`, {
        data: {
          classId: selectedClass,
          date: timeSubject.date,
          time: formattedTime,
          subject: timeSubject.isBreak ? "Break/Lunch" : timeSubject.subject,
          teacher: timeSubject.isBreak ? null : timeSubject.teacher,
          isBreak: timeSubject.isBreak,
          roomNumber: timeSubject.roomNumber
        }
      });
      toast.success("Period added successfully");
      dispatch(fetchTimeTables());
      setOpenAddSingleModal(false);
      setTimeSubject({ date: "", subject: "", initialTime: "", finalTime: "", teacher: "", isBreak: false, roomNumber: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add period");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Timetable Scheduler</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage daily class routines</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <DateRangePicker onRangeChange={setDateRange} initialPreset="This Week" />
          <button 
            onClick={() => {
              if (!selectedClass) {
                toast.warn("Please select a class first to add a timetable.");
                return;
              }
              setNewTimeTable({ date: formatDate(new Date()), timeTables: [] });
              setOpenModal(true);
            }} 
            className="btn btn-primary"
          >
            <Plus size={18} /> Add Timetable
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ width: "300px" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Select Class</label>
            <select className="input-glass" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">-- Choose Class --</option>
              {classes?.map(c => (
                <option key={c.id} value={c.id}>{c.className} - {c.section}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedClass ? (
        <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
          {allTimeSlots.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", minWidth: "800px" }}>
              <thead>
                <tr>
                  <th style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", width: "120px" }}>Time</th>
                  {visibleDates.map(date => {
                    const d = new Date(date);
                    return (
                      <th key={date} style={{ padding: "1rem", borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", minWidth: "150px" }}>
                        <div style={{ fontWeight: "600" }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "normal" }}>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {allTimeSlots.map(time => (
                  <tr key={time}>
                    <td style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", fontWeight: "600", whiteSpace: "nowrap", borderRight: "1px solid var(--glass-border)" }}>{time}</td>
                    {visibleDates.map(date => {
                      const period = activeTimeTable?.dates?.[date]?.find(p => p.time === time);
                      return (
                        <td key={date} style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", borderRight: "1px solid var(--glass-border)", background: period?.isBreak ? "rgba(245, 158, 11, 0.05)" : "transparent" }}>
                          {period ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "center" }}>
                              <span style={{ fontWeight: "600", color: period.isBreak ? "#f59e0b" : "var(--accent-primary)", fontSize: "0.875rem" }}>
                                {period.isBreak ? "☕ Break / Lunch" : period.subject}
                              </span>
                              {!period.isBreak && <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{getUserName(period.teacher)}</span>}
                              {period.roomNumber && <span style={{ fontSize: "0.7rem", background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: "4px", marginTop: "2px" }}>Room: {period.roomNumber}</span>}
                              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                                <button onClick={() => handleEditClick(period, date)} className="btn-ghost" style={{ padding: "0.25rem", color: "#60a5fa", cursor: "pointer", border: "none", background: "transparent" }} title="Edit"><Edit2 size={14}/></button>
                                <button onClick={() => handleDeletePeriod(period.id)} className="btn-ghost" style={{ padding: "0.25rem", color: "#ef4444", cursor: "pointer", border: "none", background: "transparent" }} title="Delete"><Trash2 size={14}/></button>
                              </div>
                            </div>
                          ) : (
                            <div className="group relative flex justify-center items-center h-full w-full min-h-[40px]">
                              <span style={{ color: "var(--text-secondary)", opacity: 0.3 }} className="group-hover:hidden">-</span>
                              <button 
                                onClick={() => handleAddSpecificClick(date, time)} 
                                className="hidden group-hover:flex items-center justify-center text-blue-500 hover:text-blue-600 bg-blue-50 rounded-full p-1 transition-all shadow-sm"
                                title="Add Period"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <Calendar size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
              <p>No timetable scheduled for this class yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <p>Please select a class to view its timetable.</p>
        </div>
      )}

      {openModal && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setOpenModal(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "600px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>
              Create Timetable
            </h2>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date</label>
              <input 
                type="date"
                className="input-glass" 
                value={newTimeTable.date} 
                onChange={(e) => setNewTimeTable({ ...newTimeTable, date: e.target.value })}
              />
            </div>

            <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Add Period</h3>
              
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500" }}>
                      <input type="checkbox" checked={timeSubject.isBreak} onChange={(e) => setTimeSubject({...timeSubject, isBreak: e.target.checked})} style={{ width: "16px", height: "16px", accentColor: "var(--accent-primary)" }} />
                      Mark as Break / Lunch
                  </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <TimePicker 
                  label="Start Time" 
                  value={timeSubject.initialTime} 
                  onChange={(val) => setTimeSubject({ ...timeSubject, initialTime: val })} 
                />
                <TimePicker 
                  label="End Time" 
                  value={timeSubject.finalTime} 
                  onChange={(val) => setTimeSubject({ ...timeSubject, finalTime: val })} 
                />
              </div>

              {timeSubject.initialTime && timeSubject.finalTime && (
                <>
                  {!timeSubject.isBreak && (
                    <div style={{ marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Teacher</label>
                        <select className="input-glass" value={timeSubject.teacher} onChange={(e) => setTimeSubject({ ...timeSubject, teacher: e.target.value })}>
                          <option value="">Select Teacher</option>
                          {allTeachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Subject</label>
                        <select className="input-glass" value={timeSubject.subject} onChange={(e) => setTimeSubject({ ...timeSubject, subject: e.target.value })}>
                          <option value="">Select Subject</option>
                          {subjects?.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Room Number (Optional)</label>
                    <select className="input-glass" value={timeSubject.roomNumber} onChange={(e) => setTimeSubject({ ...timeSubject, roomNumber: e.target.value })}>
                      <option value="">Select Room</option>
                      {rooms?.map((r) => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button type="button" onClick={handleAddPeriod} className="btn btn-ghost" style={{ width: "100%" }}>+ Add to List</button>
            </div>

            {newTimeTable.timeTables.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Periods Summary</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {newTimeTable.timeTables.map((pt, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", background: pt.isBreak ? "rgba(245, 158, 11, 0.05)" : "rgba(0,0,0,0.05)", padding: "0.75rem 1rem", borderRadius: "8px" }}>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "0.875rem", color: pt.isBreak ? "#f59e0b" : "inherit" }}>
                          {pt.isBreak ? "☕ Break / Lunch" : pt.subject}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {!pt.isBreak && getUserName(pt.teacher)}
                          {pt.roomNumber && <span style={{ marginLeft: !pt.isBreak ? "8px" : "0" }}>Room: {pt.roomNumber}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.875rem" }}>{pt.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button type="button" onClick={() => setOpenModal(false)} className="btn btn-ghost">Cancel</button>
              <button type="button" onClick={handleSubmit} disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Save Timetable"}</button>
            </div>
          </div>
        </div>
      )}

      {openEditModal && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setOpenEditModal(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "600px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>
              Edit Period
            </h2>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500" }}>
                    <input type="checkbox" checked={timeSubject.isBreak} onChange={(e) => setTimeSubject({...timeSubject, isBreak: e.target.checked})} style={{ width: "16px", height: "16px", accentColor: "var(--accent-primary)" }} />
                    Mark as Break / Lunch
                </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <TimePicker 
                label="Start Time" 
                value={timeSubject.initialTime} 
                onChange={(val) => setTimeSubject({ ...timeSubject, initialTime: val })} 
              />
              <TimePicker 
                label="End Time" 
                value={timeSubject.finalTime} 
                onChange={(val) => setTimeSubject({ ...timeSubject, finalTime: val })} 
              />
            </div>

            {timeSubject.initialTime && timeSubject.finalTime && (
              <>
                {!timeSubject.isBreak && (
                  <div style={{ marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Teacher</label>
                      <select className="input-glass" value={timeSubject.teacher} onChange={(e) => setTimeSubject({ ...timeSubject, teacher: e.target.value })}>
                        <option value="">Select Teacher</option>
                        {allTeachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Subject</label>
                      <select className="input-glass" value={timeSubject.subject} onChange={(e) => setTimeSubject({ ...timeSubject, subject: e.target.value })}>
                        <option value="">Select Subject</option>
                        {subjects?.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Room Number (Optional)</label>
                  <select className="input-glass" value={timeSubject.roomNumber} onChange={(e) => setTimeSubject({ ...timeSubject, roomNumber: e.target.value })}>
                    <option value="">Select Room</option>
                    {rooms?.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
              <button type="button" onClick={() => setOpenEditModal(false)} className="btn btn-ghost">Cancel</button>
              <button type="button" onClick={handleUpdatePeriod} disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Update Period"}</button>
            </div>
          </div>
        </div>
      )}

      {openAddSingleModal && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setOpenAddSingleModal(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "600px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              Add Period
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              {new Date(timeSubject.date).toLocaleDateString()} ({timeSubject.initialTime} - {timeSubject.finalTime})
            </p>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500" }}>
                    <input type="checkbox" checked={timeSubject.isBreak} onChange={(e) => setTimeSubject({...timeSubject, isBreak: e.target.checked})} style={{ width: "16px", height: "16px", accentColor: "var(--accent-primary)" }} />
                    Mark as Break / Lunch
                </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <TimePicker 
                label="Start Time" 
                value={timeSubject.initialTime} 
                onChange={(val) => setTimeSubject({ ...timeSubject, initialTime: val })} 
              />
              <TimePicker 
                label="End Time" 
                value={timeSubject.finalTime} 
                onChange={(val) => setTimeSubject({ ...timeSubject, finalTime: val })} 
              />
            </div>

            {timeSubject.initialTime && timeSubject.finalTime && (
              <>
                {!timeSubject.isBreak && (
                  <div style={{ marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Teacher</label>
                      <select className="input-glass" value={timeSubject.teacher} onChange={(e) => setTimeSubject({ ...timeSubject, teacher: e.target.value })}>
                        <option value="">Select Teacher</option>
                        {allTeachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Subject</label>
                      <select className="input-glass" value={timeSubject.subject} onChange={(e) => setTimeSubject({ ...timeSubject, subject: e.target.value })}>
                        <option value="">Select Subject</option>
                        {subjects?.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Room Number (Optional)</label>
                  <select className="input-glass" value={timeSubject.roomNumber} onChange={(e) => setTimeSubject({ ...timeSubject, roomNumber: e.target.value })}>
                    <option value="">Select Room</option>
                    {rooms?.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
              <button type="button" onClick={() => setOpenAddSingleModal(false)} className="btn btn-ghost">Cancel</button>
              <button type="button" onClick={handleSaveSinglePeriod} disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Add Period"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTable;
