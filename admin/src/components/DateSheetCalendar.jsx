import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enGB from 'date-fns/locale/en-GB';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import dragAndDropModule from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import '../pages/calendar-theme.css';
import { toast } from "react-toastify";
import api from "../services/api";
import { fetchExams } from "../features/dataSlice";
import TimePicker from "./TimePicker";
import { X } from "lucide-react";
import Select from 'react-select';

const withDragAndDrop = dragAndDropModule.default || dragAndDropModule;
const DnDCalendar = withDragAndDrop(BigCalendar);

const locales = {
  'en-GB': enGB,
}
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CustomToolbar = (toolbar) => {
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  const goToCurrent = () => toolbar.onNavigate('TODAY');

  return (
    <div className="rbc-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0.5rem' }}>
      <div className="rbc-btn-group">
        <button type="button" onClick={goToCurrent}>Today</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: '600', fontSize: '1.1rem', color: "var(--text-primary)" }}>
        <button type="button" onClick={goToBack} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#3b82f6', border: 'none', color: '#ffffff', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontSize: '1.2rem', lineHeight: '1' }} className="hover-bg">&#10094;</button>
        <span style={{ minWidth: "160px", textAlign: "center" }}>{toolbar.label}</span>
        <button type="button" onClick={goToNext} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#3b82f6', border: 'none', color: '#ffffff', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontSize: '1.2rem', lineHeight: '1' }} className="hover-bg">&#10095;</button>
      </div>

      <div className="rbc-btn-group">
        {toolbar.views.map(viewName => (
          <button
            key={viewName}
            type="button"
            className={toolbar.view === viewName ? 'rbc-active' : ''}
            onClick={() => toolbar.onView(viewName)}
          >
            {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

const CustomEvent = ({ event }) => {
  if (event.resource?.isPlannerEvent) {
    let bgColor = "rgba(59, 130, 246, 0.8)"; // Event
    if (event.resource.category === 'Holiday') bgColor = "rgba(16, 185, 129, 0.8)"; 
    else if (event.resource.category === 'Exam') bgColor = "rgba(239, 68, 68, 0.8)"; 
    else if (event.resource.category === 'PTM') bgColor = "rgba(245, 158, 11, 0.8)"; 
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontWeight: 'bold', backgroundColor: bgColor, color: 'white', borderRadius: '4px', padding: '2px 4px', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {event.title}
      </div>
    );
  }

  const { subject, time, marks, invigilator } = event.resource;
  return (
    <div style={{ 
      padding: '4px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '2px', 
      minHeight: '100%', 
      height: 'max-content',
      backgroundColor: '#8b5cf6', 
      color: '#ffffff', 
      borderRadius: '6px',
      zIndex: 10,
      position: 'relative'
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '0.8rem', lineHeight: '1.1' }}>{subject}</div>
      <div style={{ fontSize: '0.75rem', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span role="img" aria-label="time" style={{ fontSize: '0.7rem' }}>⏱️</span> {time?.slice(0, 5)}
      </div>
      {marks && (
        <div style={{ fontSize: '0.75rem', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span role="img" aria-label="marks" style={{ fontSize: '0.7rem' }}>💯</span> {marks} Marks
        </div>
      )}
      {invigilator && (
        <div style={{ fontSize: '0.75rem', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span role="img" aria-label="teacher" style={{ fontSize: '0.7rem' }}>👤</span> {invigilator}
        </div>
      )}
    </div>
  );
};

export default function DateSheetCalendar({ exams, classes, users, subjects, rooms, classFilter, sectionFilter, customTitles = [], selectedTitle, setSelectedTitle }) {
  const dispatch = useDispatch();
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState(Views.MONTH);
  const [agendaLength, setAgendaLength] = useState(30);
  const [plannerEvents, setPlannerEvents] = useState([]);

  useEffect(() => {
    api.get('/admin_panel/planner').then(res => {
      setPlannerEvents(res.data.data || []);
    }).catch(console.error);
  }, []);

  const handleViewChange = (newView) => {
    if (newView === 'agenda') {
      if (calendarView === 'month') setAgendaLength(30);
      else if (calendarView === 'week') setAgendaLength(7);
      else if (calendarView === 'day') setAgendaLength(1);
    }
    setCalendarView(newView);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [examSubject, setExamSubject] = useState({
    id: null, ids: [], date: "", time: "", subject: "", duration: "", marks: "", sectionDetails: {}
  });
  const [loading, setLoading] = useState(false);

  const availableTitles = useMemo(() => {
    return [...new Set([
      ...exams.filter(e => e.class === classFilter).map(e => e.title),
      ...customTitles
    ])].filter(Boolean);
  }, [exams, classFilter, customTitles]);

  useEffect(() => {
    if (availableTitles.length > 0 && !selectedTitle) {
      setSelectedTitle(availableTitles[0]);
    }
  }, [availableTitles, selectedTitle, setSelectedTitle]);

  const calendarEvents = useMemo(() => {
    if (!classFilter) return [];

    const pEvents = [];
    if (plannerEvents) {
      const activeClass = classes?.find(c => c.className === classFilter || c.name === classFilter);
      plannerEvents.forEach(pe => {
        const targets = Array.isArray(pe.target_classes) ? pe.target_classes : [];
        const isTarget = targets.includes("All") || targets.some(t => {
           if (!activeClass) return false;
           const lower = t.toLowerCase();
           const className = activeClass.name || activeClass.className || "";
           return className.toLowerCase().includes(lower) || 
                  `${className} ${activeClass.section || ''}`.toLowerCase().includes(lower);
        });
        
        if (isTarget) {
          pEvents.push({
            id: `planner-${pe.id}`,
            title: pe.title,
            start: new Date(pe.start_date + "T00:00:00"),
            end: new Date((pe.end_date || pe.start_date) + "T23:59:59"),
            allDay: true,
            resource: { isPlannerEvent: true, ...pe }
          });
        }
      });
    }

    if (!selectedTitle) return pEvents;
    
    let filtered = exams.filter(e => e.class === classFilter && e.title === selectedTitle);

    const grouped = {};
    filtered.forEach(ex => {
      const key = `${ex.subject}-${ex.date}-${ex.time}`;
      const sectionData = {
        exam_id: ex.id,
        class_id: ex.class_id,
        section: ex.section,
        invigilator_id: ex.invigilator_id,
        room_number: ex.room_number
      };

      if (!grouped[key]) {
        grouped[key] = { ...ex, ids: [ex.id], sectionsData: [sectionData] };
      } else {
        grouped[key].ids.push(ex.id);
        grouped[key].sectionsData.push(sectionData);
      }
    });

    let finalEvents = Object.values(grouped);
    if (sectionFilter) {
      finalEvents = finalEvents.filter(group => group.sectionsData.some(s => s.section === sectionFilter));
    }

    const regularEvents = finalEvents.map(ex => {
      const [hour, min] = ex.time.split(":");
      const start = new Date(ex.date);
      start.setHours(parseInt(hour, 10), parseInt(min, 10), 0);
      
      const end = new Date(start.getTime() + (ex.duration || 60) * 60000);

      let invigilatorName = null;
      if (sectionFilter) {
        const match = ex.sectionsData.find(s => s.section === sectionFilter);
        if (match) invigilatorName = users?.find(u => u.id === match.invigilator_id)?.name;
      } else {
        const uniqueInvigIds = [...new Set(ex.sectionsData.map(s => s.invigilator_id).filter(Boolean))];
        if (uniqueInvigIds.length === 1) {
          invigilatorName = users?.find(u => u.id === uniqueInvigIds[0])?.name;
        } else if (uniqueInvigIds.length > 1) {
          invigilatorName = "Multiple Invigilators";
        }
      }

      return {
        id: ex.id,
        ids: ex.ids,
        title: ex.subject,
        start,
        end,
        resource: { ...ex, sectionsData: ex.sectionsData, invigilator: invigilatorName }
      };
    });

    return [...pEvents, ...regularEvents];
  }, [exams, classFilter, selectedTitle, users, sectionFilter, plannerEvents, classes]);

  const eventStyleGetter = () => ({
    style: { backgroundColor: 'transparent', border: 'none', overflow: 'visible', zIndex: 5, padding: 0 }
  });

  const { minTime, maxTime } = useMemo(() => {
    let minH = 8;
    let maxH = 18;
    calendarEvents.forEach(e => {
      if (!e.allDay && e.start && e.end) {
        if (e.start.getHours() < minH) minH = e.start.getHours();
        if (e.end.getHours() > maxH) maxH = e.end.getHours();
        if (e.end.getMinutes() > 0 && e.end.getHours() === maxH) maxH++;
      }
    });
    return {
      minTime: new Date(1970, 0, 1, minH, 0, 0),
      maxTime: new Date(1970, 0, 1, maxH, 0, 0)
    };
  }, [calendarEvents]);

  const handleSelectSlot = ({ start }) => {
    if (!classFilter) return toast.warn("Please select a Class from the top filter first.");
    if (!selectedTitle) return toast.warn("Please select a Title from the dropdown first.");

    const initialSectionDetails = {};
    const classSections = classes?.filter(c => c.className === classFilter) || [];
    classSections.forEach(c => {
      initialSectionDetails[c.id] = { invigilator_id: "", room_number: "", exam_id: null };
    });

    setExamSubject({
      id: null, ids: [], date: format(start, 'yyyy-MM-dd'), time: "09:00", subject: "", duration: "", marks: "", sectionDetails: initialSectionDetails
    });
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    if (!classFilter) return toast.warn("Please select a Class from the top filter first.");
    if (!selectedTitle) return toast.warn("Please select a Title from the dropdown first.");

    const today = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const initialSectionDetails = {};
    const classSections = classes?.filter(c => c.className === classFilter) || [];
    classSections.forEach(c => {
      initialSectionDetails[c.id] = { invigilator_id: "", room_number: "", exam_id: null };
    });

    setExamSubject({
      id: null, ids: [], date: dateStr, time: "09:00", subject: "", duration: "", marks: "", sectionDetails: initialSectionDetails
    });
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    const ex = event.resource;
    const sectionDetails = {};
    const classSections = classes?.filter(c => c.className === classFilter) || [];
    classSections.forEach(c => {
      const match = ex.sectionsData?.find(s => s.class_id === c.id);
      sectionDetails[c.id] = {
        invigilator_id: match ? (match.invigilator_id || "") : "",
        room_number: match ? (match.room_number || "") : "",
        exam_id: match ? match.exam_id : null
      };
    });

    setExamSubject({
      id: ex.id, ids: event.ids, date: ex.date, time: ex.time, subject: ex.subject, duration: ex.duration || "", marks: ex.marks || "", sectionDetails
    });
    setIsModalOpen(true);
  };

  const handleEventDrop = async ({ event, start }) => {
    const pad = (n) => n.toString().padStart(2, '0');
    const newDateStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const newTimeStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    
    setLoading(true);
    try {
      await Promise.all(event.ids.map(id => 
        api.put(`/admin_panel/exams/updateExams/${id}`, { data: { date: newDateStr, time: newTimeStr } })
      ));
      toast.success("Exam moved successfully");
      dispatch(fetchExams());
    } catch (error) {
      toast.error("Failed to move exam");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExam = async () => {
    if (!examSubject.subject || !examSubject.date || !examSubject.time) {
      return toast.error("Please fill required fields (Subject, Date, Time)");
    }
    setLoading(true);
    try {
      if (examSubject.ids && examSubject.ids.length > 0) {
        await Promise.all(Object.entries(examSubject.sectionDetails).map(([classId, details]) => {
          if (details.exam_id) {
            return api.put(`/admin_panel/exams/updateExams/${details.exam_id}`, {
              data: {
                subject: examSubject.subject,
                date: examSubject.date,
                time: examSubject.time,
                duration: examSubject.duration,
                marks: examSubject.marks,
                invigilator_id: details.invigilator_id || null,
                room_number: details.room_number || null
              }
            });
          }
        }));
        toast.success("Exam updated");
      } else {
        const classObj = classes?.find(c => c.className === classFilter);
        await api.post(`/admin_panel/exams/datesheet`, {
          data: {
            title: selectedTitle,
            class: classFilter,
            subjects: [{
              subject: examSubject.subject,
              date: examSubject.date,
              time: examSubject.time,
              duration: examSubject.duration,
              marks: examSubject.marks
            }],
            sectionsData: examSubject.sectionDetails
          }
        });
        toast.success("Exam added to Date Sheet");
      }
      dispatch(fetchExams());
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!window.confirm("Delete this exam?")) return;
    setLoading(true);
    try {
      await Promise.all(examSubject.ids.map(id => 
        api.delete(`/admin_panel/exams/deleteExams/${id}`)
      ));
      toast.success("Exam deleted");
      dispatch(fetchExams());
      setIsModalOpen(false);
    } catch (err) {
      toast.error("Failed to delete exam");
    } finally {
      setLoading(false);
    }
  };

  const classSubjects = useMemo(() => {
    if (!classFilter) return [];
    const clsObj = classes?.find(c => c.className === classFilter || c.name === classFilter);
    if (!clsObj) return [];
    return subjects?.filter(s => s.classIds?.includes(clsObj.id)) || [];
  }, [subjects, classes, classFilter]);

  return (
    <div className="glass-card" style={{ padding: "0.5rem 1rem", marginTop: "0.5rem" }}>
      {!classFilter ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280' }}>
          Please select a Class from the top filter to view or create a Date Sheet Calendar.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: "500", margin: 0 }}>Title:</label>
              <select 
                className="input-glass" 
                value={selectedTitle} 
                onChange={e => setSelectedTitle(e.target.value)}
                style={{ appearance: "none", margin: 0, padding: "0.25rem 0.75rem", height: "32px", fontSize: "0.875rem", width: "200px" }}
              >
                <option value="">-- Select Date Sheet --</option>
                {availableTitles.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ height: "32px", padding: "0 1rem", fontSize: "0.875rem", marginLeft: "auto" }}>
              Add Exam
            </button>
          </div>

          <div style={{ height: "65vh", minHeight: "400px", background: 'white', borderRadius: '12px', padding: '0.25rem', border: '1px solid #e5e7eb' }}>
            <DnDCalendar
              localizer={localizer}
              events={calendarEvents}
              date={calendarDate}
              view={calendarView}
              onNavigate={setCalendarDate}
              onView={handleViewChange}
              length={agendaLength}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              onEventDrop={handleEventDrop}
              resizable={false}
              components={{
                toolbar: CustomToolbar,
                event: CustomEvent
              }}
              eventPropGetter={eventStyleGetter}
              step={30}
              timeslots={2}
              min={minTime}
              max={maxTime}
            />
          </div>
        </>
      )}

      {isModalOpen && createPortal(
        <div 
          className="animate-fade-in" 
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }} 
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="glass-panel modal-content" 
            style={{ width: "100%", maxWidth: "600px", padding: "2rem", position: "relative", maxHeight: "90vh", overflowY: "auto" }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>{examSubject.id ? "Edit Exam" : "Add Exam to Date Sheet"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="icon-btn hover-bg" style={{ position: "absolute", top: "1.5rem", right: "1.5rem" }}><X size={20} /></button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Subject *</label>
                  <select 
                    className="input-glass" 
                    style={{ width: "100%" }}
                    value={examSubject.subject} 
                    onChange={(e) => setExamSubject({...examSubject, subject: e.target.value})}
                  >
                    <option value="">Select Subject</option>
                    {classSubjects.map((sub, i) => (
                      <option key={i} value={sub.name}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Date *</label>
                  <input 
                    type="date" 
                    className="input-glass" 
                    style={{ width: "100%" }}
                    value={examSubject.date} 
                    onChange={(e) => setExamSubject({...examSubject, date: e.target.value})} 
                  />
                </div>
                <div>
                  <TimePicker 
                    label="Time *"
                    value={examSubject.time} 
                    onChange={(val) => setExamSubject({...examSubject, time: val})} 
                    placeholder="Start Time"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Duration (mins)</label>
                  <input 
                    type="number" 
                    className="input-glass" 
                    style={{ width: "100%" }}
                    value={examSubject.duration} 
                    onChange={(e) => setExamSubject({...examSubject, duration: e.target.value})} 
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Total Marks</label>
                  <input 
                    type="number" 
                    className="input-glass" 
                    style={{ width: "100%" }}
                    value={examSubject.marks} 
                    onChange={(e) => setExamSubject({...examSubject, marks: e.target.value})} 
                  />
                </div>
              </div>

              <div style={{ marginTop: "0.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Section Assignments</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {classes?.filter(c => c.className === classFilter).sort((a, b) => (a.section || "").localeCompare(b.section || "")).map(c => (
                    <div key={c.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "1rem", alignItems: "end", padding: "0.75rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontWeight: "600", paddingBottom: "0.5rem", color: "#475569" }}>Sec {c.section}</div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem", color: "#64748b" }}>Invigilator</label>
                        <Select
                          options={users?.filter(u => u.type === 'teacher').sort((a,b) => a.name.localeCompare(b.name)).map(t => ({ value: t.id, label: t.name }))}
                          value={examSubject.sectionDetails[c.id]?.invigilator_id ? { value: examSubject.sectionDetails[c.id].invigilator_id, label: users.find(u => u.id === examSubject.sectionDetails[c.id].invigilator_id)?.name } : null}
                          onChange={(selectedOption) => setExamSubject(prev => ({
                            ...prev, sectionDetails: { ...prev.sectionDetails, [c.id]: { ...prev.sectionDetails[c.id], invigilator_id: selectedOption ? selectedOption.value : "" } }
                          }))}
                          isClearable
                          placeholder="Search..."
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              borderColor: 'var(--glass-border)',
                              background: 'rgba(255, 255, 255, 0.5)',
                              fontSize: '0.875rem'
                            }),
                            valueContainer: (base) => ({
                              ...base,
                              padding: '0 8px'
                            }),
                            input: (base) => ({
                              ...base,
                              margin: 0,
                              padding: 0
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 100
                            })
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem", color: "#64748b" }}>Room</label>
                        <select 
                          className="input-glass" 
                          style={{ width: "100%", padding: "0.375rem 0.75rem", minHeight: "36px" }}
                          value={examSubject.sectionDetails[c.id]?.room_number || ""} 
                          onChange={(e) => setExamSubject(prev => ({
                            ...prev, sectionDetails: { ...prev.sectionDetails, [c.id]: { ...prev.sectionDetails[c.id], room_number: e.target.value } }
                          }))}
                        >
                          <option value="">Select Room</option>
                          {rooms?.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                {examSubject.id ? (
                  <button onClick={handleDeleteExam} className="btn btn-ghost" style={{ color: "#ef4444" }}>Delete</button>
                ) : <div></div>}
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                  <button onClick={handleSaveExam} className="btn btn-primary" disabled={loading}>
                    {loading ? "Saving..." : "Save Exam"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
