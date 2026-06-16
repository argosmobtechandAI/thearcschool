import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";
import { fetchUsers } from "../features/dataSlice";
import { ShieldAlert, Plus } from "lucide-react";
import TableFilterHeader from "../components/TableFilterHeader";
import DateRangePicker from "../components/DateRangePicker";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const Complaints = () => {
  const dispatch = useDispatch();
  const { users } = useSelector((state) => state.data);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({ type: "", student: [], description: "", status: "pending" });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const students = users?.filter(u => u.type === "student") || [];

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get("/complaint/getComplaint");
      setComplaints(res.data.complaint || []);
    } catch (e) {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    if (users.length === 0) dispatch(fetchUsers());
  }, [dispatch, users.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/complaint/createComplaint", { data: formData });
      toast.success("Complaint logged successfully");
      setOpenModal(false);
      fetchComplaints();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to log complaint");
    }
  };

  const filteredComplaints = complaints?.filter(c => {
    const matchesSearch = !searchQuery || c.type?.toLowerCase().includes(searchQuery.toLowerCase()) || c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    
    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const itemDateStr = c.created_at || Date.now();
      const itemDate = new Date(itemDateStr);
      if (dateRange.start && dateRange.end) {
        matchesDate = itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
      } else if (dateRange.start) {
        matchesDate = itemDate >= new Date(dateRange.start);
      } else if (dateRange.end) {
        matchesDate = itemDate <= new Date(dateRange.end);
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const exportColumnsList = [
    { key: "type", label: "Type" },
    { key: "description", label: "Description" },
    { key: "date", label: "Date" },
    { key: "status", label: "Status" },
    { key: "students", label: "Students Involved" }
  ];

  const handleExportExcel = (selectedKeys) => {
    const dataToExport = filteredComplaints?.map(item => {
      const row = {};
      const addIfSelected = (key, val) => {
         if (!selectedKeys || selectedKeys.includes(key)) {
           const label = exportColumnsList.find(c => c.key === key)?.label;
           if (label) row[label] = val;
         }
      };
      addIfSelected("type", item.type);
      addIfSelected("description", item.description);
      addIfSelected("date", new Date(item.created_at || Date.now()).toLocaleDateString());
      addIfSelected("status", item.status || "pending");
      addIfSelected("students", item.student?.length || 0);
      return row;
    }) || [];
    exportToExcel(dataToExport, "Complaints_Report");
    toast.success("Excel downloaded");
  };

  const handleExportPDF = (selectedKeys) => {
    const activeColumns = exportColumnsList.filter(c => !selectedKeys || selectedKeys.includes(c.key));
    const columnLabels = activeColumns.map(c => c.label);

    const dataToExport = filteredComplaints?.map(item => {
      const row = [];
      const addIfSelected = (key, val) => {
         if (!selectedKeys || selectedKeys.includes(key)) row.push(val);
      };
      addIfSelected("type", item.type);
      addIfSelected("description", item.description);
      addIfSelected("date", new Date(item.created_at || Date.now()).toLocaleDateString());
      addIfSelected("status", item.status || "pending");
      addIfSelected("students", item.student?.length || 0);
      return row;
    }) || [];
    exportToPDF(columnLabels, dataToExport, "Complaints_Report", "Complaints Report");
    toast.success("PDF downloaded");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Complaints</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage student complaints and disciplinary actions</p>
        </div>
        <button onClick={() => setOpenModal(true)} className="btn btn-primary">
          <Plus size={18} /> Log Complaint
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <TableFilterHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search complaints..."
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
                { value: "resolved", label: "Resolved" }
              ]
            }
          ]}
        >
          <DateRangePicker onRangeChange={setDateRange} />
        </TableFilterHeader>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>Loading...</div>
        ) : filteredComplaints.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <ShieldAlert size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
            No complaints found.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", marginTop: "1rem" }}>
            {filteredComplaints.map((c) => (
              <div key={c.id} className="glass-card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "600" }}>{c.type}</h3>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                      {new Date(c.created_at || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{ 
                    padding: "4px 8px", 
                    borderRadius: "12px", 
                    fontSize: "0.75rem", 
                    fontWeight: "600",
                    background: c.status === "resolved" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                    color: c.status === "resolved" ? "#6ee7b7" : "#fcd34d",
                    textTransform: "capitalize"
                  }}>
                    {c.status || "pending"}
                  </span>
                </div>
                <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>{c.description}</p>
                <div style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
                  <strong>Students Involved:</strong> {c.student?.length || 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openModal && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setOpenModal(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>Log Complaint</h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Complaint Type</label>
                <input required className="input-glass" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Description</label>
                <textarea required className="input-glass" style={{ minHeight: "100px", resize: "vertical" }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Select Student (ID)</label>
                  <select required className="input-glass" style={{ appearance: "none" }} onChange={(e) => setFormData({...formData, student: [e.target.value]})}>
                    <option value="" style={{ color: "black" }}>Select a student...</option>
                    {students.map(s => <option key={s.id} value={s.id} style={{ color: "black" }}>{s.name} ({s.email})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Status</label>
                  <select required className="input-glass" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    <option value="pending" style={{ color: "black" }}>Pending</option>
                    <option value="resolved" style={{ color: "black" }}>Resolved</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setOpenModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
