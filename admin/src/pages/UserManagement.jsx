import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { fetchUsers, fetchClasses } from "../features/dataSlice";
import { Search, Plus, Edit, Trash2, Upload, FileSpreadsheet, FileText, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import TableFilterHeader from "../components/TableFilterHeader";
import { useSortableData } from "../hooks/useSortableData";
import * as XLSX from "xlsx";

const UserManagement = () => {
  const { type } = useParams(); // 'student', 'teacher', 'principal'
  const dispatch = useDispatch();
  const { users, classes, loadingUsers } = useSelector((state) => state.data);

  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [formSubmittedFilter, setFormSubmittedFilter] = useState("");
  const [leftSchoolFilter, setLeftSchoolFilter] = useState("");
  const [tcStatusFilter, setTcStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudentSelectModalOpen, setIsStudentSelectModalOpen] = useState(false);
  const [isClassSelectModalOpen, setIsClassSelectModalOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    type: type,
    connections: [],
    classId: "",
    classes: [],
    admission_number: "",
    house: "",
    father_name: "",
    mother_name: "",
    monthly_fee: "",
    bus_fee: "",
    admission_date: "",
    form_submitted: false,
    address: "",
    leave_school: false,
    tc_received: false,
    tc_date: "",
    slc_received: false,
    slc_date: "",
    character_certificate_received: false,
    character_certificate_date: "",
    tc_document_url: "",
    slc_document_url: "",
    character_certificate_document_url: "",
  });

  const students = useMemo(() => users.filter(u => u.type === 'student'), [users]);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchClasses());
  }, [dispatch]);

  // When URL changes, reset form type and default columns
  useEffect(() => {
    setFormData((prev) => ({ ...prev, type: type }));
    const defaults = ["name", "email", "phone", "associations"];
    if (type === "student") defaults.unshift("admission_number");
    setSelectedColumns(defaults);
  }, [type]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, classFilter, formSubmittedFilter, leftSchoolFilter, tcStatusFilter, genderFilter, type]);

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => u.type === type)
      .filter((u) => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              u.email.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;

        if (type === 'student') {
          if (classFilter && (!u.classes || !u.classes.includes(Number(classFilter)))) return false;
          if (formSubmittedFilter && String(!!u.form_submitted) !== formSubmittedFilter) return false;
          if (leftSchoolFilter && String(!!u.leave_school) !== leftSchoolFilter) return false;
          if (tcStatusFilter && String(!!u.tc_received) !== tcStatusFilter) return false;
        }

        if (genderFilter && u.gender !== genderFilter) return false;

        return true;
      });
  }, [users, type, searchQuery, classFilter, formSubmittedFilter, leftSchoolFilter, tcStatusFilter, genderFilter]);

  const { items: sortedUsers, requestSort, sortConfig } = useSortableData(filteredUsers);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(start, start + itemsPerPage);
  }, [sortedUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const tableFilters = useMemo(() => {
    const commonFilters = [
      {
        label: "All Genders",
        value: genderFilter,
        onChange: setGenderFilter,
        options: [{ label: "Male", value: "Male" }, { label: "Female", value: "Female" }]
      }
    ];

    if (type === 'student') {
      return [
        {
          label: "All Classes",
          value: classFilter,
          onChange: setClassFilter,
          options: classes.map(c => ({ label: `${c.name} ${c.section}`, value: c.id }))
        },
        ...commonFilters,
        {
          label: "Form Status",
          value: formSubmittedFilter,
          onChange: setFormSubmittedFilter,
          options: [{ label: "Submitted", value: "true" }, { label: "Pending", value: "false" }]
        },
        {
          label: "School Status",
          value: leftSchoolFilter,
          onChange: setLeftSchoolFilter,
          options: [{ label: "Active", value: "false" }, { label: "Left School", value: "true" }]
        },
        {
          label: "TC Status",
          value: tcStatusFilter,
          onChange: setTcStatusFilter,
          options: [{ label: "Received", value: "true" }, { label: "Pending", value: "false" }]
        }
      ];
    } else {
      return commonFilters;
    }
  }, [type, classFilter, classes, formSubmittedFilter, leftSchoolFilter, tcStatusFilter, genderFilter]);

  const exportColumnsList = useMemo(() => {
    const base = [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "gender", label: "Gender" },
      { key: "associations", label: type === "student" ? "Class" : type === "teacher" ? "Classes" : "Connected Students" }
    ];
    if (type === "student") {
      return [
        ...base,
        { key: "admission_number", label: "Admission No" },
        { key: "admission_date", label: "Admission Date" },
        { key: "house", label: "House" },
        { key: "father_name", label: "Father's Name" },
        { key: "mother_name", label: "Mother's Name" },
        { key: "address", label: "Address" },
        { key: "monthly_fee", label: "Monthly Fee" },
        { key: "bus_fee", label: "Bus Fee" },
        { key: "total_fee", label: "Total Fee" },
        { key: "form_submitted", label: "Form Submitted" },
        { key: "tc_received", label: "TC Received" },
        { key: "slc_received", label: "SLC Received" },
        { key: "character_certificate_received", label: "Character Cert" },
        { key: "leave_school", label: "Left School" }
      ];
    }
    return base;
  }, [type]);

  const filteredStudentsForSelect = useMemo(() => {
    const search = studentSearch.toLowerCase();
    return students.filter(s => 
      (s.name && s.name.toLowerCase().includes(search)) || 
      (s.email && s.email.toLowerCase().includes(search))
    );
  }, [students, studentSearch]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user.id);
      setFormData({
        name: user.name,
        email: user.email,
        password: "", // Don't populate password on edit
        phone: user.phone || "",
        type: user.type,
        connections: user.connections || [],
        classId: user.classes?.[0] || "",
        classes: user.classes || [],
        admission_number: user.admission_number || "",
        house: user.house || "",
        father_name: user.father_name || "",
        mother_name: user.mother_name || "",
        monthly_fee: user.monthly_fee || "",
        bus_fee: user.bus_fee || "",
        admission_date: user.admission_date || "",
        form_submitted: user.form_submitted || false,
        address: user.address || "",
        leave_school: user.leave_school || false,
        tc_received: user.tc_received || false,
        tc_date: user.tc_date || "",
        slc_received: user.slc_received || false,
        slc_date: user.slc_date || "",
        character_certificate_received: user.character_certificate_received || false,
        character_certificate_date: user.character_certificate_date || "",
        tc_document_url: user.tc_document_url || "",
        slc_document_url: user.slc_document_url || "",
        character_certificate_document_url: user.character_certificate_document_url || "",
      });
    } else {
      setEditingUser(null);
      setFormData({ 
        name: "", email: "", password: "", phone: "", type: type, connections: [], classId: "", classes: [],
        admission_number: "", house: "", father_name: "", mother_name: "", monthly_fee: "", bus_fee: "",
        admission_date: "", form_submitted: false, address: "", leave_school: false, tc_received: false, tc_date: "",
        slc_received: false, slc_date: "", character_certificate_received: false, character_certificate_date: "",
        tc_document_url: "", slc_document_url: "", character_certificate_document_url: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      const res = await api.post("/upload/file", uploadData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        setFormData(prev => ({ ...prev, [fieldName]: res.data.url }));
        toast.success("Document uploaded successfully");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload document");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload = { ...formData, id: editingUser };
        if (!payload.password) delete payload.password; // Don't send empty password
        await api.put("/user/updateUser", { data: payload });
        toast.success("User updated successfully");
      } else {
        await api.post("/user/createUser", { data: formData });
        toast.success("User created successfully");
      }
      setIsModalOpen(false);
      dispatch(fetchUsers());
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await api.delete(`/user/deleteUser/${id}`);
        toast.success("User deleted successfully");
        dispatch(fetchUsers());
      } catch (error) {
        toast.error("Failed to delete user");
      }
    }
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataBuffer = new Uint8Array(event.target.result);
        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse sheet to JSON array
        const rawJsonRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (rawJsonRows.length === 0) return toast.error("Excel sheet is empty");

        // Normalize keys (trim whitespace from headers)
        const jsonRows = rawJsonRows.map(row => {
          const normalizedRow = {};
          for (let key in row) {
            normalizedRow[key.trim()] = row[key];
          }
          return normalizedRow;
        });

        // Map Excel headers to expected JSON keys
        const mappedData = jsonRows.map(row => {
          return {
            type: type, // from useParams ('student', 'teacher', etc)
            name: String(row["NAME"] || ""),
            admission_number: String(row["AD NO"] || ""),
            className: String(row["CLASS"] || ""),
            section: String(row["SEC"] || ""),
            house: String(row["HOUSE"] || ""),
            father_name: String(row["FATHER"] || ""),
            mother_name: String(row["MOTHER"] || ""),
            phone: String(row["MOB"] || ""),
            alternate_number: String(row["ALTERNATE NUMBER"] || ""),
            dob: String(row["DOB"] || ""),
            monthly_fee: Number(row["MONTHLY FEE"]) || 0,
            bus_fee: Number(row["BUS"]) || 0,
            admission_date: String(row["DATE OF ADMISSION"] || ""),
            form_submitted: String(row["FORM SUBMITTED"]).trim().toUpperCase() === "SUBMITTED" || String(row["FORM SUBMITTED"]).trim().toLowerCase() === "true",
            address: String(row["ADDRESS"] || ""),
            leave_school: String(row["LEAVE SCHOOL"]).trim().toUpperCase() === "YES" || String(row["LEAVE SCHOOL"]).trim().toLowerCase() === "true",
            tc_received: Boolean(row["TC"]),
            tc_date: String(row["DATE"] || ""), 
            slc_received: Boolean(row["SLC"]),
            slc_date: String(row["DATE_1"] || ""),
            character_certificate_received: Boolean(row["CHARACTER CERTIFICATE"]),
            character_certificate_date: String(row["DATE_2"] || ""),
            // Provide auto-generated login credentials if missing (Required by Auth)
            email: `student_${String(row["AD NO"] || Math.floor(Math.random()*10000))}@thearcschool.in`,
            password: `pass@${String(row["AD NO"] || "1234")}`,
          };
        });

        await api.post("/user/bulkUser", { data: mappedData });
        toast.success(`${mappedData.length} users uploaded successfully`);
        dispatch(fetchUsers());
      } catch (error) {
        console.error("Bulk upload error:", error);
        toast.error(error.response?.data?.message || "Failed to upload bulk users");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null; // reset input
  };

  const handleDownloadSample = () => {
    const sampleData = [{
      "AD NO": "1001",
      "NAME": "John Doe",
      "CLASS": "PLAY",
      "SEC": "A",
      "HOUSE": "RED",
      "FATHER": "Richard Doe",
      "MOTHER": "Jane Doe",
      "MOB": "9876543210",
      "ALTERNATE NUMBER": "9876543211",
      "DOB": "2015-05-20",
      "MONTHLY FEE": "1500",
      "BUS": "500",
      "DATE OF ADMISSION": "2020-04-01",
      "FORM SUBMITTED": "SUBMITTED",
      "ADDRESS": "123 Main St, City",
      "LEAVE SCHOOL": "NO",
      "TC": "",
      "DATE": "",
      "SLC": "",
      "DATE_1": "",
      "CHARACTER CERTIFICATE": "",
      "DATE_2": ""
    }];
    exportToExcel(sampleData, `${type}_bulk_upload_format`);
  };

  const getClassName = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    return cls ? `${cls.className} - ${cls.section}` : "Unknown";
  };

  const getAssociations = (u) => {
    if (type === "student" && u.classes?.length > 0) return getClassName(u.classes[0]);
    if (type === "teacher" && u.classes?.length > 0) return `${u.classes.length} Classes`;
    if (type === "parent" && u.connections?.length > 0) return `${u.connections.length} Students`;
    return "";
  };

  const handleExportExcel = (selectedKeys) => {
    const dataToExport = filteredUsers.map(u => {
      const row = {};
      const addIfSelected = (key, value) => {
        if (!selectedKeys || selectedKeys.includes(key)) {
          const colDef = exportColumnsList.find(c => c.key === key);
          if (colDef) row[colDef.label] = value;
        }
      };

      addIfSelected("name", u.name);
      addIfSelected("email", u.email);
      addIfSelected("phone", u.phone || "N/A");
      addIfSelected("gender", u.gender || "N/A");
      addIfSelected("associations", getAssociations(u));

      if (type === 'student') {
        addIfSelected("admission_number", u.admission_number || "N/A");
        addIfSelected("admission_date", u.admission_date || "N/A");
        addIfSelected("house", u.house || "N/A");
        addIfSelected("father_name", u.father_name || "N/A");
        addIfSelected("mother_name", u.mother_name || "N/A");
        addIfSelected("address", u.address || "N/A");
        addIfSelected("monthly_fee", u.monthly_fee || 0);
        addIfSelected("bus_fee", u.bus_fee || 0);
        addIfSelected("total_fee", (Number(u.monthly_fee || 0) + Number(u.bus_fee || 0)));
        addIfSelected("form_submitted", u.form_submitted ? "Yes" : "No");
        addIfSelected("tc_received", u.tc_received ? `Yes (${u.tc_date || ''})` : "No");
        addIfSelected("slc_received", u.slc_received ? `Yes (${u.slc_date || ''})` : "No");
        addIfSelected("character_certificate_received", u.character_certificate_received ? `Yes (${u.character_certificate_date || ''})` : "No");
        addIfSelected("leave_school", u.leave_school ? "Yes" : "No");
      }
      return row;
    });
    exportToExcel(dataToExport, `${type}_export`);
  };

  const handleExportPDF = (selectedKeys) => {
    const activeColumns = exportColumnsList.filter(c => !selectedKeys || selectedKeys.includes(c.key));
    const columnLabels = activeColumns.map(c => c.label);
    
    const dataToExport = filteredUsers.map(u => {
      const row = [];
      const addIfSelected = (key, value) => {
        if (!selectedKeys || selectedKeys.includes(key)) row.push(value);
      };

      addIfSelected("name", u.name);
      addIfSelected("email", u.email);
      addIfSelected("phone", u.phone || "N/A");
      addIfSelected("gender", u.gender || "N/A");
      addIfSelected("associations", getAssociations(u));

      if (type === 'student') {
        addIfSelected("admission_number", u.admission_number || "N/A");
        addIfSelected("admission_date", u.admission_date || "N/A");
        addIfSelected("house", u.house || "N/A");
        addIfSelected("father_name", u.father_name || "N/A");
        addIfSelected("mother_name", u.mother_name || "N/A");
        addIfSelected("address", u.address || "N/A");
        addIfSelected("monthly_fee", u.monthly_fee || 0);
        addIfSelected("bus_fee", u.bus_fee || 0);
        addIfSelected("total_fee", (Number(u.monthly_fee || 0) + Number(u.bus_fee || 0)).toString());
        addIfSelected("form_submitted", u.form_submitted ? "Yes" : "No");
        addIfSelected("tc_received", u.tc_received ? `Yes (${u.tc_date || ''})` : "No");
        addIfSelected("slc_received", u.slc_received ? `Yes (${u.slc_date || ''})` : "No");
        addIfSelected("character_certificate_received", u.character_certificate_received ? `Yes (${u.character_certificate_date || ''})` : "No");
        addIfSelected("leave_school", u.leave_school ? "Yes" : "No");
      }
      return row;
    });
    exportToPDF(columnLabels, dataToExport, `${type}_export`, `${type.charAt(0).toUpperCase() + type.slice(1)} Export`);
  };

  const renderCell = (user, key) => {
    switch (key) {
      case "name": return <span style={{ fontWeight: "500" }}>{user.name}</span>;
      case "email": return user.email;
      case "phone": return user.phone || "N/A";
      case "gender": return user.gender || "N/A";
      case "associations": 
        if (type === "student" && user.classes?.length > 0) {
          return <span style={{ background: "rgba(59, 130, 246, 0.2)", color: "#93c5fd", padding: "2px 6px", borderRadius: "8px", fontSize: "11px" }}>{getClassName(user.classes[0])}</span>;
        } else if (type === "teacher" && user.classes?.length > 0) {
          return <span style={{ background: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7", padding: "2px 6px", borderRadius: "8px", fontSize: "11px" }}>{user.classes.length} Classes</span>;
        } else if (type === "parent" && user.connections?.length > 0) {
          return <span style={{ background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", padding: "2px 6px", borderRadius: "8px", fontSize: "11px" }}>{user.connections.length} Students</span>;
        }
        return "N/A";
      case "admission_number": return user.admission_number || "-";
      case "admission_date": return user.admission_date || "N/A";
      case "house": return user.house || "N/A";
      case "father_name": return user.father_name || "N/A";
      case "mother_name": return user.mother_name || "N/A";
      case "address": return user.address || "N/A";
      case "monthly_fee": return user.monthly_fee || "0";
      case "bus_fee": return user.bus_fee || "0";
      case "total_fee": return (Number(user.monthly_fee || 0) + Number(user.bus_fee || 0)) || "0";
      case "form_submitted": return user.form_submitted ? "Yes" : "No";
      case "leave_school": return user.leave_school ? "Yes" : "No";
      case "tc_received": return user.tc_received ? `Yes (${user.tc_date || ''})` : "No";
      case "slc_received": return user.slc_received ? `Yes (${user.slc_date || ''})` : "No";
      case "character_certificate_received": return user.character_certificate_received ? `Yes (${user.character_certificate_date || ''})` : "No";
      default: return user[key] || "N/A";
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", textTransform: "capitalize" }}>{type} Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage your {type} accounts</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={handleDownloadSample} className="btn btn-ghost" style={{ display: "flex", alignItems: "center" }}>
            <FileSpreadsheet size={18} style={{ marginRight: "0.5rem" }} /> Download Format
          </button>
          <label className="btn btn-secondary" style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Upload size={18} style={{ marginRight: "0.5rem" }} /> Bulk Upload Excel
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleBulkUpload} style={{ display: "none" }} />
          </label>
          <button onClick={() => handleOpenModal()} className="btn btn-primary">
            <Plus size={18} /> Add {type}
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1rem" }}>
        <TableFilterHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder={`Search ${type}s...`}
          filters={tableFilters}
          exportColumns={exportColumnsList}
          selectedColumns={selectedColumns}
          setSelectedColumns={setSelectedColumns}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr>
                <th>S.No.</th>
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
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <tr>
                  <td colSpan={selectedColumns.length + 2} style={{ padding: "2rem", textAlign: "center" }}>Loading...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={selectedColumns.length + 2} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No {type}s found.</td>
                </tr>
              ) : (
                paginatedUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    {exportColumnsList.map(col => {
                      if (!selectedColumns.includes(col.key)) return null;
                      return <td key={col.key}>{renderCell(user, col.key)}</td>;
                    })}
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button onClick={() => handleOpenModal(user)} className="btn-ghost" style={{ border: "none", cursor: "pointer", padding: "4px", marginRight: "4px" }}>
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="btn-ghost" style={{ border: "none", cursor: "pointer", padding: "4px", color: "#ef4444" }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", padding: "1rem 0 0", borderTop: "1px solid var(--glass-border)", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem" }}>Rows per page:</span>
                <select 
                  className="input-glass" 
                  style={{ padding: "4px 8px", fontSize: "0.875rem", minWidth: "70px" }}
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                >
                  <option value={100} style={{ color: "black" }}>100</option>
                  <option value={200} style={{ color: "black" }}>200</option>
                  <option value={500} style={{ color: "black" }}>500</option>
                </select>
              </div>
              
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button 
                  className="btn btn-ghost" 
                  style={{ padding: "4px 8px" }}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span style={{ display: "flex", alignItems: "center", padding: "0 8px", fontSize: "0.875rem" }}>
                  {currentPage} / {totalPages || 1}
                </span>
                <button 
                  className="btn btn-ghost" 
                  style={{ padding: "4px 8px" }}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }} onClick={() => setIsModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "600px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>
              {editingUser ? `Edit ${type}` : `Add New ${type}`}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Basic Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Full Name</label>
                  <input required className="input-glass" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Email Address</label>
                  <input required type="email" className="input-glass" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Password {editingUser && "(Leave blank to keep)"}</label>
                  <input type="password" required={!editingUser} className="input-glass" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Phone Number</label>
                  <input className="input-glass" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                {type === 'student' && (
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Class</label>
                    <select 
                      className="input-glass" 
                      value={formData.classId} 
                      onChange={e => setFormData({...formData, classId: e.target.value === "" ? null : Number(e.target.value)})}
                    >
                      <option value="">Select a class...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {type === 'parent' && (
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Connected Students</label>
                  <button
                    type="button"
                    onClick={() => setIsStudentSelectModalOpen(true)}
                    className="input-glass"
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "rgba(255,255,255,0.05)" }}
                  >
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Select students...</span>
                    <span style={{ background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem" }}>
                      {formData.connections.length} Selected
                    </span>
                  </button>
                </div>
              )}
              
              {type === 'teacher' && (
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Connected Classes</label>
                  <button
                    type="button"
                    onClick={() => setIsClassSelectModalOpen(true)}
                    className="input-glass"
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "rgba(255,255,255,0.05)" }}
                  >
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Select classes...</span>
                    <span style={{ background: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem" }}>
                      {formData.classes.length} Selected
                    </span>
                  </button>
                </div>
              )}

              {type === 'student' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)" }}>Admission & Family</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Admission Number</label>
                      <input className="input-glass" value={formData.admission_number} onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date of Admission</label>
                      <input type="date" className="input-glass" value={formData.admission_date} onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>House</label>
                      <input className="input-glass" value={formData.house} onChange={(e) => setFormData({ ...formData, house: e.target.value })} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
                      <input type="checkbox" checked={formData.form_submitted} onChange={(e) => setFormData({ ...formData, form_submitted: e.target.checked })} style={{ width: "16px", height: "16px" }} />
                      <label style={{ fontSize: "0.875rem" }}>Form Submitted</label>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Father's Name</label>
                      <input className="input-glass" value={formData.father_name} onChange={(e) => setFormData({ ...formData, father_name: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Mother's Name</label>
                      <input className="input-glass" value={formData.mother_name} onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Address</label>
                      <input className="input-glass" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                  </div>

                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)", marginTop: "0.5rem" }}>Fees Setup</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Monthly Fee (₹)</label>
                      <input type="number" className="input-glass" value={formData.monthly_fee} onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Bus Fee (₹)</label>
                      <input type="number" className="input-glass" value={formData.bus_fee} onChange={(e) => setFormData({ ...formData, bus_fee: e.target.value })} />
                    </div>
                  </div>

                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)", marginTop: "0.5rem" }}>Documents & Status</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* TC Received */}
                    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr", alignItems: "center", gap: "1rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                        <input type="checkbox" checked={formData.tc_received} onChange={(e) => setFormData({ ...formData, tc_received: e.target.checked })} /> TC Received
                      </label>
                      {formData.tc_received && (
                        <>
                          <input type="date" className="input-glass" style={{ padding: "0.25rem" }} value={formData.tc_date} onChange={(e) => setFormData({ ...formData, tc_date: e.target.value })} />
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input type="file" onChange={(e) => handleFileUpload(e, 'tc_document_url')} style={{ fontSize: "0.75rem", width: "160px" }} />
                            {formData.tc_document_url && <a href={formData.tc_document_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.75rem", color: "#c084fc" }}>View</a>}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* SLC Received */}
                    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr", alignItems: "center", gap: "1rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                        <input type="checkbox" checked={formData.slc_received} onChange={(e) => setFormData({ ...formData, slc_received: e.target.checked })} /> SLC Received
                      </label>
                      {formData.slc_received && (
                        <>
                          <input type="date" className="input-glass" style={{ padding: "0.25rem" }} value={formData.slc_date} onChange={(e) => setFormData({ ...formData, slc_date: e.target.value })} />
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input type="file" onChange={(e) => handleFileUpload(e, 'slc_document_url')} style={{ fontSize: "0.75rem", width: "160px" }} />
                            {formData.slc_document_url && <a href={formData.slc_document_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.75rem", color: "#c084fc" }}>View</a>}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Character Certificate */}
                    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", alignItems: "center", gap: "1rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                        <input type="checkbox" checked={formData.character_certificate_received} onChange={(e) => setFormData({ ...formData, character_certificate_received: e.target.checked })} /> Character Certificate
                      </label>
                      {formData.character_certificate_received && (
                        <>
                          <input type="date" className="input-glass" style={{ padding: "0.25rem" }} value={formData.character_certificate_date} onChange={(e) => setFormData({ ...formData, character_certificate_date: e.target.value })} />
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input type="file" onChange={(e) => handleFileUpload(e, 'character_certificate_document_url')} style={{ fontSize: "0.75rem", width: "160px" }} />
                            {formData.character_certificate_document_url && <a href={formData.character_certificate_document_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.75rem", color: "#c084fc" }}>View</a>}
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
                      <input type="checkbox" checked={formData.leave_school} onChange={(e) => setFormData({ ...formData, leave_school: e.target.checked })} style={{ width: "16px", height: "16px" }} />
                      <label style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600" }}>Student Left School</label>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingUser ? "Save Changes" : "Create Account"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStudentSelectModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={() => setIsStudentSelectModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem", display: "flex", flexDirection: "column", maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem" }}>Select Connected Students</h2>
            <input 
              className="input-glass" 
              placeholder="Search students by name or email..." 
              value={studentSearch} 
              onChange={e => setStudentSearch(e.target.value)} 
              style={{ marginBottom: "1rem" }}
            />
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.5rem", background: "rgba(0,0,0,0.1)" }}>
              {filteredStudentsForSelect.map(s => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "8px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <input 
                    type="checkbox" 
                    checked={formData.connections.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, connections: [...formData.connections, s.id] });
                      } else {
                        setFormData({ ...formData, connections: formData.connections.filter(id => id !== s.id) });
                      }
                    }}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span style={{ fontSize: "0.875rem" }}>{s.name} <span style={{ color: "var(--text-secondary)" }}>({s.email})</span></span>
                </label>
              ))}
              {filteredStudentsForSelect.length === 0 && (
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>No students found</div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" onClick={() => setIsStudentSelectModalOpen(false)} className="btn btn-primary">Done</button>
            </div>
          </div>
        </div>
      )}

      {isClassSelectModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={() => setIsClassSelectModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem", display: "flex", flexDirection: "column", maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem" }}>Select Classes</h2>
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.5rem", background: "rgba(0,0,0,0.1)" }}>
              {classes.map(c => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "8px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <input 
                    type="checkbox" 
                    checked={formData.classes.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, classes: [...formData.classes, c.id] });
                      } else {
                        setFormData({ ...formData, classes: formData.classes.filter(id => id !== c.id) });
                      }
                    }}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span style={{ fontSize: "0.875rem" }}>{c.name} {c.section}</span>
                </label>
              ))}
              {classes.length === 0 && (
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>No classes found</div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" onClick={() => setIsClassSelectModalOpen(false)} className="btn btn-primary">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
