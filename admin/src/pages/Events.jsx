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
    description: "",
    location: "",
    target_audience: "All",
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
        description: event.description || "",
        location: event.location || "",
        target_audience: event.target_audience || "All",
      });
    } else {
      setEditingId(null);
      setFormData({ date: "", topic: "", description: "", location: "", target_audience: "All" });
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingId(null);
  };

  const filteredEvents = events?.filter(event => {
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

    return matchesSearch && matchesDate;
  });
  const exportColumnsList = [
    { key: "topic", label: "Topic" },
    { key: "description", label: "Description" },
    { key: "date", label: "Date" },
    { key: "location", label: "Location" },
    { key: "target_audience", label: "Target Audience" }
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
      addIfSelected("description", item.description);
      addIfSelected("date", item.date);
      addIfSelected("location", item.location);
      addIfSelected("target_audience", item.target_audience);
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
      addIfSelected("description", item.description);
      addIfSelected("date", item.date);
      addIfSelected("location", item.location);
      addIfSelected("target_audience", item.target_audience);
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
        >
          <DateRangePicker value={dateRange} onRangeChange={setDateRange} initialPreset="this_month" />
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
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Calendar size={16} /> {event.date}
                  </div>
                  {event.location && (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <strong>Location:</strong> <span style={{ color: "var(--text-primary)" }}>{event.location}</span>
                    </div>
                  )}
                  {event.target_audience && (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <strong>Audience:</strong> <span style={{ color: "var(--text-primary)" }}>{event.target_audience}</span>
                    </div>
                  )}
                  {event.description && (
                    <div style={{ marginTop: "0.5rem", padding: "0.75rem", background: "rgba(0,0,0,0.02)", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.05)" }}>
                      {event.description}
                    </div>
                  )}
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
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 50, overflowY: "auto", padding: "2rem 1rem" }} onClick={handleCloseModal}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem", overflow: "visible", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>
              {editingId ? "Update Event" : "Create Event"}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Event Topic</label>
                <input required className="input-glass" value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })} placeholder="e.g. Freshers Party" />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Description</label>
                <textarea rows="3" className="input-glass" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g. Outbound training trip to the Red Fort for 10th grade..." />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Location</label>
                  <input className="input-glass" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. School Auditorium" />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Target Audience</label>
                  <input className="input-glass" value={formData.target_audience} onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })} placeholder="e.g. All Students, Class 10A..." />
                </div>
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date</label>
                <input required type="date" className="input-glass" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
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
