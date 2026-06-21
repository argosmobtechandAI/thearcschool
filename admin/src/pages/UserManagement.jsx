import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUsers, fetchClasses, fetchNewUsers, fetchSubjects, fetchSubjectTeachers } from "../features/dataSlice";
import CustomSelect from "../components/CustomSelect";
import { Search, Plus, Edit, Trash2, Upload, FileSpreadsheet, FileText, ChevronUp, ChevronDown, ChevronsUpDown, Eye, BookOpen } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import TableFilterHeader from "../components/TableFilterHeader";
import { useSortableData } from "../hooks/useSortableData";
import * as XLSX from "xlsx";

const UserManagement = () => {
  const { type } = useParams(); // 'student', 'teacher', 'principal'
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { users, classes, newUsers, loadingUsers, subjects, subjectTeachers } = useSelector((state) => state.data);

  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [formSubmittedFilter, setFormSubmittedFilter] = useState("");
  const [leftSchoolFilter, setLeftSchoolFilter] = useState("");
  const [tcStatusFilter, setTcStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [siblingCountFilter, setSiblingCountFilter] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudentSelectModalOpen, setIsStudentSelectModalOpen] = useState(false);
  const [isClassSelectModalOpen, setIsClassSelectModalOpen] = useState(false);
  const [isViewParentModalOpen, setIsViewParentModalOpen] = useState(false);
  const [viewParent, setViewParent] = useState(null);
  
  // Bulk Upload State
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadStatus, setBulkUploadStatus] = useState("idle"); // idle, parsing, uploading, complete
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0);
  const [bulkUploadCurrent, setBulkUploadCurrent] = useState(0);
  const [bulkUploadTotal, setBulkUploadTotal] = useState(0);
  const [bulkUploadReport, setBulkUploadReport] = useState([]);

  const [selectedColumns, setSelectedColumns] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    type: type,
    dob: "",
    doj: "",
    father_spouse_name: "",
    connections: [],
    classId: "",
    classes: [],
    admission_number: "",
    house: "",
    father_name: "",
    mother_name: "",
    bus_fee: "",
    fee_exempted: false,
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
    can_view_revenue: false,
  });



  const students = useMemo(() => users.filter(u => u.type === 'student'), [users]);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchClasses());
    if (type === 'admission') {
      dispatch(fetchNewUsers());
    }
    if (type === 'teacher') {
      dispatch(fetchSubjects());
      dispatch(fetchSubjectTeachers());
    }
  }, [dispatch, type]);

  // When URL changes, reset form type and default columns
  useEffect(() => {
    setFormData((prev) => ({ ...prev, type: type }));
    const defaults = ["name", "email", "phone", "associations"];
    if (type === "student") defaults.unshift("admission_number");
    if (type === "teacher") defaults.push("subjects", "doj", "father_spouse_name");
    
    setSelectedColumns(defaults);
  }, [type]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, classFilter, formSubmittedFilter, leftSchoolFilter, tcStatusFilter, genderFilter, siblingCountFilter, type]);

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => u.type === type)
      .filter((u) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (u.name && u.name.toLowerCase().includes(query)) || 
          (u.email && u.email.toLowerCase().includes(query)) ||
          (u.phone && String(u.phone).toLowerCase().includes(query)) ||
          (u.alternate_number && String(u.alternate_number).toLowerCase().includes(query)) ||
          (u.admission_number && String(u.admission_number).toLowerCase().includes(query));
        
        if (!matchesSearch) return false;

        if (type === 'student') {
          if (classFilter && (!u.classes || !u.classes.includes(classFilter))) return false;
          if (formSubmittedFilter && String(!!u.form_submitted) !== formSubmittedFilter) return false;
          if (leftSchoolFilter && String(!!u.leave_school) !== leftSchoolFilter) return false;
          if (tcStatusFilter && String(!!u.tc_received) !== tcStatusFilter) return false;
        }

        if (genderFilter && u.gender !== genderFilter) return false;

        if (type === 'parent') {
          if (classFilter) {
            if (!u.classes || !u.classes.includes(classFilter)) return false;
          }
          if (siblingCountFilter) {
            const count = u.connections?.length || 0;
            if (siblingCountFilter === "1" && count !== 1) return false;
            if (siblingCountFilter === "2" && count !== 2) return false;
            if (siblingCountFilter === "3+" && count < 3) return false;
          }
        }

        return true;
      });
  }, [users, type, searchQuery, classFilter, formSubmittedFilter, leftSchoolFilter, tcStatusFilter, genderFilter, siblingCountFilter]);

  const customGetters = useMemo(() => {
    const getClassName = (classId) => {
      const cls = classes.find((c) => c.id === classId);
      return cls ? `${cls.className} - ${cls.section}` : "Unknown";
    };
    return {
      associations: (u) => {
        if (type === "student" && u.classes?.length > 0) return getClassName(u.classes[0]);
        if (type === "teacher" && u.classes?.length > 0) return `${u.classes.length} Classes`;
        if (type === "parent" && u.connections?.length > 0) return `${u.connections.length} Students`;
        if (type === "admission") {
          const pipelineCount = newUsers?.filter(nu => String(nu.assigned_to) === String(u.id)).length || 0;
          return `${pipelineCount} Assigned`;
        }
        return "";
      },
      fee_exempted: (u) => u.fee_exempted ? "Yes" : "No",
    };
  }, [classes, type, newUsers]);

  const { items: sortedUsers, requestSort, sortConfig } = useSortableData(filteredUsers, null, customGetters);

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
    } else if (type === 'parent') {
      return [
        {
          label: "All Classes",
          value: classFilter,
          onChange: setClassFilter,
          options: classes.map(c => ({ label: `${c.name} ${c.section}`, value: c.id }))
        },
        ...commonFilters,
        {
          label: "Number of Children",
          value: siblingCountFilter,
          onChange: setSiblingCountFilter,
          options: [{ label: "1 Child", value: "1" }, { label: "2 Children", value: "2" }, { label: "3+ Children", value: "3+" }]
        }
      ];
    } else {
      return commonFilters;
    }
  }, [type, classFilter, classes, formSubmittedFilter, leftSchoolFilter, tcStatusFilter, genderFilter, siblingCountFilter]);

  const exportColumnsList = useMemo(() => {
    const base = [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "gender", label: "Gender" },
      { key: "associations", label: type === "student" ? "Class" : type === "teacher" ? "Classes" : type === "admission" ? "Pipeline Students" : "Connected Students" }
    ];
    if (type === "student") {
      return [
        ...base,
        { key: "admission_number", label: "Admission No" },
        { key: "admission_date", label: "Date of Joining" },
        { key: "house", label: "House" },
        { key: "father_name", label: "Father's Name" },
        { key: "mother_name", label: "Mother's Name" },
        { key: "alternate_number", label: "Alternate Number" },
        { key: "address", label: "Address" },
        { key: "bus_fee", label: "Bus Fee" },
        { key: "fee_exempted", label: "Fee Exempted" },
        { key: "form_submitted", label: "Form Submitted" },
        { key: "tc_received", label: "TC Received" },
        { key: "slc_received", label: "SLC Received" },
        { key: "character_certificate_received", label: "Character Cert" },
        { key: "leave_school", label: "Left School" }
      ];
    }
    if (type === "teacher") {
      return [
        ...base,
        { key: "subjects", label: "Subjects" },
        { key: "dob", label: "Date of Birth" },
        { key: "doj", label: "Date of Joining" },
        { key: "father_spouse_name", label: "Father/Spouse Name" },
        { key: "address", label: "Address" }
      ];
    }
    return base;
  }, [type]);

  const filteredStudentsForSelect = useMemo(() => {
    const search = studentSearch.toLowerCase();
    return students.filter(s => 
      (s.name && s.name.toLowerCase().includes(search)) || 
      (s.email && s.email.toLowerCase().includes(search)) ||
      (s.phone && String(s.phone).toLowerCase().includes(search)) ||
      (s.admission_number && String(s.admission_number).toLowerCase().includes(search))
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
        bus_fee: user.bus_fee || "",
        fee_exempted: user.fee_exempted || false,
        admission_date: user.admission_date || "",
        form_submitted: user.form_submitted || false,
        address: user.address || "",
        dob: user.dob || "",
        doj: user.doj || "",
        father_spouse_name: user.father_spouse_name || "",
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
        can_view_revenue: user.can_view_revenue || false,
        subjectAssignments: (() => {
           const ast = subjectTeachers?.filter(st => String(st.teacher_id) === String(user.id)) || [];
           const grouped = {};
           ast.forEach(st => {
              if (!grouped[st.subject_id]) grouped[st.subject_id] = [];
              grouped[st.subject_id].push(st.class_id);
           });
           return Object.keys(grouped).map(sid => ({ subjectId: sid, classIds: grouped[sid] }));
        })(),
      });
    } else {
      setEditingUser(null);
      setEditingUser(null);
      setFormData({ 
        name: "", email: "", password: "password@1", phone: "", alternate_number: "", type: type, connections: [], classId: "", classes: [],
        admission_number: "", house: "", father_name: "", mother_name: "", bus_fee: "", fee_exempted: false,
        admission_date: "", form_submitted: false, address: "", dob: "", doj: "", father_spouse_name: "", leave_school: false, tc_received: false, tc_date: "",
        slc_received: false, slc_date: "", character_certificate_received: false, character_certificate_date: "",
        tc_document_url: "", slc_document_url: "", character_certificate_document_url: "",
        can_view_revenue: false,
        subjectAssignments: [],
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
        delete payload.subjectAssignments; // Strip from user payload
        await api.put(`/admin_panel/users/${editingUser}`, { data: payload });
        
        // Sync subject assignments
        if (formData.type === 'teacher' && formData.subjectAssignments) {
          const existingAssignments = subjectTeachers?.filter(st => String(st.teacher_id) === String(editingUser)) || [];
          const newFlatAssignments = [];
          formData.subjectAssignments.forEach(group => {
            if (group.subjectId && group.classIds && group.classIds.length > 0) {
              group.classIds.forEach(cid => {
                newFlatAssignments.push({ subjectId: group.subjectId, classId: cid });
              });
            }
          });
          
          for (let ext of existingAssignments) {
            const stillExists = newFlatAssignments.find(sa => sa.subjectId === ext.subject_id && sa.classId === ext.class_id);
            if (!stillExists) {
              await api.post(`/admin_panel/subjectTeachers/assign`, { data: { subjectId: ext.subject_id, classId: ext.class_id, teacherId: null } });
            }
          }
          
          for (let newAsgn of newFlatAssignments) {
            const alreadyExists = existingAssignments.find(ext => ext.subject_id === newAsgn.subjectId && ext.class_id === newAsgn.classId);
            if (!alreadyExists) {
              await api.post(`/admin_panel/subjectTeachers/assign`, { data: { subjectId: newAsgn.subjectId, classId: newAsgn.classId, teacherId: editingUser } });
            }
          }
          dispatch(fetchSubjectTeachers());
        }
        
        toast.success("User updated successfully");
      } else {
        const payload = { ...formData };
        delete payload.subjectAssignments;
        await api.post("/admin_panel/users", { data: payload });
        toast.success("User created successfully");
        // Note: For new users, we'd need the created ID to assign subjects.
        // Currently subjects are only assigned when editing.
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
        await api.delete(`/admin_panel/users/${id}`);
        toast.success("User deleted successfully");
        dispatch(fetchUsers());
      } catch (error) {
        toast.error("Failed to delete user");
      }
    }
  };

  const handleBulkUploadSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBulkUploadFile(file);
      setBulkUploadStatus("idle");
      setBulkUploadReport([]);
    }
  };

  const handleBulkUploadStart = async () => {
    if (!bulkUploadFile) return toast.error("Please select a file first");
    setBulkUploadStatus("parsing");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataBuffer = new Uint8Array(event.target.result);
        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const rawJsonRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false, dateNF: "yyyy-mm-dd" });
        if (rawJsonRows.length === 0) {
          setBulkUploadStatus("idle");
          return toast.error("Excel sheet is empty");
        }

        const jsonRows = rawJsonRows.map(row => {
          const normalizedRow = {};
          for (let key in row) normalizedRow[key.trim()] = row[key];
          return normalizedRow;
        });

        const mappedData = jsonRows.map(row => {
          if (type === 'teacher') {
            const getVal = (...keys) => {
              for (const key of keys) {
                const found = Object.keys(row).find(k => k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
                if (found && row[found]) return String(row[found]);
              }
              return "";
            };

            const phone = getVal("MOB", "MOBILE", "PHONE", "CONTACT");
            return {
              type: type,
              name: getVal("NAME", "TEACHERNAME", "FULLNAME"),
              phone: phone,
              dob: getVal("DOB", "DATEOFBIRTH", "BIRTHDATE"),
              doj: getVal("DOJ", "DATEOFJOINING", "JOININGDATE"),
              father_spouse_name: getVal("FATHERSHUSBAND", "FATHERSHUSHBAND", "FATHERSNAME", "HUSBANDSNAME", "FATHERSPOUSENAME", "FATHER", "SPOUSE"),
              email: getVal("EMAIL", "EMAILID", "MAIL") || (phone ? `teacher_${phone}@thearcschool.in` : `teacher_${Math.floor(Math.random()*10000)}@thearcschool.in`),
              address: getVal("ADDRESS", "RESIDENTIALADDRESS", "HOMEADDRESS"),
              password: `password@1`, 
            };
          }
          return {
            type: type, 
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
            bus_fee: Number(row["BUS"]) || 0,
            admission_date: String(row["DATE OF ADMISSION"] || ""),
            form_submitted: String(row["FORM SUBMITTED"]).trim().toUpperCase() === "SUBMITTED" || String(row["FORM SUBMITTED"]).trim().toLowerCase() === "true",
            address: String(row["ADDRESS"] || ""),
            doj: String(row["DOJ"] || ""),
            father_spouse_name: String(row["FATHERS/HUSBAND"] || row["FATHER"] || row["SPOUSE"] || ""),
            leave_school: String(row["LEAVE SCHOOL"]).trim().toUpperCase() === "YES" || String(row["LEAVE SCHOOL"]).trim().toLowerCase() === "true",
            tc_received: Boolean(row["TC"]),
            tc_date: String(row["DATE"] || ""), 
            slc_received: Boolean(row["SLC"]),
            slc_date: String(row["DATE_1"] || ""),
            character_certificate_received: Boolean(row["CHARACTER CERTIFICATE"]),
            character_certificate_date: String(row["DATE_2"] || ""),
            email: `student_${String(row["AD NO"] || Math.floor(Math.random()*10000))}@thearcschool.in`,
            password: `password@1`,
          };
        });

        setBulkUploadTotal(mappedData.length);
        setBulkUploadStatus("uploading");
        setBulkUploadCurrent(0);
        setBulkUploadReport([]);
        
        let successCount = 0;

        for (let i = 0; i < mappedData.length; i++) {
          const user = mappedData[i];
          try {
            await api.post("/admin_panel/users/bulk", { data: [user] });
            setBulkUploadReport(prev => [...prev, { name: user.name, email: user.email, status: 'success', message: 'Uploaded successfully' }]);
            successCount++;
          } catch (error) {
            setBulkUploadReport(prev => [...prev, { name: user.name, email: user.email, status: 'error', message: error.response?.data?.message || "Failed" }]);
          }
          setBulkUploadCurrent(i + 1);
          setBulkUploadProgress(Math.round(((i + 1) / mappedData.length) * 100));
        }

        setBulkUploadStatus("complete");
        dispatch(fetchUsers());
        if (successCount > 0) toast.success(`${successCount} users uploaded successfully`);
      } catch (error) {
        console.error("Bulk parse error:", error);
        toast.error("Failed to parse file");
        setBulkUploadStatus("idle");
      }
    };
    reader.readAsArrayBuffer(bulkUploadFile);
  };

  const handleDownloadSample = () => {
    let sampleData;
    if (type === 'student') {
      sampleData = [{
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
    } else if (type === 'teacher') {
      sampleData = [{
        "SRL NO": "1",
        "NAME": "Jane Smith",
        "DOB": "1990-01-01",
        "MOB": "9876543210",
        "DOJ": "2022-06-15",
        "FATHERS/HUSBAND": "John Smith",
        "EMAIL": "jane.smith@thearcschool.in",
        "ADDRESS": "123 Teacher St, City"
      }];
    } else {
      sampleData = [{
        "NAME": "John Doe",
        "MOB": "9876543210",
        "EMAIL": "john.doe@thearcschool.in",
      }];
    }
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
    if (type === "admission") {
      const pipelineCount = newUsers?.filter(nu => String(nu.assigned_to) === String(u.id)).length || 0;
      return `${pipelineCount} Assigned`;
    }
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
      addIfSelected("alternate_number", u.alternate_number || "N/A");
      addIfSelected("gender", u.gender || "N/A");
      addIfSelected("associations", getAssociations(u));

      if (type === 'student') {
        addIfSelected("admission_number", u.admission_number || "N/A");
        addIfSelected("admission_date", u.admission_date || "N/A");
        addIfSelected("house", u.house || "N/A");
        addIfSelected("father_name", u.father_name || "N/A");
        addIfSelected("mother_name", u.mother_name || "N/A");
        addIfSelected("address", u.address || "N/A");
        addIfSelected("bus_fee", u.bus_fee || 0);
        addIfSelected("fee_exempted", u.fee_exempted ? "Yes" : "No");
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
      addIfSelected("alternate_number", u.alternate_number || "N/A");
      addIfSelected("gender", u.gender || "N/A");
      addIfSelected("associations", getAssociations(u));

      if (type === 'student') {
        addIfSelected("admission_number", u.admission_number || "N/A");
        addIfSelected("admission_date", u.admission_date || "N/A");
        addIfSelected("house", u.house || "N/A");
        addIfSelected("father_name", u.father_name || "N/A");
        addIfSelected("mother_name", u.mother_name || "N/A");
        addIfSelected("address", u.address || "N/A");
        addIfSelected("bus_fee", (u.bus_fee || 0).toString());
        addIfSelected("form_submitted", u.form_submitted ? "Yes" : "No");
        addIfSelected("tc_received", u.tc_received ? `Yes (${u.tc_date || ''})` : "No");
        addIfSelected("slc_received", u.slc_received ? `Yes (${u.slc_date || ''})` : "No");
        addIfSelected("character_certificate_received", u.character_certificate_received ? `Yes (${u.character_certificate_date || ''})` : "No");
        addIfSelected("leave_school", u.leave_school ? "Yes" : "No");
      } else if (type === 'teacher') {
        addIfSelected("dob", u.dob || "N/A");
        addIfSelected("doj", u.doj || "N/A");
        addIfSelected("father_spouse_name", u.father_spouse_name || "N/A");
        addIfSelected("address", u.address || "N/A");
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
      case "alternate_number": return user.alternate_number || "N/A";
      case "gender": return user.gender || "N/A";
      case "associations": 
        if (type === "student" && user.classes?.length > 0) {
          return <span style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", fontWeight: "600", padding: "4px 8px", borderRadius: "8px", fontSize: "12px" }}>{getClassName(user.classes[0])}</span>;
        } else if (type === "teacher") {
          // Collect all classes the teacher is involved with (CT + Subject)
          const ctClasses = user.classes || [];
          const subjectClasses = subjectTeachers?.filter(st => String(st.teacher_id) === String(user.id)).map(st => st.class_id) || [];
          
          const uniqueClassIds = [...new Set([...ctClasses, ...subjectClasses])];
          
          if (uniqueClassIds.length === 0) return "N/A";
          
          return (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '250px' }}>
              {uniqueClassIds.map(cid => {
                const isCT = ctClasses.includes(cid);
                const cName = getClassName(cid);
                return (
                  <span key={cid} style={{ 
                    background: isCT ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)", 
                    color: isCT ? "#10b981" : "#3b82f6", 
                    fontWeight: "600", padding: "4px 8px", borderRadius: "8px", fontSize: "12px", whiteSpace: "nowrap" 
                  }}>
                    {cName} {isCT && "(CT)"}
                  </span>
                );
              })}
            </div>
          );
        } else if (type === "parent" && user.connections?.length > 0) {
          return <span style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7", fontWeight: "600", padding: "4px 8px", borderRadius: "8px", fontSize: "12px" }}>{user.connections.length} Students</span>;
        } else if (type === "admission") {
          const pipelineCount = newUsers?.filter(nu => String(nu.assigned_to) === String(user.id)).length || 0;
          return <span style={{ background: "rgba(234, 88, 12, 0.15)", color: "#ea580c", fontWeight: "600", padding: "4px 8px", borderRadius: "8px", fontSize: "12px" }}>{pipelineCount} Pipeline</span>;
        }
        return "N/A";
      case "subjects":
        if (type === "teacher") {
          const assignedSubjects = subjectTeachers?.filter(st => String(st.teacher_id) === String(user.id)) || [];
          if (assignedSubjects.length === 0) return "N/A";
          
          const uniqueSubjectIds = [...new Set(assignedSubjects.map(st => st.subject_id))];
          
          return (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '250px' }}>
              {uniqueSubjectIds.map(subjectId => {
                const sub = subjects?.find(s => s.id === subjectId);
                return (
                  <span key={subjectId} style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6", fontWeight: "600", padding: "4px 8px", borderRadius: "8px", fontSize: "12px", whiteSpace: "nowrap" }}>
                    {sub?.name || 'Unknown'}
                  </span>
                );
              })}
            </div>
          );
        }
        return "N/A";
      case "admission_number": return user.admission_number || "-";
      case "admission_date": return user.admission_date || "N/A";
      case "house": return user.house || "N/A";
      case "father_name": return user.father_name || "N/A";
      case "mother_name": return user.mother_name || "N/A";
      case "address": return user.address || "N/A";
      case "bus_fee": return user.bus_fee || "0";
      case "fee_exempted": return user.fee_exempted ? <span style={{ color: "#10b981", fontWeight: "600" }}>Yes</span> : "No";
      case "form_submitted": return user.form_submitted ? "Yes" : "No";
      case "leave_school": return user.leave_school ? "Yes" : "No";
      case "tc_received": return user.tc_received ? `Yes (${user.tc_date || ''})` : "No";
      case "slc_received": return user.slc_received ? `Yes (${user.slc_date || ''})` : "No";
      case "character_certificate_received": return user.character_certificate_received ? `Yes (${user.character_certificate_date || ''})` : "No";
      case "dob": return user.dob || "N/A";
      case "doj": return user.doj || "N/A";
      case "father_spouse_name": return user.father_spouse_name || "N/A";
      default: return user[key] || "N/A";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 3rem)", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", textTransform: "capitalize" }}>{type} Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage your {type} accounts</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(type === 'student' || type === 'teacher') && (
            <>
              <button onClick={handleDownloadSample} className="btn btn-ghost" style={{ display: "flex", alignItems: "center" }}>
                <FileSpreadsheet size={18} style={{ marginRight: "0.5rem" }} /> Download Format
              </button>
              <button className="btn btn-secondary" onClick={() => setIsBulkUploadModalOpen(true)} style={{ display: "flex", alignItems: "center" }}>
                <Upload size={18} style={{ marginRight: "0.5rem" }} /> Bulk Upload Excel
              </button>
            </>
          )}
          <button onClick={() => handleOpenModal()} className="btn btn-primary">
            <Plus size={18} /> Add {type}
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: "1rem" }}>
        <div style={{ flexShrink: 0 }}>
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
        </div>
        <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", minHeight: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", position: "relative" }}>
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
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        {(type === 'admission' || type === 'finance' || type === 'student' || type === 'teacher' || type === 'parent') && (
                          <button onClick={() => {
                            if (type === 'admission') navigate(`/counselor/${user.id}`);
                            else if (type === 'finance') navigate(`/finance-profile/${user.id}`);
                            else if (type === 'student') navigate(`/student-profile/${user.id}`);
                            else if (type === 'teacher') navigate(`/teacher-profile/${user.id}`);
                            else if (type === 'parent') {
                              setViewParent(user);
                              setIsViewParentModalOpen(true);
                            }
                          }} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", borderRadius: "4px", border: "none", cursor: "pointer" }}>
                            <Eye size={14} style={{ marginRight: "0.25rem" }} /> View
                          </button>
                        )}
                        <button onClick={() => handleOpenModal(user)} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#3b82f6", background: "rgba(59, 130, 246, 0.1)", borderRadius: "4px", border: "none", cursor: "pointer" }}>
                          <Edit size={14} style={{ marginRight: "0.25rem" }} /> Edit
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px", border: "none", cursor: "pointer" }}>
                          <Trash2 size={14} style={{ marginRight: "0.25rem" }} /> Delete
                        </button>
                      </div>
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
                <span style={{ fontSize: "0.875rem" } }>Rows per page:</span>
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

      {isStudentSelectModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: "1rem" }} onClick={() => setIsStudentSelectModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "600px", padding: "2rem", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "600" }}>Select Connected Students</h3>
              <button onClick={() => setIsStudentSelectModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>✕</button>
            </div>
            
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                type="text"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="input-glass"
                style={{ width: "100%", paddingLeft: "36px" }}
              />
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", background: "rgba(255, 255, 255, 0.02)" }}>
              {students
                .filter(s => s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.admission_number?.toLowerCase().includes(studentSearch.toLowerCase()))
                .map(student => (
                  <div 
                    key={student.id}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        connections: prev.connections.includes(student.id)
                          ? prev.connections.filter(id => id !== student.id)
                          : [...prev.connections, student.id]
                      }));
                    }}
                    style={{ 
                      padding: "12px 16px", 
                      borderBottom: "1px solid var(--glass-border)",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      cursor: "pointer",
                      background: formData.connections.includes(student.id) ? "rgba(59, 130, 246, 0.1)" : "transparent"
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={formData.connections.includes(student.id)}
                      onChange={() => {}}
                      style={{ cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontWeight: "500" }}>{student.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Adm No: {student.admission_number || "N/A"} | Class: {getClassName(student.classes?.[0])}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button onClick={() => setIsStudentSelectModalOpen(false)} className="btn">Done ({formData.connections.length} selected)</button>
            </div>
          </div>
        </div>
      )}

      {isViewParentModalOpen && viewParent && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }} onClick={() => setIsViewParentModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>
              Parent: {viewParent.name}
            </h2>
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem" }}>Connected Students</h3>
              {viewParent.connections && viewParent.connections.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {viewParent.connections.map(studentId => {
                    const student = students.find(s => s.id === studentId);
                    return (
                      <li key={studentId} style={{ padding: "0.5rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{student ? student.name : "Unknown Student"}</span>
                        {student && (
                          <button onClick={() => navigate(`/student-profile/${student.id}`)} className="btn-ghost" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}>
                            View Profile
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p style={{ color: "var(--text-secondary)" }}>No students connected.</p>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setIsViewParentModalOpen(false)} className="btn">Close</button>
            </div>
          </div>
        </div>
      )}

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
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>{type === 'parent' ? "Father & Mother Names (e.g. John & Jane)" : "Full Name"}</label>
                  <input required className="input-glass" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                {type !== 'parent' && (
                  <>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Email Address</label>
                      <input required type="email" className="input-glass" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Password {editingUser && "(Leave blank to keep)"}</label>
                      <input type="password" required={!editingUser} className="input-glass" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                  </>
                )}
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Phone Number</label>
                  <input className="input-glass" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Alternate Number</label>
                  <input className="input-glass" value={formData.alternate_number} onChange={(e) => setFormData({ ...formData, alternate_number: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Gender</label>
                  <select className="input-glass" value={formData.gender || ""} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {type === 'student' && (
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Class</label>
                    <select 
                      className="input-glass" 
                      value={formData.classId || ""} 
                      onChange={e => setFormData({...formData, classId: e.target.value === "" ? null : e.target.value})}
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

              {type === 'teacher' && (
                <div style={{ marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)" }}>Subject Assignments</h3>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, subjectAssignments: [...(formData.subjectAssignments || []), { subjectId: "", classIds: [] }] })}
                      className="btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#3b82f6", background: "rgba(59, 130, 246, 0.1)", borderRadius: "4px" }}
                    >
                      + Add Subject
                    </button>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {(formData.subjectAssignments || []).map((assignment, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.5rem", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--glass-border)", position: "relative", zIndex: 100 - idx }}>
                        <div style={{ position: "relative" }}>
                          <CustomSelect 
                            options={subjects?.map(s => ({ value: s.id, label: s.name })) || []}
                            value={assignment.subjectId}
                            onChange={(val) => {
                              const newAssignments = [...formData.subjectAssignments];
                              newAssignments[idx].subjectId = val;
                              setFormData({ ...formData, subjectAssignments: newAssignments });
                            }}
                            placeholder="Select Subject..."
                          />
                        </div>
                        
                        <div style={{ position: "relative" }}>
                          <CustomSelect 
                            options={classes?.map(c => ({ value: c.id, label: `${c.className || c.name} ${c.section ? '- ' + c.section : ''}`.trim() })) || []}
                            value={assignment.classIds}
                            isMulti={true}
                            onChange={(val) => {
                              const newAssignments = [...formData.subjectAssignments];
                              newAssignments[idx].classIds = val;
                              setFormData({ ...formData, subjectAssignments: newAssignments });
                            }}
                            placeholder="Select Classes..."
                          />
                        </div>
                        
                        <button 
                          type="button"
                          onClick={() => {
                            const newAssignments = formData.subjectAssignments.filter((_, i) => i !== idx);
                            setFormData({ ...formData, subjectAssignments: newAssignments });
                          }}
                          className="btn-ghost hover-bg"
                          style={{ color: "#ef4444", padding: "0.25rem", borderRadius: "4px" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {(formData.subjectAssignments?.length === 0) && (
                      <div style={{ textAlign: "center", padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem", fontStyle: "italic", background: "rgba(0,0,0,0.02)", borderRadius: "8px" }}>
                        No subjects assigned yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {type === 'teacher' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)" }}>Teacher Details</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date of Birth</label>
                      <input type="date" className="input-glass" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date of Joining (DOJ)</label>
                      <input type="date" className="input-glass" value={formData.doj} onChange={(e) => setFormData({ ...formData, doj: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Father / Spouse Name</label>
                      <input className="input-glass" value={formData.father_spouse_name} onChange={(e) => setFormData({ ...formData, father_spouse_name: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Address</label>
                      <input className="input-glass" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {(type === 'finance' || type === 'accountant') && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem", padding: "1rem", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px" }}>
                  <input type="checkbox" checked={formData.can_view_revenue} onChange={(e) => setFormData({ ...formData, can_view_revenue: e.target.checked })} style={{ width: "16px", height: "16px" }} />
                  <label style={{ fontSize: "0.875rem", color: "#10b981", fontWeight: "600" }}>Allow Viewing Revenue / Dashboard Analytics</label>
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
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Date of Birth</label>
                      <input type="date" className="input-glass" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
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
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Monthly, Annual, and One-Time fees are automatically calculated based on the assigned Class Fee Structure.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Bus Fee (₹) / month</label>
                      <input type="number" className="input-glass" value={formData.bus_fee} onChange={(e) => setFormData({ ...formData, bus_fee: e.target.value })} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
                      <input type="checkbox" id="fee_exempted" checked={formData.fee_exempted} onChange={(e) => setFormData({ ...formData, fee_exempted: e.target.checked })} />
                      <label htmlFor="fee_exempted" style={{ fontSize: "0.875rem", cursor: "pointer" }}>Fee Exempted (Full Waiver)</label>
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
      {isBulkUploadModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={() => bulkUploadStatus !== 'uploading' && setIsBulkUploadModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "600px", padding: "2rem", display: "flex", flexDirection: "column", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem" }}>Bulk Upload {type}s</h2>
            
            {bulkUploadStatus === 'idle' && (
              <>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  Download the sample format, fill it with your data, and upload the completed file.
                </p>
                <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
                  <button onClick={handleDownloadSample} className="btn btn-secondary" style={{ display: "flex", alignItems: "center" }}>
                    <FileSpreadsheet size={18} style={{ marginRight: "0.5rem" }} /> Download Sample
                  </button>
                </div>
                
                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "3rem 2rem", border: "2px dashed var(--glass-border)", borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.2s"
                }}>
                  <Upload size={32} color="var(--accent-primary)" style={{ marginBottom: "1rem" }} />
                  <span style={{ fontSize: "1.1rem", fontWeight: "500", marginBottom: "0.5rem" }}>
                    {bulkUploadFile ? bulkUploadFile.name : "Click to select file"}
                  </span>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Supports .xlsx, .xls, .csv</span>
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleBulkUploadSelect} style={{ display: "none" }} />
                </label>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
                  <button onClick={() => setIsBulkUploadModalOpen(false)} className="btn btn-ghost">Cancel</button>
                  <button onClick={handleBulkUploadStart} disabled={!bulkUploadFile} className="btn btn-primary">Start Upload</button>
                </div>
              </>
            )}

            {(bulkUploadStatus === 'parsing' || bulkUploadStatus === 'uploading') && (
              <div style={{ padding: "2rem 0", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
                  {bulkUploadStatus === 'parsing' ? "Parsing File..." : `Uploading ${bulkUploadCurrent} of ${bulkUploadTotal}...`}
                </h3>
                <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden", marginBottom: "1rem" }}>
                  <div style={{ height: "100%", width: `${bulkUploadProgress}%`, background: "var(--accent-primary)", transition: "width 0.3s ease" }}></div>
                </div>
                <p style={{ color: "var(--text-secondary)" }}>{bulkUploadProgress}% Complete. Please do not close this window.</p>
              </div>
            )}

            {bulkUploadStatus === 'complete' && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ padding: "1rem", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", flex: 1, textAlign: "center" }}>
                    <span style={{ display: "block", fontSize: "1.5rem", fontWeight: "700", color: "#10b981" }}>
                      {bulkUploadReport.filter(r => r.status === 'success').length}
                    </span>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Successful</span>
                  </div>
                  <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", flex: 1, textAlign: "center" }}>
                    <span style={{ display: "block", fontSize: "1.5rem", fontWeight: "700", color: "#ef4444" }}>
                      {bulkUploadReport.filter(r => r.status === 'error').length}
                    </span>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Failed</span>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.5rem", background: "rgba(0,0,0,0.05)", maxHeight: "50vh" }}>
                  {bulkUploadReport.map((r, i) => (
                    <div key={i} style={{ padding: "0.75rem", borderBottom: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "500", fontSize: "0.95rem" }}>{r.name || "Unknown"} <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: "normal" }}>({r.email})</span></span>
                        <span style={{ fontSize: "0.75rem", fontWeight: "600", padding: "2px 8px", borderRadius: "12px", background: r.status === 'success' ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)", color: r.status === 'success' ? "#6ee7b7" : "#fca5a5" }}>
                          {r.status.toUpperCase()}
                        </span>
                      </div>
                      {r.status === 'error' && (
                        <span style={{ color: "#fca5a5", fontSize: "0.85rem", marginTop: "0.25rem" }}>Error: {r.message}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                  <button onClick={() => { setIsBulkUploadModalOpen(false); setBulkUploadStatus("idle"); }} className="btn btn-primary">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;
