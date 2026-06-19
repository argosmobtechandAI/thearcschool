import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEvents } from "../features/dataSlice";
import { toast } from "react-toastify";
import api from "../services/api";
import { Calendar, Plus, Trash2, Edit } from "lucide-react";
import TableFilterHeader from "../components/TableFilterHeader";
import DateRangePicker from "../components/DateRangePicker";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const Events = () => {
  const dispatch = useDispatch();
  const { events } = useSelector((state) => state.data);

  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [formData, setFormData] = useState({
    date: "",
    topic: "",
    time: "",
    attendees: 0,
    status: "pending",
  });

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/admin_panel/events/updateEvents/${editingId}`, { data: formData });
        toast.success("Event updated successfully");
      } else {
        await api.post("/admin_panel/events/createEvents", { data: formData });
        toast.success("Event created successfully");
      }
      dispatch(fetchEvents());
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await api.delete(`/admin_panel/events/deleteEvents/${id}`);
        toast.success("Event deleted");
        dispatch(fetchEvents());
      } catch (error) {
        toast.error("Failed to delete event");
      }
    }
  };

  const handleOpenModal = (event = null) => {
    if (event) {
      setEditingId(event.id);
      setFormData({
        date: event.date || "",
        topic: event.topic || "",
        time: event.time?.slice(0, 5) || "",
        attendees: event.attendees || 0,
        status: event.status || "pending",
      });
    } else {
      setEditingId(null);
      setFormData({ date: "", topic: "", time: "", attendees: 0, status: "pending" });
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingId(null);
  };

  const filteredEvents = events?.filter(event => {
    const matchesStatus = !statusFilter || event.status === statusFilter;
    const matchesSearch = !searchQuery || event.topic?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      if (event.date) {
        const itemDate = new Date(event.date);
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

    return matchesStatus && matchesSearch && matchesDate;
  });

  const exportColumnsList = [
    { key: "topic", label: "Topic" },
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "attendees", label: "Attendees" },
    { key: "status", label: "Status" }
  ];

  const handleExportExcel = (selectedKeys) => {
    const dataToExport = filteredEvents?.map(item => {
      const row = {};
      const addIfSelected = (key, val) => {
         if (!selectedKeys || selectedKeys.includes(key)) {
           const label = exportColumnsList.find(c => c.key === key)?.label;
           if (label) row[label] = val;
         }
      };
      addIfSelected("topic", item.topic);
      addIfSelected("date", item.date);
      addIfSelected("time", item.time);
      addIfSelected("attendees", item.attendees);
      addIfSelected("status", item.status);
      return row;
    }) || [];
    exportToExcel(dataToExport, "Events_Report");
    toast.success("Excel downloaded");
  };

  const handleExportPDF = (selectedKeys) => {
    const activeColumns = exportColumnsList.filter(c => !selectedKeys || selectedKeys.includes(c.key));
    const columnLabels = activeColumns.map(c => c.label);

    const dataToExport = filteredEvents?.map(item => {
      const row = [];
      const addIfSelected = (key, val) => {
         if (!selectedKeys || selectedKeys.includes(key)) row.push(val);
      };
      addIfSelected("topic", item.topic);
      addIfSelected("date", item.date);
      addIfSelected("time", item.time);
      addIfSelected("attendees", item.attendees);
      addIfSelected("status", item.status);
      return row;
    }) || [];
    exportToPDF(columnLabels, dataToExport, "Events_Report", "Events Report");
    toast.success("PDF downloaded");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Events & Calendar</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage school-wide activities</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          <Plus size={18} /> Create Event
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <TableFilterHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search events..."
          exportColumns={exportColumnsList}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          filters={[
            {
              label: "All Statuses",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" }
              ]
            }
          ]}
        >
          <DateRangePicker onRangeChange={setDateRange} />
        </TableFilterHeader>
        {filteredEvents?.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <Calendar size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
            <p>No events found.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
            {filteredEvents?.map((event) => (
              <div key={event.id} className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-primary)" }}>{event.topic}</h3>
                  <span style={{ 
                    padding: "4px 8px", 
                    borderRadius: "12px", 
                    fontSize: "0.75rem", 
                    fontWeight: "600",
                    background: event.status === "approved" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                    color: event.status === "approved" ? "#6ee7b7" : "#fcd34d"
                  }}>
                    {event.status.toUpperCase()}
                  </span>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Calendar size={16} /> {event.date} • {event.time}
                  </div>
                  <div>Attendees: <strong style={{ color: "var(--text-primary)" }}>{event.attendees}</strong></div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
                  <button onClick={() => handleOpenModal(event)} className="btn btn-ghost" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}>
                    <Edit size={16} /> Edit
                  </button>
                  <button onClick={() => handleDelete(event.id)} className="btn btn-ghost" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", color: "#ef4444" }}>
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openModal && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={handleCloseModal}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>
              {editingId ? "Update Event" : "Create Event"}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Event Topic</label>
                <input required className="input-glass" value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })} />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date</label>
                  <input required type="date" className="input-glass" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Time</label>
                  <input required type="time" className="input-glass" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Expected Attendees</label>
                  <input required type="number" className="input-glass" value={formData.attendees} onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Status</label>
                  <select required className="input-glass" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={handleCloseModal} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Save Event"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
