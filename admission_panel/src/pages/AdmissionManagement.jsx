import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { fetchNewUsers, fetchUsers } from "../features/dataSlice";
import { toast } from "react-toastify";
import api, { uploadFile } from "../services/api";
import { FileText, CheckCircle, XCircle, Plus, Edit, Trash2, FileSpreadsheet, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import TableFilterHeader from "../components/TableFilterHeader";
import DateRangePicker from "../components/DateRangePicker";
import { useSortableData } from "../hooks/useSortableData";

const AdmissionManagement = () => {
  const dispatch = useDispatch();
  const { newUsers, loadingNewUsers, users } = useSelector((state) => state.data);
  const { user: currentUser } = useSelector((state) => state.auth);

  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);

  // Sync dates to URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    let changed = false;
    
    if (startDate && newParams.get("startDate") !== startDate) { newParams.set("startDate", startDate); changed = true; }
    else if (!startDate && newParams.has("startDate")) { newParams.delete("startDate"); changed = true; }
    
    if (endDate && newParams.get("endDate") !== endDate) { newParams.set("endDate", endDate); changed = true; }
    else if (!endDate && newParams.has("endDate")) { newParams.delete("endDate"); changed = true; }
    
    if (changed) {
      setSearchParams(newParams, { replace: true });
    }
  }, [startDate, endDate, searchParams, setSearchParams]);

  const [selectedColumns, setSelectedColumns] = useState([
    "sno", "name", "email", "parent", "status", "assigned_to", "documents"
  ]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    parent: "",
    parentEmail: "",
    phone: "",
    status: "Pending",
    dob: "",
    gender: "",
    documents: [],
    monthly_fee: "",
    bus_fee: "",
    assigned_to: "",
  });

  const [selectedFiles, setSelectedFiles] = useState({
    aadhar: null,
    pan: null,
    birthCertificate: null,
  });

  useEffect(() => {
    dispatch(fetchNewUsers());
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleFileUpload = async (fileUpload) => {
    if (!fileUpload) return null;
    try {
      const url = await uploadFile(fileUpload);
      return url;
    } catch (err) {
      console.error("Upload failed", err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      let documentsArray = [];

      for (const key in selectedFiles) {
        if (selectedFiles[key]) {
          const url = await handleFileUpload(selectedFiles[key]);
          if (url) {
            documentsArray.push({
              type: key,
              name: selectedFiles[key].name,
              url,
            });
          }
        }
      }

      const payload = {
        ...formData,
        documents: [...(formData.documents || []), ...documentsArray],
        assigned_to: editingId ? formData.assigned_to : currentUser?.id,
      };

      if (editingId) {
        await api.put(`/admission_panel/updateNewUser/${editingId}`, { data: payload });
        toast.success("Application updated successfully");
      } else {
        await api.post("/admission_panel/createNewUser", { data: payload });
        toast.success("Application submitted successfully");
      }

      dispatch(fetchNewUsers());
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (user, status) => {
    setLoading(true);
    try {
      const payload = {
        name: user.name,
        email: user.email,
        type: "student",
        documents: { pan: "", aadhar: "" },
        phone: String(user.phone),
        monthly_fee: user.monthly_fee || 0,
        bus_fee: user.bus_fee || 0,
        address: "",
        links: { fb: "", insta: "", linkdIn: "", twitter: "" },
      };

      await api.post("/admission_panel/approveNewUser", { data: { payload, id: user.id, status } });
      toast.success(`Application ${status} successfully`);
      dispatch(fetchNewUsers());
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this application?")) {
      try {
        await api.delete(`/admission_panel/deleteNewUser/${id}`);
        toast.success("Application deleted successfully");
        dispatch(fetchNewUsers());
      } catch (error) {
        toast.error("Failed to delete application");
      }
    }
  };

  const closeModal = () => {
    setEditingId(null);
    setFormData({ name: "", email: "", parent: "", parentEmail: "", phone: "", status: "Pending", dob: "", gender: "", documents: [], monthly_fee: "", bus_fee: "", assigned_to: "" });
    setSelectedFiles({ aadhar: null, pan: null, birthCertificate: null });
    setOpenModal(false);
  };

  const removeDocument = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      parent: user.parent,
      parentEmail: user.parentEmail,
      phone: user.phone,
      status: user.status,
      dob: user.dob,
      gender: user.gender,
      documents: user.documents || [],
      monthly_fee: user.monthly_fee || "",
      bus_fee: user.bus_fee || "",
      assigned_to: user.assigned_to || "",
    });
    setOpenModal(true);
  };

  const filteredUsers = newUsers?.filter(
    (user) => {
      const matchFilter = (filter === "All" || user.status?.toLowerCase() === filter.toLowerCase());
      const matchGender = (genderFilter === "" || user.gender === genderFilter);
      const matchSearch = user.name?.toLowerCase().includes(search.toLowerCase());
      let matchDate = true;
      if ((startDate || endDate) && user.created_at) {
        const dDate = new Date(user.created_at);
        if (startDate && dDate < new Date(startDate)) matchDate = false;
        if (endDate && dDate > new Date(endDate)) matchDate = false;
      }
      return matchFilter && matchGender && matchSearch && matchDate;
    }
  );

  const { items: sortedUsers, requestSort, sortConfig } = useSortableData(filteredUsers || []);

  const exportColumnsList = [
    { key: "sno", label: "S.No" },
    { key: "name", label: "Applicant Name" },
    { key: "email", label: "Email" },
    { key: "parent", label: "Parent Name" },
    { key: "parentEmail", label: "Parent Email" },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status" },
    { key: "documents", label: "Documents" },
    { key: "assigned_to", label: "Assigned Counselor" },
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
    exportToExcel(dataToExport, "Admissions_Report");
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
    exportToPDF(columnLabels, dataToExport, "Admissions_Report", "Admissions Report");
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
          {user.status}
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
      case "assigned_to": {
        const counselor = users?.find(u => String(u.id) === String(user.assigned_to));
        return counselor ? <div style={{ color: "#3b82f6", fontWeight: "500" }}>{counselor.name}</div> : <div style={{ color: "var(--text-secondary)" }}>Unassigned</div>;
      }
      case "dob": return user.dob || "N/A";
      case "gender": return user.gender || "N/A";
      case "created_at": return user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A";
      default: return "N/A";
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Admissions</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Manage student applications</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setOpenModal(true)} className="btn btn-primary" style={{ fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}>
            <Plus size={16} /> New Application
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1rem" }}>
        <TableFilterHeader
          searchQuery={search}
          setSearchQuery={setSearch}
          searchPlaceholder="Search applications..."
          exportColumns={exportColumnsList}
          selectedColumns={selectedColumns}
          setSelectedColumns={setSelectedColumns}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          filters={[
            {
              // label: "All Statuses",
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
        >
          <DateRangePicker 
            startDate={startDate} 
            endDate={endDate} 
            setStartDate={setStartDate} 
            setEndDate={setEndDate} 
            defaultRange="mtd" 
          />
        </TableFilterHeader>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                {selectedColumns.includes("sno") && <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>S.No</th>}
                {exportColumnsList.map(col => (col.key !== "sno" && selectedColumns.includes(col.key)) && (
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
                <th style={{ padding: "0.5rem 1rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingNewUsers ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} style={{ padding: "2rem", textAlign: "center" }}>Loading...</td>
                </tr>
              ) : filteredUsers?.length === 0 ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No applications found.</td>
                </tr>
              ) : (
                sortedUsers?.map((user, index) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    {selectedColumns.includes("sno") && <td style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>{index + 1}</td>}
                    {exportColumnsList.map(col => {
                      if (col.key === "sno" || !selectedColumns.includes(col.key)) return null;
                      return <td key={col.key} style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>{renderCell(user, col.key)}</td>;
                    })}
                    <td style={{ padding: "0.5rem 1rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button onClick={() => handleEdit(user)} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#3b82f6", background: "rgba(59, 130, 246, 0.1)", borderRadius: "4px" }}>
                          <Edit size={14} style={{ marginRight: "0.25rem" }}/> Edit
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px" }}>
                          <Trash2 size={14} style={{ marginRight: "0.25rem" }}/> Delete
                        </button>
                        {user.status === "Pending" && (
                          <>
                            <button onClick={() => handleStatusUpdate(user, "Approved")} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", borderRadius: "4px" }}>
                              <CheckCircle size={14} style={{ marginRight: "0.25rem" }}/> Approve
                            </button>
                            <button onClick={() => handleStatusUpdate(user, "Rejected")} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px" }}>
                              <XCircle size={14} style={{ marginRight: "0.25rem" }}/> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openModal && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={closeModal}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "600px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>
              {editingId ? "Update Application" : "New Application"}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Student Name</label>
                  <input required className="input-glass" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Student Email</label>
                  <input required type="email" className="input-glass" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Parent Name</label>
                  <input required className="input-glass" value={formData.parent} onChange={(e) => setFormData({ ...formData, parent: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Phone</label>
                  <input required className="input-glass" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date of Birth</label>
                  <input required type="date" className="input-glass" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Gender</label>
                  <select required className="input-glass" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Monthly Fee</label>
                  <input type="number" className="input-glass" value={formData.monthly_fee} onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Bus Fee</label>
                  <input type="number" className="input-glass" value={formData.bus_fee} onChange={(e) => setFormData({ ...formData, bus_fee: e.target.value })} />
                </div>
              </div>

              <div style={{ marginTop: "1rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
                <h3 style={{ marginBottom: "1rem", fontSize: "1rem", fontWeight: "600" }}>Upload Documents</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Aadhar Card</label>
                    <input type="file" style={{ fontSize: "0.75rem" }} onChange={(e) => setSelectedFiles({ ...selectedFiles, aadhar: e.target.files[0] })} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>PAN Card</label>
                    <input type="file" style={{ fontSize: "0.75rem" }} onChange={(e) => setSelectedFiles({ ...selectedFiles, pan: e.target.files[0] })} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>Birth Certificate</label>
                    <input type="file" style={{ fontSize: "0.75rem" }} onChange={(e) => setSelectedFiles({ ...selectedFiles, birthCertificate: e.target.files[0] })} />
                  </div>
                </div>
              </div>

              {formData.documents && formData.documents.length > 0 && (
                <div style={{ marginTop: "1rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
                  <h3 style={{ marginBottom: "1rem", fontSize: "1rem", fontWeight: "600" }}>Uploaded Documents</h3>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    {formData.documents.map((doc, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", padding: "0.5rem 1rem", border: "1px solid var(--glass-border)", borderRadius: "6px" }}>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
                          <FileText size={16} color="var(--accent-primary)" />
                          {doc.type ? doc.type.toUpperCase() : "Document"}
                        </a>
                        <button type="button" onClick={() => removeDocument(idx)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.25rem", borderRadius: "50%", color: "#ef4444" }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                <button type="button" onClick={closeModal} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Save Application"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionManagement;
