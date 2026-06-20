import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTimeTables, fetchClasses, fetchUsers, fetchSubjects, fetchRooms } from "../features/dataSlice";
import { toast } from "react-toastify";
import api from "../services/api";
import { Calendar, Plus, Clock, ChevronLeft, ChevronRight, Edit2, Trash2, Filter, Download, Copy } from "lucide-react";
import TimePicker from "../components/TimePicker";
import DateRangePicker, { formatDate } from "../components/DateRangePicker";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enGB from 'date-fns/locale/en-GB';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import dragAndDropModule from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './calendar-theme.css';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: 'white',
    borderColor: state.isFocused ? '#3b82f6' : '#e5e7eb',
    borderRadius: '0.5rem',
    minHeight: '42px',
    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db'
    }
  }),
  menu: (base) => ({
    ...base,
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    zIndex: 100,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  }),
  menuList: (base) => ({
    ...base,
    padding: 0
  }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected ? '#eff6ff' : state.isFocused ? '#f3f4f6' : 'white',
    color: state.isSelected ? '#1d4ed8' : '#374151',
    cursor: 'pointer',
    fontSize: '0.875rem',
    '&:active': {
      background: '#e5edff'
    }
  }),
  singleValue: (base) => ({
    ...base,
    color: '#111827',
    fontSize: '0.875rem'
  }),
  input: (base) => ({
    ...base,
    color: '#111827',
    fontSize: '0.875rem'
  }),
  placeholder: (base) => ({
    ...base,
    color: '#9ca3af',
    fontSize: '0.875rem'
  })
};

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
})

const getThisWeek = () => {
  const curr = new Date(); 
  const first = curr.getDate() - curr.getDay() + 1; // Monday
  const last = first + 6; // Sunday
  return { start: formatDate(new Date(curr.setDate(first))), end: formatDate(new Date(curr.setDate(last))) };
};

const CustomToolbar = (toolbar) => {
  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };

  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };

  const goToCurrent = () => {
    toolbar.onNavigate('TODAY');
  };

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
  if (event.resource?.isMark) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontWeight: 'bold' }}>
        {event.title}
      </div>
    );
  }
  
  if (event.resource?.isBreak) {
    return (
      <div style={{ padding: '2px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
        <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>☕ Break / Lunch</div>
      </div>
    );
  }

  const { subject, roomNumber, teacherName, time } = event.resource;

  return (
    <div style={{ padding: '2px 4px', display: 'flex', flexDirection: 'column', gap: '2px', height: '100%', color: '#ffffff' }}>
      <div style={{ fontWeight: 'bold', fontSize: '0.9rem', lineHeight: '1.2' }}>{subject}</div>
      <div style={{ fontSize: '0.75rem', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
        <span role="img" aria-label="teacher" style={{ fontSize: '0.7rem' }}>👤</span> {teacherName || "Unassigned"}
      </div>
      {roomNumber && (
        <div style={{ fontSize: '0.75rem', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span role="img" aria-label="room" style={{ fontSize: '0.7rem' }}>🚪</span> {roomNumber}
        </div>
      )}
      <div style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span role="img" aria-label="time" style={{ fontSize: '0.7rem' }}>⏱️</span> {time}
      </div>
    </div>
  );
};

export default function TimeTable() {
  const [activeTab, setActiveTab] = useState("view");
  const dispatch = useDispatch();
  const { classes, timeTables, users, subjects, rooms } = useSelector((state) => state.data);

  const [selectedClass, setSelectedClass] = useState("");
  const [dateRange, setDateRange] = useState(getThisWeek());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState(Views.WEEK);
  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openAddSingleModal, setOpenAddSingleModal] = useState(false);
  const [openDuplicateModal, setOpenDuplicateModal] = useState(false);
  const [duplicateConfig, setDuplicateConfig] = useState({ sourceDate: "", targetStartDate: "", targetEndDate: "", copyMode: "exact" });
  const [loading, setLoading] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState(null);
  const [publicHolidays, setPublicHolidays] = useState([]);

  const [newTimeTable, setNewTimeTable] = useState({ date: "", timeTables: [] });
  const [timeSubject, setTimeSubject] = useState({ date: "", subject: "", initialTime: "", finalTime: "", teacher: "", isBreak: false, roomNumber: "" });

  useEffect(() => {
    dispatch(fetchTimeTables());
    dispatch(fetchClasses());
    dispatch(fetchUsers());
    dispatch(fetchSubjects());
    dispatch(fetchRooms());
    
    api.get('/holidays').then(res => setPublicHolidays(res.data.data || [])).catch(console.error);
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

  const sortedClasses = useMemo(() => {
    if (!classes) return [];
    
    const classOrder = {
      'PLAY': 1,
      'NUR': 2,
      'LKG': 3,
      'UKG': 4
    };

    return [...classes].sort((a, b) => {
      const getOrder = (name) => {
        const strName = String(name).toUpperCase().trim();
        if (classOrder[strName]) return classOrder[strName];
        
        const num = parseInt(strName, 10);
        if (!isNaN(num)) return 10 + num;
        
        return 100; // fallback
      };

      const orderA = getOrder(a.className);
      const orderB = getOrder(b.className);

      if (orderA !== orderB) return orderA - orderB;
      return String(a.section).localeCompare(String(b.section));
    });
  }, [classes]);

  const getUserName = (userId) => {
    const user = users?.find(u => u.id === userId);
    return user ? user.name : "Unknown";
  };

  const allTeachers = useMemo(() => users?.filter(u => u.type === "teacher") || [], [users]);

  const allTimeSlots = useMemo(() => {
    if (!activeTimeTable || !activeTimeTable.dates) return [];
    const times = new Set();
    Object.values(activeTimeTable.dates).forEach(periodsForDate => {
      periodsForDate.forEach(p => {
        if (p && p.time && p.time !== "All Day") times.add(p.time);
      });
    });
    return Array.from(times).sort((a, b) => {
      if (!a || !b) return 0;
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

  const eventStyleGetter = (event, start, end, isSelected) => {
    let backgroundColor = '#3b82f6'; // Solid blue
    let color = '#ffffff';
    let borderLeft = 'none';
    let opacity = 0.95;

    if (event.resource?.isBreak) {
      backgroundColor = '#f59e0b'; // Solid orange
      color = '#ffffff';
      borderLeft = 'none';
    }

    return {
      style: {
        backgroundColor,
        color,
        borderLeft,
        borderRadius: '6px',
        opacity,
        border: 'none',
        display: 'block'
      }
    };
  };

  const dayPropGetter = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    
    const markType = getDayMarkType(dateStr);
    if (markType === 'Holiday' || markType === 'Public Holiday') {
      return { style: { backgroundColor: 'rgba(16, 185, 129, 0.1)' } }; // Light green tint
    }
    if (markType === 'Week Off') {
      return { style: { backgroundColor: 'rgba(99, 102, 241, 0.1)' } }; // Light purple tint
    }
    return {};
  };

  const handleSelectEvent = (event) => {
    if (event.resource?.isMark) return; 
    handleEditClick(event.resource, event.resource.date);
  };

  const handleSelectSlot = ({ start, end, action }) => {
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    
    const initialTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    const finalTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;

    setTimeSubject({
      date: dateStr,
      subject: "",
      initialTime,
      finalTime,
      teacher: "",
      isBreak: false,
      roomNumber: ""
    });
    setOpenAddSingleModal(true);
  };

  const handleEventDrop = async ({ event, start, end }) => {
    if (event.resource?.isMark) return; 

    const pad = (n) => n.toString().padStart(2, '0');
    const newDateStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    
    const markType = getDayMarkType(newDateStr);
    if (markType === "Public Holiday" || markType === "Holiday" || markType === "Week Off") {
      return toast.error(`Cannot move period to a ${markType}.`);
    }

    const initialTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    const finalTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
    const formattedTime = `${initialTime} - ${finalTime}`;

    const existingPeriods = activeTimeTable?.dates?.[newDateStr] || [];
    const isOverlapping = existingPeriods.some(p => {
      if (p.id === event.id) return false;
      const [pStart, pEnd] = p.time.split(" - ");
      return initialTime < pEnd && finalTime > pStart;
    });

    if (isOverlapping) {
      return toast.error("This time slot overlaps with an existing period on this date.");
    }

    setLoading(true);
    try {
      await api.put(`/admin_panel/timeTable/updatePeriod/${event.id}`, {
        data: {
          date: newDateStr,
          time: formattedTime,
          subject: event.resource.subject,
          teacher: event.resource.teacher,
          isBreak: event.resource.isBreak,
          roomNumber: event.resource.roomNumber
        }
      });
      toast.success("Period moved successfully");
      dispatch(fetchTimeTables());
    } catch (error) {
      toast.error("Failed to move period");
    } finally {
      setLoading(false);
    }
  };

  const handleEventResize = handleEventDrop;

  const handleRangeChange = (range) => {
    if (Array.isArray(range)) {
      if (range.length > 0) {
        setDateRange({ start: formatDate(range[0]), end: formatDate(range[range.length - 1]) });
      }
    } else {
      setDateRange({ start: formatDate(range.start), end: formatDate(range.end) });
    }
  };

  const handlePrevInterval = () => {
    if (!dateRange.start || !dateRange.end) {
      setDateRange(getThisWeek());
      return;
    }
    const s = new Date(dateRange.start);
    const e = new Date(dateRange.end);
    const intervalDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    
    s.setDate(s.getDate() - intervalDays);
    e.setDate(e.getDate() - intervalDays);
    setDateRange({ start: formatDate(s), end: formatDate(e) });
  };

  const handleNextInterval = () => {
    if (!dateRange.start || !dateRange.end) {
      setDateRange(getThisWeek());
      return;
    }
    const s = new Date(dateRange.start);
    const e = new Date(dateRange.end);
    const intervalDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    
    s.setDate(s.getDate() + intervalDays);
    e.setDate(e.getDate() + intervalDays);
    setDateRange({ start: formatDate(s), end: formatDate(e) });
  };

  const handleCreateSubject = async (inputValue) => {
    try {
      setLoading(true);
      await api.post("/admin_panel/subjects/createSubject", {
        data: { name: inputValue.toUpperCase() }
      });
      toast.success(`Subject "${inputValue.toUpperCase()}" created successfully`);
      dispatch(fetchSubjects());
      setTimeSubject({ ...timeSubject, subject: inputValue.toUpperCase() });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create subject");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPeriod = () => {
    if (!newTimeTable.date || !timeSubject.initialTime || !timeSubject.finalTime) {
      toast.error("Please fill required fields for the period");
      return;
    }
    const markType = getDayMarkType(newTimeTable.date);
    if (markType === "Public Holiday" || markType === "Holiday" || markType === "Week Off") {
      toast.error(`Cannot add period on a ${markType}.`);
      return;
    }
    if (timeSubject.initialTime >= timeSubject.finalTime) {
      toast.error("End time must be after start time");
      return;
    }

    const existingPeriods = activeTimeTable?.dates?.[newTimeTable.date] || [];
    const isOverlappingExisting = existingPeriods.some(p => {
      const [pStart, pEnd] = p.time.split(" - ");
      return timeSubject.initialTime < pEnd && timeSubject.finalTime > pStart;
    });
    if (isOverlappingExisting) {
      toast.error("Overlaps with an existing period on this date.");
      return;
    }

    const isOverlappingNew = newTimeTable.timeTables.some(p => {
      const [pStart, pEnd] = p.time.split(" - ");
      return timeSubject.initialTime < pEnd && timeSubject.finalTime > pStart;
    });
    if (isOverlappingNew) {
      toast.error("Overlaps with a period you just added to this list.");
      return;
    }
    const formattedTime = `${timeSubject.initialTime} - ${timeSubject.finalTime}`;
    setNewTimeTable({
      ...newTimeTable,
      timeTables: [
        ...newTimeTable.timeTables,
        {
          subject: timeSubject.isBreak ? "Break/Lunch" : (timeSubject.subject || "Unassigned"),
          teacher: timeSubject.isBreak ? null : (timeSubject.teacher || null),
          time: formattedTime,
          isBreak: timeSubject.isBreak,
          roomNumber: timeSubject.roomNumber
        }
      ]
    });
    setTimeSubject({ day: "", subject: "", initialTime: "", finalTime: "", teacher: "", isBreak: false, roomNumber: "" });
  };

  const handleMarkDay = async (date, type) => {
    if (!window.confirm(`Are you sure you want to mark ${date} as a ${type}? This will clear all existing periods for this date.`)) return;
    setLoading(true);
    try {
      const existingPeriods = activeTimeTable?.dates?.[date] || [];
      for (const period of existingPeriods) {
        await api.delete(`/admin_panel/timeTable/deletePeriod/${period.id}`);
      }
      await api.post("/admin_panel/timeTable/createTimeTable", {
        data: {
          classId: selectedClass,
          date: date,
          timeTables: [{ time: "All Day", subject: type, isBreak: true }]
        }
      });
      toast.success(`Marked as ${type}`);
      dispatch(fetchTimeTables());
    } catch (err) {
      toast.error(`Failed to mark ${type.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDayMark = async (date) => {
    if (!window.confirm(`Are you sure you want to remove the mark on ${date}?`)) return;
    setLoading(true);
    try {
      const markPeriod = activeTimeTable?.dates?.[date]?.find(p => p.subject === "Holiday" || p.subject === "Week Off");
      if (markPeriod) {
        await api.delete(`/admin_panel/timeTable/deletePeriod/${markPeriod.id}`);
        toast.success("Removed successfully");
        dispatch(fetchTimeTables());
      }
    } catch (err) {
      toast.error("Failed to remove");
    } finally {
      setLoading(false);
    }
  };

  const getDayMarkType = (date) => {
    const d = new Date(date);
    if (d.getDay() === 0) return "Week Off";
    if (publicHolidays.some(h => h.date === date)) return "Public Holiday";
    
    const period = activeTimeTable?.dates?.[date]?.find(p => p.subject === "Holiday" || p.subject === "Week Off");
    return period ? period.subject : null;
  };

  const calendarEvents = useMemo(() => {
    const events = [];
    if (!activeTimeTable) return events;

    if (activeTimeTable.dates) {
      Object.keys(activeTimeTable.dates).forEach(dateStr => {
        const periods = activeTimeTable.dates[dateStr];
        if (periods) {
          periods.forEach(p => {
            if (!p.time) return;
            const [startT, endT] = p.time.split(" - ");
            events.push({
              id: p.id,
              title: p.isBreak ? "☕ Break / Lunch" : `${p.subject}`,
              start: new Date(`${dateStr}T${startT}:00`),
              end: new Date(`${dateStr}T${endT}:00`),
              resource: { ...p, date: dateStr, teacherName: getUserName(p.teacher) }
            });
          });
        }
      });
    }
    return events;
  }, [activeTimeTable, publicHolidays, visibleDates]);

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

  const handleSubmit = async () => {
    if (!newTimeTable.date || newTimeTable.timeTables.length === 0) {
      toast.error("Add at least one period before submitting");
      return;
    }
    setLoading(true);
    try {
      await api.post("/admin_panel/timeTable/createTimeTable", {
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

  const handleDeletePeriod = async (period) => {
    if (period.subject !== "Unassigned" && period.subject !== "") {
      if (!window.confirm(`This period is already assigned to a subject/teacher. Are you sure you want to delete it?`)) return;
    } else {
      if (!window.confirm("Are you sure you want to delete this period?")) return;
    }
    try {
      await api.delete(`/admin_panel/timeTable/deletePeriod/${period.id}`);
      toast.success("Period deleted successfully");
      dispatch(fetchTimeTables());
      setOpenEditModal(false);
    } catch (error) {
      toast.error("Failed to delete period");
    }
  };

  const handleDeleteSlot = async (time) => {
    if (!window.confirm(`Are you sure you want to delete the entire ${time} slot?`)) return;

    const periodsToDelete = [];
    const conflictDates = [];

    if (activeTimeTable && activeTimeTable.dates) {
      Object.keys(activeTimeTable.dates).forEach(date => {
        const period = activeTimeTable.dates[date].find(p => p.time === time);
        if (period) {
          if (period.subject !== "Unassigned" && period.subject !== "Holiday" && period.subject !== "Week Off") {
            conflictDates.push(new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          }
          periodsToDelete.push(period.id);
        }
      });
    }

    if (conflictDates.length > 0) {
      const datesStr = conflictDates.join(", ");
      toast.error(`Cannot delete slot. It contains booked classes on: ${datesStr}. Please clear them first.`, { autoClose: 6000 });
      return;
    }

    setLoading(true);
    try {
      for (const id of periodsToDelete) {
        await api.delete(`/admin_panel/timeTable/deletePeriod/${id}`);
      }
      toast.success("Time slot deleted successfully");
      dispatch(fetchTimeTables());
    } catch (error) {
      toast.error("Failed to delete time slot");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (period, date) => {
    const [initialTime, finalTime] = period.time.split(" - ");
    setTimeSubject({
      id: period._id || period.id,
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

    const existingPeriods = activeTimeTable?.dates?.[timeSubject.date] || [];
    const isOverlapping = existingPeriods.some(p => {
      if (p.id === editingPeriodId) return false;
      const [pStart, pEnd] = p.time.split(" - ");
      return timeSubject.initialTime < pEnd && timeSubject.finalTime > pStart;
    });
    if (isOverlapping) {
      return toast.error("This time slot overlaps with an existing period on this date.");
    }

    setLoading(true);
    try {
      const formattedTime = `${timeSubject.initialTime} - ${timeSubject.finalTime}`;
      await api.put(`/admin_panel/timeTable/updatePeriod/${editingPeriodId}`, {
        data: {
          time: formattedTime,
          subject: timeSubject.isBreak ? "Break/Lunch" : (timeSubject.subject || "Unassigned"),
          teacher: timeSubject.isBreak ? null : (timeSubject.teacher || null),
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

    const markType = getDayMarkType(timeSubject.date);
    if (markType === "Public Holiday" || markType === "Holiday" || markType === "Week Off") {
      toast.error(`Cannot add period on a ${markType}.`);
      return;
    }

    const existingPeriods = activeTimeTable?.dates?.[timeSubject.date] || [];
    const isOverlapping = existingPeriods.some(p => {
      const [pStart, pEnd] = p.time.split(" - ");
      return timeSubject.initialTime < pEnd && timeSubject.finalTime > pStart;
    });
    if (isOverlapping) {
      return toast.error("This time slot overlaps with an existing period on this date.");
    }

    setLoading(true);
    try {
      const formattedTime = `${timeSubject.initialTime} - ${timeSubject.finalTime}`;
      await api.post(`/admin_panel/timeTable/addPeriod`, {
        data: {
          classId: selectedClass,
          date: timeSubject.date,
          time: formattedTime,
          subject: timeSubject.isBreak ? "Break/Lunch" : (timeSubject.subject || "Unassigned"),
          teacher: timeSubject.isBreak ? null : (timeSubject.teacher || null),
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

  const handleDuplicateDay = async () => {
    if (!duplicateConfig.sourceDate || !duplicateConfig.targetStartDate || !duplicateConfig.targetEndDate) {
      return toast.error("Please fill all required fields");
    }
    if (duplicateConfig.targetStartDate > duplicateConfig.targetEndDate) {
      return toast.error("Target end date must be after target start date");
    }
    setLoading(true);
    try {
      await api.post("/admin_panel/timeTable/duplicateDay", {
        classId: selectedClass,
        sourceDate: duplicateConfig.sourceDate,
        targetStartDate: duplicateConfig.targetStartDate,
        targetEndDate: duplicateConfig.targetEndDate,
        copyMode: duplicateConfig.copyMode
      });
      toast.success("Schedule duplicated successfully!");
      dispatch(fetchTimeTables());
      setOpenDuplicateModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to duplicate schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!activeTimeTable || allTimeSlots.length === 0) return toast.warn("No timetable to export");
    const dataToExport = allTimeSlots.map(time => {
      const row = { Time: time };
      visibleDates.forEach(date => {
        const markType = getDayMarkType(date);
        const period = activeTimeTable?.dates?.[date]?.find(p => p.time === time);
        
        if (markType) {
          row[date] = markType.toUpperCase();
        } else if (period) {
          if (period.isBreak) row[date] = "Break / Lunch";
          else {
            row[date] = `${period.subject} (${getUserName(period.teacher)})${period.roomNumber ? ` - Room: ${period.roomNumber}` : ""}`;
          }
        } else {
          row[date] = "-";
        }
      });
      return row;
    });
    exportToExcel(dataToExport, `Timetable_${activeClassData?.className}_${activeClassData?.section}`, `Timetable - ${activeClassData?.className} ${activeClassData?.section}`);
  };

  const handleExportPDF = async () => {
    if (!activeTimeTable || allTimeSlots.length === 0) return toast.warn("No timetable to export");
    const columns = ["Time", ...visibleDates];
    const dataToExport = allTimeSlots.map(time => {
      const row = [time];
      visibleDates.forEach(date => {
        const markType = getDayMarkType(date);
        const period = activeTimeTable?.dates?.[date]?.find(p => p.time === time);
        
        if (markType) {
          row.push(markType.toUpperCase());
        } else if (period) {
          if (period.isBreak) row.push("Break / Lunch");
          else {
            row.push(`${period.subject} (${getUserName(period.teacher)})${period.roomNumber ? ` - Room: ${period.roomNumber}` : ""}`);
          }
        } else {
          row.push("-");
        }
      });
      return row;
    });
    await exportToPDF(columns, dataToExport, `Timetable_${activeClassData?.className}_${activeClassData?.section}`, `Timetable - ${activeClassData?.className} ${activeClassData?.section}`);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Timetable Scheduler</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage daily class routines</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {selectedClass && allTimeSlots.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={handleExportExcel} className="btn btn-ghost" title="Export to Excel">
                <Download size={18} /> Excel
              </button>
              <button onClick={handleExportPDF} className="btn btn-ghost" title="Export to PDF">
                <Download size={18} /> PDF
              </button>
            </div>
          )}
          <button 
            onClick={() => {
              if (!selectedClass) {
                toast.warn("Please select a class first.");
                return;
              }
              setDuplicateConfig({ sourceDate: formatDate(new Date()), targetStartDate: "", targetEndDate: "", copyMode: "exact" });
              setOpenDuplicateModal(true);
            }} 
            className="btn btn-ghost" style={{ border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.05)" }}
          >
            <Copy size={18} /> Duplicate Schedule
          </button>
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
              {sortedClasses?.map(c => (
                <option key={c.id} value={c.id}>{c.className} - {c.section}</option>
              ))}
            </select>
          </div>
          
        </div>
      </div>

      {selectedClass ? (
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ height: "calc(100vh - 280px)", minHeight: "600px", marginTop: "1rem" }}>
            <DnDCalendar
              localizer={localizer}
              culture="en-GB"
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              date={calendarDate}
              view={calendarView}
              onNavigate={(newDate) => setCalendarDate(newDate)}
              onView={(newView) => setCalendarView(newView)}
              min={minTime}
              max={maxTime}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              step={30}
              timeslots={2}
              selectable={true}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onRangeChange={handleRangeChange}
              eventPropGetter={eventStyleGetter}
              dayPropGetter={dayPropGetter}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              draggableAccessor={() => true}
              resizable
              components={{
                toolbar: CustomToolbar,
                event: CustomEvent
              }}
              style={{ fontFamily: "'Inter', sans-serif", color: "var(--text-primary)" }}
            />
          </div>
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
                        <Select 
                          styles={selectStyles}
                          options={allTeachers.map(t => ({ value: t.id, label: t.name }))}
                          value={allTeachers.map(t => ({ value: t.id, label: t.name })).find(opt => opt.value === timeSubject.teacher) || null}
                          onChange={(option) => setTimeSubject({ ...timeSubject, teacher: option ? option.value : "" })}
                          placeholder="Search Teacher..."
                          isClearable
                          menuPlacement="auto"
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Subject</label>
                        <CreatableSelect 
                          styles={selectStyles}
                          options={subjects?.map(s => ({ value: s.name, label: s.name })) || []}
                          value={timeSubject.subject ? { value: timeSubject.subject, label: timeSubject.subject } : null}
                          onChange={(option) => setTimeSubject({ ...timeSubject, subject: option ? option.value : "" })}
                          onCreateOption={handleCreateSubject}
                          formatCreateLabel={(inputValue) => `Create new subject: "${inputValue.toUpperCase()}"`}
                          placeholder="Search or Create..."
                          isClearable
                          menuPlacement="auto"
                        />
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
                      <Select 
                        styles={selectStyles}
                        options={allTeachers.map(t => ({ value: t.id, label: t.name }))}
                        value={allTeachers.map(t => ({ value: t.id, label: t.name })).find(opt => opt.value === timeSubject.teacher) || null}
                        onChange={(option) => setTimeSubject({ ...timeSubject, teacher: option ? option.value : "" })}
                        placeholder="Search Teacher..."
                        isClearable
                        menuPlacement="auto"
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Subject</label>
                      <CreatableSelect 
                        styles={selectStyles}
                        options={subjects?.map(s => ({ value: s.name, label: s.name })) || []}
                        value={timeSubject.subject ? { value: timeSubject.subject, label: timeSubject.subject } : null}
                        onChange={(option) => setTimeSubject({ ...timeSubject, subject: option ? option.value : "" })}
                        onCreateOption={handleCreateSubject}
                        formatCreateLabel={(inputValue) => `Create new subject: "${inputValue.toUpperCase()}"`}
                        placeholder="Search or Create..."
                        isClearable
                        menuPlacement="auto"
                      />
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

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
              <button 
                type="button" 
                onClick={() => handleDeletePeriod(timeSubject)} 
                className="btn btn-ghost hover-bg" 
                style={{ color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.05)" }}
              >
                Delete
              </button>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button type="button" onClick={() => setOpenEditModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="button" onClick={handleUpdatePeriod} disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Update Period"}</button>
              </div>
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
                      <Select 
                        styles={selectStyles}
                        options={allTeachers.map(t => ({ value: t.id, label: t.name }))}
                        value={allTeachers.map(t => ({ value: t.id, label: t.name })).find(opt => opt.value === timeSubject.teacher) || null}
                        onChange={(option) => setTimeSubject({ ...timeSubject, teacher: option ? option.value : "" })}
                        placeholder="Search Teacher..."
                        isClearable
                        menuPlacement="auto"
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Subject</label>
                      <CreatableSelect 
                        styles={selectStyles}
                        options={subjects?.map(s => ({ value: s.name, label: s.name })) || []}
                        value={timeSubject.subject ? { value: timeSubject.subject, label: timeSubject.subject } : null}
                        onChange={(option) => setTimeSubject({ ...timeSubject, subject: option ? option.value : "" })}
                        onCreateOption={handleCreateSubject}
                        formatCreateLabel={(inputValue) => `Create new subject: "${inputValue.toUpperCase()}"`}
                        placeholder="Search or Create..."
                        isClearable
                        menuPlacement="auto"
                      />
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

      {openDuplicateModal && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setOpenDuplicateModal(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Duplicate Schedule</h2>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Source Date (Copy From)</label>
                <input type="date" className="input-glass" value={duplicateConfig.sourceDate} onChange={(e) => setDuplicateConfig({ ...duplicateConfig, sourceDate: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Target Start Date (Copy To)</label>
                <input type="date" className="input-glass" value={duplicateConfig.targetStartDate} onChange={(e) => setDuplicateConfig({ ...duplicateConfig, targetStartDate: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Target End Date (Copy Until)</label>
                <input type="date" className="input-glass" value={duplicateConfig.targetEndDate} onChange={(e) => setDuplicateConfig({ ...duplicateConfig, targetEndDate: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" }}>Copy Mode</label>
                <select className="input-glass" value={duplicateConfig.copyMode} onChange={(e) => setDuplicateConfig({ ...duplicateConfig, copyMode: e.target.value })}>
                  <option value="exact">Exact Copy (Keep Subjects & Teachers)</option>
                  <option value="structure">Structure Only (Set all to Unassigned)</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
              <button type="button" onClick={() => setOpenDuplicateModal(false)} className="btn btn-ghost">Cancel</button>
              <button type="button" onClick={handleDuplicateDay} disabled={loading} className="btn btn-primary">{loading ? "Duplicating..." : "Duplicate"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
