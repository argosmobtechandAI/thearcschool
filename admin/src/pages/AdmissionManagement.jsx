import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchNewUsers } from "../features/dataSlice";
import { toast } from "react-toastify";
import api, { uploadFile } from "../services/api";
import { FileText, CheckCircle, XCircle, Plus, Edit, Trash2, FileSpreadsheet, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import TableFilterHeader from "../components/TableFilterHeader";
import { useSortableData } from "../hooks/useSortableData";

const AdmissionManagement = () => {
  const dispatch = useDispatch();
  const { newUsers, loadingNewUsers } = useSelector((state) => state.data);

  const [filter, setFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("");
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([
    "name", "email", "parent", "status"
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
  });

  const [selectedFiles, setSelectedFiles] = useState({
    aadhar: null,
    pan: null,
    birthCertificate: null,
  });

  useEffect(() => {
    dispatch(fetchNewUsers());
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
        documents: documentsArray,
      };

      if (editingId) {
        await api.put(`/newUser/updateNewUser/${editingId}`, { data: payload });
        toast.success("Application updated successfully");
      } else {
        await api.post("/newUser/createNewUser", { data: payload });
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
        address: "",
        links: { fb: "", insta: "", linkdIn: "", twitter: "" },
      };

      await api.post("/newUser/approveNewUser", { data: { payload, id: user.id, status } });
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
        await api.delete(`/newUser/deleteNewUser/${id}`);
        toast.success("Application deleted successfully");
        dispatch(fetchNewUsers());
      } catch (error) {
        toast.error("Failed to delete application");
      }
    }
  };

  const closeModal = () => {
    setEditingId(null);
    setFormData({ name: "", email: "", parent: "", parentEmail: "", phone: "", status: "Pending", dob: "", gender: "" });
    setSelectedFiles({ aadhar: null, pan: null, birthCertificate: null });
    setOpenModal(false);
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
    });
    setOpenModal(true);
  };

  const filteredUsers = newUsers?.filter(
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
            background: user.status === "Approved" ? "rgba(16, 185, 129, 0.2)" : user.status === "Rejected" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
            color: user.status === "Approved" ? "#6ee7b7" : user.status === "Rejected" ? "#fca5a5" : "#fcd34d",
            padding: "2px 6px",
            borderRadius: "8px",
            fontSize: "11px",
          }}
        >
          {user.status}
        </span>
      );
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
              label: "All Statuses",
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
                sortedUsers?.map((user) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    {exportColumnsList.map(col => {
                      if (!selectedColumns.includes(col.key)) return null;
                      return <td key={col.key} style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>{renderCell(user, col.key)}</td>;
                    })}
                    <td style={{ padding: "0.5rem 1rem", textAlign: "right" }}>
                      <button onClick={() => handleEdit(user)} className="btn-ghost" style={{ padding: "4px", border: "none", background: "none", cursor: "pointer", color: "#60a5fa" }}>
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="btn-ghost" style={{ padding: "4px", border: "none", background: "none", cursor: "pointer", color: "#ef4444", marginLeft: "4px" }}>
                        <Trash2 size={16} />
                      </button>
                      {user.status === "Pending" && (
                        <>
                          <button onClick={() => handleStatusUpdate(user, "approved")} className="btn-ghost" style={{ padding: "4px", border: "none", background: "none", cursor: "pointer", color: "#10b981", marginLeft: "8px" }}>
                            <CheckCircle size={16} />
                          </button>
                          <button onClick={() => handleStatusUpdate(user, "rejected")} className="btn-ghost" style={{ padding: "4px", border: "none", background: "none", cursor: "pointer", color: "#ef4444", marginLeft: "8px" }}>
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
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
              </div>

              {!editingId && (
                <div style={{ marginTop: "1rem", borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
                  <h3 style={{ marginBottom: "1rem", fontSize: "1rem", fontWeight: "600" }}>Documents</h3>
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
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
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
