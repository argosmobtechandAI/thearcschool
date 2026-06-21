import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import dragAndDropModule from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './calendar-theme.css'; // Make sure this exists
import { Calendar, Plus, X, Trash2, Download, FileText } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import ConsentReportModal from "../components/ConsentReportModal";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const withDragAndDrop = dragAndDropModule.default || dragAndDropModule;
const DnDCalendar = withDragAndDrop(BigCalendar);

import YearView from './YearView';

const locales = {
  'en-US': enUS,
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

const AnnualPlanner = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    let acStartYear = now.getFullYear();
    if (now.getMonth() < 3) acStartYear -= 1;
    return new Date(acStartYear, 3, 1);
  });
  const [academicYear, setAcademicYear] = useState(() => {
    const now = new Date();
    let acStartYear = now.getFullYear();
    if (now.getMonth() < 3) acStartYear -= 1;
    return `${acStartYear}-${(acStartYear+1).toString().slice(2)}`;
  });
  const [calendarView, setCalendarView] = useState('year');
  const [agendaLength, setAgendaLength] = useState(365);

  const handleViewChange = (newView) => {
    if (newView === 'agenda') {
      if (calendarView === 'year') setAgendaLength(365);
      else if (calendarView === 'month') setAgendaLength(30);
      else if (calendarView === 'week') setAgendaLength(7);
      else if (calendarView === 'day') setAgendaLength(1);
    }
    setCalendarView(newView);
  };
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [formData, setFormData] = useState({
    title: "",
    start_date: "",
    end_date: "",
    description: "",
    category: "Event",
    target_classes: "All", // Store as comma separated string or simple string
    requires_consent: false
  });

  useEffect(() => {
    fetchPlannerEvents();
  }, []);

  const fetchPlannerEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin_panel/planner');
      const formattedEvents = (res.data.data || []).map(e => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start_date + 'T00:00:00'),
        end: new Date((e.end_date || e.start_date) + 'T23:59:59'),
        allDay: true,
        resource: e
      }));
      setEvents(formattedEvents);
    } catch (error) {
      toast.error("Failed to load planner events");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slotInfo) => {
    const { start, end } = slotInfo;
    const startStr = format(start, 'yyyy-MM-dd');
    // For react-big-calendar all-day selection, end might be next day
    const adjustedEnd = new Date(end);
    adjustedEnd.setDate(adjustedEnd.getDate() - 1);
    const endStr = format(start.getTime() === end.getTime() || slotInfo.action === 'click' ? start : adjustedEnd, 'yyyy-MM-dd');

    setFormData({
      title: "",
      start_date: startStr,
      end_date: endStr,
      description: "",
      category: "Event",
      target_classes: "All",
      requires_consent: false
    });
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    const r = event.resource;
    setFormData({
      title: r.title,
      start_date: r.start_date,
      end_date: r.end_date || r.start_date,
      description: r.description || "",
      category: r.category || "Event",
      target_classes: (r.target_classes || []).join(", "),
      requires_consent: r.requires_consent || false
    });
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleEventDrop = async ({ event, start, end, isAllDay }) => {
    const startStr = format(start, 'yyyy-MM-dd');
    // Calculate new end date by preserving duration
    const originalDuration = event.end.getTime() - event.start.getTime();
    const newEnd = new Date(start.getTime() + originalDuration);
    const endStr = format(newEnd, 'yyyy-MM-dd');

    try {
      await api.put(`/admin_panel/planner/${event.id}`, { start_date: startStr, end_date: endStr });
      toast.success("Event rescheduled");
      fetchPlannerEvents();
    } catch (error) {
      toast.error("Failed to reschedule event");
    }
  };

  const handleEventResize = async ({ event, start, end }) => {
    const startStr = format(start, 'yyyy-MM-dd');
    const adjustedEnd = new Date(end);
    adjustedEnd.setDate(adjustedEnd.getDate() - 1);
    const endStr = format(adjustedEnd, 'yyyy-MM-dd');

    try {
      await api.put(`/admin_panel/planner/${event.id}`, { start_date: startStr, end_date: endStr });
      toast.success("Event duration updated");
      fetchPlannerEvents();
    } catch (error) {
      toast.error("Failed to resize event");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      target_classes: formData.target_classes.split(",").map(c => c.trim()).filter(Boolean)
    };

    try {
      if (selectedEvent) {
        await api.put(`/admin_panel/planner/${selectedEvent.id}`, payload);
        toast.success("Event updated");
      } else {
        await api.post('/admin_panel/planner', payload);
        toast.success("Event created");
      }
      setIsModalOpen(false);
      fetchPlannerEvents();
    } catch (error) {
      toast.error("Failed to save event");
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent || !window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.delete(`/admin_panel/planner/${selectedEvent.id}`);
      toast.success("Event deleted");
      setIsModalOpen(false);
      fetchPlannerEvents();
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const eventStyleGetter = (event) => {
    const category = event.resource.category;
    let backgroundColor = '#3b82f6'; // blue (Event)
    
    if (category === 'Holiday') backgroundColor = '#10b981'; // green
    if (category === 'Exam') backgroundColor = '#ef4444'; // red
    if (category === 'PTM') backgroundColor = '#f59e0b'; // amber
    if (category === 'Competition') backgroundColor = '#8b5cf6'; // purple

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        padding: '2px 5px',
        fontSize: '0.85rem',
        fontWeight: '500'
      }
    };
  };

  const handleExportExcel = () => {
    const exportData = events.map(ev => ({
      Title: ev.title,
      "Start Date": format(new Date(ev.start), 'dd MMM yyyy'),
      "End Date": format(new Date(ev.end), 'dd MMM yyyy'),
      Category: ev.resource.category,
      "Target Classes": (ev.resource.target_classes || []).join(', '),
      Description: ev.resource.description || "N/A"
    }));
    exportToExcel(exportData, `Annual_Planner_${academicYear}`, `Annual Planner (${academicYear})`);
  };

  const handleExportPDF = () => {
    const columns = ["Title", "Start Date", "End Date", "Category", "Target Classes", "Description"];
    const exportData = events.map(ev => [
      ev.title,
      format(new Date(ev.start), 'dd MMM yyyy'),
      format(new Date(ev.end), 'dd MMM yyyy'),
      ev.resource.category,
      (ev.resource.target_classes || []).join(', '),
      ev.resource.description || "N/A"
    ]);
    exportToPDF(columns, exportData, `Annual_Planner_${academicYear}`, `Annual Planner (${academicYear})`);
  };

  return (
    <div className="animate-fade-in" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Calendar size={28} color="var(--primary-color)" /> Annual Planner
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage all global academic events and holidays</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <select 
            className="input-glass" 
            style={{ padding: "0.5rem 1rem", width: "auto", fontWeight: "600", cursor: "pointer" }}
            value={academicYear}
            onChange={(e) => {
              const val = e.target.value;
              setAcademicYear(val);
              const startYear = parseInt(val.split('-')[0]);
              setCalendarDate(new Date(startYear, 3, 1));
            }}
          >
            <option value="2025-26">2025-26 Academic Year</option>
            <option value="2026-27">2026-27 Academic Year</option>
            <option value="2027-28">2027-28 Academic Year</option>
          </select>
          <button onClick={handleExportPDF} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", border: "1px solid var(--glass-border)", background: "var(--glass-bg)" }}>
            <Download size={16} /> PDF
          </button>
          <button onClick={handleExportExcel} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", border: "1px solid var(--glass-border)", background: "var(--glass-bg)" }}>
            <Download size={16} /> Excel
          </button>
          <button onClick={() => {
            setFormData({ title: "", start_date: format(new Date(), 'yyyy-MM-dd'), end_date: format(new Date(), 'yyyy-MM-dd'), description: "", category: "Event", target_classes: "All", requires_consent: false });
            setSelectedEvent(null);
            setIsModalOpen(true);
          }} className="btn btn-primary">
            <Plus size={18} style={{ marginRight: "0.5rem" }} /> Add Event
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ flex: 1, padding: "1.5rem", height: "calc(100vh - 180px)", minHeight: "600px", display: "flex", flexDirection: "column" }}>
        {loading && <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>Loading calendar...</div>}
        
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: "500" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#3b82f6" }}></div> General Event
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: "500" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981" }}></div> Holiday
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: "500" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444" }}></div> Exam
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: "500" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f59e0b" }}></div> PTM
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: "500" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#8b5cf6" }}></div> Competition
          </span>
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            allDayAccessor="allDay"
            date={calendarDate}
            view={calendarView}
            onNavigate={setCalendarDate}
            onView={handleViewChange}
            length={agendaLength}
            selectable
            resizable
            views={{ month: true, week: true, day: true, agenda: true, year: YearView }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            eventPropGetter={eventStyleGetter}
            components={{ toolbar: CustomToolbar }}
            style={{ height: '100%', border: "1px solid var(--glass-border)", borderRadius: "12px", overflow: "hidden", background: "rgba(255, 255, 255, 0.4)" }}
          />
        </div>
      </div>

      {isModalOpen && createPortal(
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "500px", padding: "0", maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.5)" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {selectedEvent ? "Edit Planner Event" : "Add Planner Event"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px" }} className="hover-text-primary">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Event Title <span style={{color: "red"}}>*</span></label>
                  <input type="text" required className="input-glass" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g., Summer Vacation, Orientation..." />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Start Date <span style={{color: "red"}}>*</span></label>
                    <input type="date" required className="input-glass" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>End Date (Optional)</label>
                    <input type="date" className="input-glass" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} min={formData.start_date} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Category <span style={{color: "red"}}>*</span></label>
                    <select className="input-glass" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="Event">Event</option>
                      <option value="Holiday">Holiday</option>
                      <option value="Exam">Exam</option>
                      <option value="PTM">PTM</option>
                      <option value="Competition">Competition</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Target Classes</label>
                    <input type="text" className="input-glass" value={formData.target_classes} onChange={e => setFormData({...formData, target_classes: e.target.value})} placeholder="All, Grade 1, Grade 2" />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Description</label>
                  <textarea className="input-glass" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Additional details..." style={{ resize: "vertical" }}></textarea>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="checkbox" id="requires_consent" checked={formData.requires_consent} onChange={e => setFormData({...formData, requires_consent: e.target.checked})} style={{ width: "16px", height: "16px", accentColor: "var(--primary-color)" }} />
                  <label htmlFor="requires_consent" style={{ fontSize: "0.875rem", fontWeight: "500", cursor: "pointer" }}>Requires Parent Consent</label>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                {selectedEvent && formData.requires_consent && (
                  <button type="button" onClick={() => setIsConsentModalOpen(true)} className="btn btn-ghost" style={{ color: "var(--primary-color)", background: "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", gap: "0.25rem", marginRight: "auto" }}>
                    <FileText size={16} /> View Consent Report
                  </button>
                )}
                {selectedEvent && (
                  <button type="button" onClick={handleDelete} className="btn btn-ghost" style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", gap: "0.25rem", marginRight: !formData.requires_consent ? "auto" : "0" }}>
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" style={{ background: "rgba(0,0,0,0.05)", color: "var(--text-primary)" }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)" }}>
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isConsentModalOpen && selectedEvent && createPortal(
        <ConsentReportModal 
          isOpen={isConsentModalOpen} 
          onClose={() => setIsConsentModalOpen(false)} 
          event={selectedEvent ? { id: selectedEvent.id, title: selectedEvent.title } : null} 
        />,
        document.body
      )}
    </div>
  );
};

export default AnnualPlanner;
