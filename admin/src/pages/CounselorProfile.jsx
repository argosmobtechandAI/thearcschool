import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchNewUsers } from "../features/dataSlice";
import { ArrowLeft, User, Phone, Mail, Calendar, CheckCircle, XCircle, Clock, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import TableFilterHeader from "../components/TableFilterHeader";
import { useSortableData } from "../hooks/useSortableData";
import { toast } from "react-toastify";

const CounselorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { users, newUsers, loadingUsers, loadingNewUsers } = useSelector((state) => state.data);
  const counselor = useMemo(() => {
    return users.find(u => String(u.id) === String(id) && u.type === 'admission') || null;
  }, [users, id]);

  const [filter, setFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedColumns, setSelectedColumns] = useState([
    "name", "email", "parent", "status", "documents"
  ]);

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
    if (newUsers.length === 0) dispatch(fetchNewUsers());
  }, [dispatch, users.length, newUsers.length]);

  const assignedStudents = useMemo(() => {
    if (!newUsers || !counselor) return [];
    return newUsers.filter(nu => String(nu.assigned_to) === String(counselor.id));
  }, [newUsers, counselor]);

  const stats = useMemo(() => {
    return {
      total: assignedStudents.length,
      pending: assignedStudents.filter(s => s.status?.toLowerCase() === 'pending').length,
      approved: assignedStudents.filter(s => s.status?.toLowerCase() === 'approved').length,
      rejected: assignedStudents.filter(s => s.status?.toLowerCase() === 'rejected').length,
    };
  }, [assignedStudents]);

  const filteredUsers = assignedStudents?.filter(
    (user) =>
      (filter === "All" || user.status?.toLowerCase() === filter.toLowerCase()) &&
      (genderFilter === "" || user.gender === genderFilter) &&
      user.name?.toLowerCase().includes(search.toLowerCase())
  );

  const { items: sortedUsers, requestSort, sortConfig } = useSortableData(filteredUsers || []);

  const exportColumnsList = [
    { key: "name", label: "Applicant Name" },
    { key: "email", label: "Email" },
    { key: "parent", label: "Parent Name" },
    { key: "parentEmail", label: "Parent Email" },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status" },
    { key: "documents", label: "Documents" },
    { key: "dob", label: "Date of Birth" },
    { key: "gender", label: "Gender" },
    { key: "created_at", label: "Applied Date" }
  ];

  const handleExportExcel = (selectedKeys) => {
    const dataToExport = filteredUsers?.map(u => {
      const row = {};
      const addIfSelected = (key, value) => {
        if (!selectedKeys || selectedKeys.includes(key)) {
          const colDef = exportColumnsList.find(c => c.key === key);
          if (colDef) row[colDef.label] = value || "N/A";
        }
      };

      addIfSelected("name", u.name);
      addIfSelected("email", u.email);
      addIfSelected("parent", u.parent);
      addIfSelected("parentEmail", u.parentEmail);
      addIfSelected("phone", u.phone);
      addIfSelected("status", u.status);
      addIfSelected("documents", Array.isArray(u.documents) ? u.documents.map(d => d.type).join(", ") : "N/A");
      addIfSelected("dob", u.dob);
      addIfSelected("gender", u.gender);
      addIfSelected("created_at", u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A");
      return row;
    }) || [];
    exportToExcel(dataToExport, "Assigned_Prospects_Report");
    toast.success("Excel downloaded");
  };

  const handleExportPDF = (selectedKeys) => {
    const activeColumns = exportColumnsList.filter(c => !selectedKeys || selectedKeys.includes(c.key));
    const columnLabels = activeColumns.map(c => c.label);

    const dataToExport = filteredUsers?.map(u => {
      const row = [];
      const addIfSelected = (key, value) => {
        if (!selectedKeys || selectedKeys.includes(key)) row.push(value || "N/A");
      };

      addIfSelected("name", u.name);
      addIfSelected("email", u.email);
      addIfSelected("parent", u.parent);
      addIfSelected("parentEmail", u.parentEmail);
      addIfSelected("phone", u.phone);
      addIfSelected("status", u.status);
      addIfSelected("documents", Array.isArray(u.documents) ? u.documents.map(d => d.type).join(", ") : "N/A");
      addIfSelected("dob", u.dob);
      addIfSelected("gender", u.gender);
      addIfSelected("created_at", u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A");
      return row;
    }) || [];
    exportToPDF(columnLabels, dataToExport, "Assigned_Prospects_Report", "Assigned Prospects Report");
    toast.success("PDF downloaded");
  };

  const renderCell = (user, key) => {
    switch (key) {
      case "name": return <div style={{ fontWeight: "500" }}>{user.name}</div>;
      case "email": return <div style={{ color: "var(--text-secondary)" }}>{user.email}</div>;
      case "parent": return user.parent || "N/A";
      case "parentEmail": return user.parentEmail || "N/A";
      case "phone": return user.phone || "N/A";
      case "status": return (
        <span
          style={{
            background: user.status === "Approved" ? "rgba(16, 185, 129, 0.15)" : user.status === "Rejected" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
            color: user.status === "Approved" ? "#047857" : user.status === "Rejected" ? "#b91c1c" : "#b45309",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: "600",
            border: `1px solid ${user.status === "Approved" ? "rgba(16, 185, 129, 0.3)" : user.status === "Rejected" ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`
          }}
        >
          {user.status || "Pending"}
        </span>
      );
      case "documents": 
        if (!user.documents || !Array.isArray(user.documents) || user.documents.length === 0) return <span style={{ color: "var(--text-secondary)" }}>None</span>;
        return (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {user.documents.map((doc, idx) => (
              <span key={idx} style={{ background: "rgba(59, 130, 246, 0.1)", color: "#1d4ed8", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", textTransform: "uppercase", fontWeight: "600" }}>
                {doc.type || doc.name || "Doc"}
              </span>
            ))}
          </div>
        );
      case "dob": return user.dob || "N/A";
      case "gender": return user.gender || "N/A";
      case "created_at": return user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A";
      default: return "N/A";
    }
  };

  if (loadingUsers || loadingNewUsers) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading profile...</div>;
  }

  if (!counselor && users.length > 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>Counselor Not Found</h2>
        <button onClick={() => navigate('/users/admission')} className="btn btn-primary">Go Back</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => navigate('/users/admission')} className="btn-ghost" style={{ padding: "0.5rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Counselor Profile</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Overview and activity tracking</p>
        </div>
      </div>

      {counselor && (
        <>
          <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "2rem", fontWeight: "bold" }}>
              {counselor.name?.charAt(0)?.toUpperCase()}
            </div>
            
            <div style={{ flex: 1, minWidth: "250px" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>{counselor.name}</h2>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Mail size={16} /> {counselor.email}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Phone size={16} /> {counselor.phone || "N/A"}</span>
                {counselor.doj && <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Calendar size={16} /> Joined: {new Date(counselor.doj).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><User size={16}/> Total Assigned</span>
              <span style={{ fontSize: "2rem", fontWeight: "700" }}>{stats.total}</span>
            </div>
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Clock size={16} color="#f59e0b"/> Pending</span>
              <span style={{ fontSize: "2rem", fontWeight: "700", color: "#b45309" }}>{stats.pending}</span>
            </div>
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><CheckCircle size={16} color="#10b981"/> Approved</span>
              <span style={{ fontSize: "2rem", fontWeight: "700", color: "#047857" }}>{stats.approved}</span>
            </div>
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><XCircle size={16} color="#ef4444"/> Rejected</span>
              <span style={{ fontSize: "2rem", fontWeight: "700", color: "#b91c1c" }}>{stats.rejected}</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1rem" }}>
            <div style={{ flexShrink: 0 }}>
          <TableFilterHeader
              searchQuery={search}
              setSearchQuery={setSearch}
              searchPlaceholder="Search assigned prospects..."
              exportColumns={exportColumnsList}
              selectedColumns={selectedColumns}
              setSelectedColumns={setSelectedColumns}
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
              filters={[
                {
                  value: filter,
                  onChange: setFilter,
                  options: [
                    { value: "All", label: "All" },
                    { value: "Pending", label: "Pending" },
                    { value: "Approved", label: "Approved" },
                    { value: "Rejected", label: "Rejected" }
                  ]
                },
                {
                  label: "All Genders",
                  value: genderFilter,
                  onChange: setGenderFilter,
                  options: [
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" }
                  ]
                }
              ]}
            />
        </div>
            
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {exportColumnsList.map(col => selectedColumns.includes(col.key) && (
                      <th key={col.key} style={{ padding: "0.5rem 1rem", cursor: "pointer" }} onClick={() => requestSort(col.key)}>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers?.length === 0 ? (
                    <tr>
                      <td colSpan={selectedColumns.length} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No applications currently assigned to this counselor.</td>
                    </tr>
                  ) : (
                    sortedUsers?.map((student) => (
                      <tr key={student.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        {exportColumnsList.map(col => {
                          if (!selectedColumns.includes(col.key)) return null;
                          return <td key={col.key} style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>{renderCell(student, col.key)}</td>;
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CounselorProfile;
