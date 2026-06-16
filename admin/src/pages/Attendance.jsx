import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers } from "../features/dataSlice";
import { Search, Calendar, UserCheck, FileSpreadsheet, FileText, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
// import { toast } from "react-toastify";
// import api from "../services/api";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { toast } from "react-toastify";
import api from "../services/api";
import TableFilterHeader from "../components/TableFilterHeader";
import DateRangePicker from "../components/DateRangePicker";
import { useSortableData } from "../hooks/useSortableData";

const Attendance = () => {
  const dispatch = useDispatch();
  const { users, loadingUsers } = useSelector((state) => state.data);

  const [activeTab, setActiveTab] = useState("student");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: new Date().toISOString().split("T")[0], end: new Date().toISOString().split("T")[0] });
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([
    "name", "attendancePercentage", "todayStatus"
  ]);
  
  const todayString = new Date().toISOString().split("T")[0];
  
  const [formData, setFormData] = useState({
    date: todayString,
    status: "",
  });

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
  }, [dispatch, users.length]);

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => u.type === activeTab)
      .filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((user) => {
        const attendanceArray = user.attendance || [];
        let filteredAttendance = [];

        if (dateRange.start && dateRange.end) {
          filteredAttendance = attendanceArray.filter((a) => {
            const aDate = new Date(a.date);
            return aDate >= new Date(dateRange.start) && aDate <= new Date(dateRange.end);
          });
        } else if (dateRange.start) {
          filteredAttendance = attendanceArray.filter((a) => new Date(a.date) >= new Date(dateRange.start));
        } else if (dateRange.end) {
          filteredAttendance = attendanceArray.filter((a) => new Date(a.date) <= new Date(dateRange.end));
        } else {
          filteredAttendance = attendanceArray;
        }

        const totalDays = filteredAttendance.length;
        const presentDays = filteredAttendance.filter((a) => a.status === "present").length;
        const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        const todayStatus = attendanceArray.find((a) => a.date === todayString)?.status || "not marked";

        return { ...user, attendancePercentage: percentage, todayStatus };
      })
      .filter((user) => {
        if (classFilter && activeTab === 'student') {
          if (!user.classes || !user.classes.includes(Number(classFilter))) return false;
        }
        if (!statusFilter || statusFilter === "all") return true;
        
        return user.attendance?.some((a) => {
          let inRange = true;
          if (dateRange.start && dateRange.end) {
            const aDate = new Date(a.date);
            inRange = aDate >= new Date(dateRange.start) && aDate <= new Date(dateRange.end);
          }
          return inRange && a.status === statusFilter;
        });
      });
  }, [users, activeTab, searchQuery, dateRange, statusFilter, classFilter, todayString]);

  const handleOpenModal = (user) => {
    setSelectedUser(user);
    setFormData({ date: todayString, status: user.todayStatus !== "not marked" ? user.todayStatus : "" });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/user/updateAttendace/${selectedUser.id}`, { data: formData });
      toast.success("Attendance marked successfully");
      setIsModalOpen(false);
      dispatch(fetchUsers()); // refresh
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    }
  };

  const exportColumnsList = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "attendancePercentage", label: "Attendance %" },
    { key: "todayStatus", label: "Today's Status" }
  ];

  const { items: sortedUsers, requestSort, sortConfig } = useSortableData(filteredUsers);

  const handleExportExcel = (selectedKeys) => {
    const dataToExport = filteredUsers.map(u => {
      const row = {};
      const addIfSelected = (key, value) => {
        if (!selectedKeys || selectedKeys.includes(key)) {
          const colDef = exportColumnsList.find(c => c.key === key);
          if (colDef) row[colDef.label] = value || "N/A";
        }
      };
      
      addIfSelected("name", u.name);
      addIfSelected("email", u.email);
      addIfSelected("phone", u.phone);
      addIfSelected("attendancePercentage", `${u.attendancePercentage}%`);
      addIfSelected("todayStatus", u.todayStatus);
      return row;
    });
    exportToExcel(dataToExport, `Attendance_${activeTab}`);
  };

  const handleExportPDF = (selectedKeys) => {
    const activeColumns = exportColumnsList.filter(c => !selectedKeys || selectedKeys.includes(c.key));
    const columnLabels = activeColumns.map(c => c.label);
    
    const dataToExport = filteredUsers.map(u => {
      const row = [];
      const addIfSelected = (key, value) => {
        if (!selectedKeys || selectedKeys.includes(key)) row.push(value || "N/A");
      };
      
      addIfSelected("name", u.name);
      addIfSelected("email", u.email);
      addIfSelected("phone", u.phone);
      addIfSelected("attendancePercentage", `${u.attendancePercentage}%`);
      addIfSelected("todayStatus", u.todayStatus);
      return row;
    });
    exportToPDF(columnLabels, dataToExport, `Attendance_${activeTab}`, `Attendance (${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)})`);
  };

  const renderCell = (user, key) => {
    switch (key) {
      case "name": return (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: "500" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {user.name.charAt(0)}
          </div>
          {user.name}
        </div>
      );
      case "email": return <span style={{ color: "var(--text-secondary)" }}>{user.email}</span>;
      case "phone": return user.phone || "N/A";
      case "attendancePercentage": return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1, maxWidth: "100px", height: "8px", background: "rgba(0,0,0,0.08)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ 
              height: "100%", 
              width: `${user.attendancePercentage}%`, 
              background: user.attendancePercentage >= 75 ? "#10b981" : user.attendancePercentage >= 50 ? "#f59e0b" : "#ef4444" 
            }} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: "500" }}>{user.attendancePercentage}%</span>
        </div>
      );
      case "todayStatus": return (
        <span style={{ 
          padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500", textTransform: "capitalize",
          background: user.todayStatus === "present" ? "rgba(16, 185, 129, 0.2)" : user.todayStatus === "late" ? "rgba(245, 158, 11, 0.2)" : user.todayStatus === "absent" ? "rgba(239, 68, 68, 0.2)" : "rgba(0,0,0,0.08)",
          color: user.todayStatus === "present" ? "#6ee7b7" : user.todayStatus === "late" ? "#fcd34d" : user.todayStatus === "absent" ? "#fca5a5" : "var(--text-secondary)"
        }}>
          {user.todayStatus}
        </span>
      );
      default: return "N/A";
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Attendance Tracking</h1>
          <p style={{ color: "var(--text-secondary)" }}>Monitor daily and weekly attendance</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {["student", "teacher", "principal"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn ${activeTab === tab ? "btn-primary" : "btn-ghost"}`}
            style={{ textTransform: "capitalize" }}
          >
            {tab}s
          </button>
        ))}
      </div>

      {/* Controls */}
      <TableFilterHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search name..."
        exportColumns={exportColumnsList}
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        filters={[
          ...(activeTab === 'student' ? [{
            label: "All Classes",
            value: classFilter,
            onChange: setClassFilter,
            options: users.reduce((acc, user) => {
              if (user.type === 'student' && user.classes) {
                user.classes.forEach(c => {
                  if (!acc.find(item => item.value === c)) {
                    acc.push({ label: `Class ${c}`, value: c }); // We ideally need the class name from redux but here we only have the ID
                  }
                });
              }
              return acc;
            }, [])
          }] : []),
          {
            label: "All Statuses",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "present", label: "Present" },
              { value: "late", label: "Late" },
              { value: "absent", label: "Absent" }
            ]
          }
        ]}
      >
        <DateRangePicker onRangeChange={setDateRange} />
      </TableFilterHeader>



      {/* Table */}
      <div className="glass-panel" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr>
              {exportColumnsList.map(col => selectedColumns.includes(col.key) && (
                <th key={col.key} style={{ cursor: "pointer" }} onClick={() => requestSort(col.key)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
                    {col.label}
                    {sortConfig?.key === col.key ? (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    ) : (
                      <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />
                    )}
                  </div>
                </th>
              ))}
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingUsers ? (
              <tr><td colSpan={selectedColumns.length + 1} style={{ padding: "2rem", textAlign: "center" }}>Loading...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={selectedColumns.length + 1} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No records found.</td></tr>
            ) : (
              sortedUsers.map((user) => (
                <tr key={user.id}>
                  {exportColumnsList.map(col => {
                    if (!selectedColumns.includes(col.key)) return null;
                    return <td key={col.key}>{renderCell(user, col.key)}</td>;
                  })}
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button onClick={() => handleOpenModal(user)} className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "13px" }}>
                      <UserCheck size={16} style={{ marginRight: "4px" }} /> Mark
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && selectedUser && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setIsModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ width: "64px", height: "64px", margin: "0 auto 1rem", borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "bold" }}>
                {selectedUser.name.charAt(0)}
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700" }}>{selectedUser.name}</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Mark Attendance</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date</label>
                <input required type="date" className="input-glass" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Status</label>
                <select required className="input-glass" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ appearance: "none" }}>
                  <option value="" disabled>Select Status</option>
                  <option value="present" style={{ color: "black" }}>Present</option>
                  <option value="late" style={{ color: "black" }}>Late</option>
                  <option value="absent" style={{ color: "black" }}>Absent</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!formData.status}>Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
