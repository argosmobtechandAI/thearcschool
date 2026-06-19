import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFees, fetchClasses, fetchUsers, createFee, deleteFee, updateFee, generateMonthlyFees, generateYearlyAMC } from "../features/dataSlice";
import { PlusCircle, Trash2, Calendar, FileText, CheckCircle, IndianRupee, Edit, Users, FileSpreadsheet } from "lucide-react";
import { toast } from "react-toastify";
import TableFilterHeader from "../components/TableFilterHeader";
import DateRangePicker from "../components/DateRangePicker";
import { useSortableData } from "../hooks/useSortableData";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const FeeManagement = () => {
  const dispatch = useDispatch();
  const { fees, classes, users, loadingFees, globalDateRange } = useSelector((state) => state.data);
  const { user } = useSelector((state) => state.auth);
  const isFinanceTeam = user?.type === 'finance' || user?.type === 'accountant';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showGenerateMonthlyModal, setShowGenerateMonthlyModal] = useState(false);
  const [showGenerateYearlyModal, setShowGenerateYearlyModal] = useState(false);
  const [viewingFee, setViewingFee] = useState(null);
  const [editingFee, setEditingFee] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [genMonth, setGenMonth] = useState("");
  const [genYear, setGenYear] = useState(new Date().getFullYear().toString());
  const [genAcademicYear, setGenAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedColumns, setSelectedColumns] = useState([
    "sno", "title", "amount", "assigned_classes", "students_count", "due_date", "status", "actions"
  ]);

  const [formData, setFormData] = useState({
    title: "",
    totalAmount: "",
    lastDate: "", // represents dueDate
    classId: ""
  });

  useEffect(() => {
    dispatch(fetchFees());
    dispatch(fetchClasses());
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.totalAmount || !formData.lastDate || !formData.classId) {
      toast.error("Please fill in all fields.");
      return;
    }

    // Get all students for the selected class
    const studentsInClass = users.filter(u => u.type === 'student' && !u.fee_exempted && u.classes && u.classes.some(c => String(c) === String(formData.classId)));
    
    if (studentsInClass.length === 0) {
      toast.error("There are no fee-paying students in this class. Fee cannot be assigned.");
      return;
    }

    const studentId = studentsInClass.map(s => s.id);

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        totalAmount: formData.totalAmount,
        lastDate: formData.lastDate,
        studentId: studentId
      };
      
      const res = await dispatch(createFee(payload)).unwrap();
      toast.success(res.message || "Fee created successfully");
      setShowCreateModal(false);
      setFormData({ title: "", totalAmount: "", lastDate: "", classId: "" });
      dispatch(fetchFees()); // Refetch to show new fee
    } catch (err) {
      toast.error(err.message || "Failed to create fee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (feeId) => {
    if (window.confirm("Are you sure you want to delete this fee? This will remove it from all students!")) {
      try {
        await dispatch(deleteFee(feeId)).unwrap();
        toast.success("Fee deleted successfully");
      } catch (err) {
        toast.error("Failed to delete fee");
      }
    }
  };

  const handleExportStudentsPDF = () => {
    if (!viewingFee) return;
    const columns = ["Student", "Admission No", "Class", "Total Paid", "Balance", "Status"];
    const rows = viewingFee.assignedStudents.map(s => [
      s.name,
      s.admission_number || "-",
      s.className,
      `Rs. ${s.totalPaid}`,
      `Rs. ${s.balance}`,
      s.status
    ]);
    exportToPDF(columns, rows, `Fee_Students_${viewingFee.title}`, `Assigned Students - ${viewingFee.title}`);
  };

  const handleExportStudentsExcel = () => {
    if (!viewingFee) return;
    const data = viewingFee.assignedStudents.map(s => ({
      "Student Name": s.name,
      "Admission No": s.admission_number || "-",
      "Class": s.className,
      "Total Paid": `Rs. ${s.totalPaid}`,
      "Balance": `Rs. ${s.balance}`,
      "Status": s.status
    }));
    exportToExcel(data, `Fee_Students_${viewingFee.title}`);
  };

  const handleEditClick = (fee) => {
    setEditingFee({
      id: fee.id,
      title: fee.title,
      totalAmount: fee.amount,
      lastDate: fee.dueDate ? fee.dueDate.split("T")[0] : ""
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingFee.title || !editingFee.totalAmount || !editingFee.lastDate) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title: editingFee.title,
        amount: editingFee.totalAmount,
        dueDate: editingFee.lastDate
      };
      await dispatch(updateFee({ feeId: editingFee.id, data: payload })).unwrap();
      toast.success("Fee updated successfully");
      setShowEditModal(false);
      setEditingFee(null);
      // Wait for toast to render then re-fetch
      dispatch(fetchFees());
    } catch (err) {
      toast.error(err.message || "Failed to update fee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateMonthly = async (e) => {
    e.preventDefault();
    if (!genMonth || !genYear) {
      toast.error("Please select both month and year.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await dispatch(generateMonthlyFees({ month: genMonth, year: genYear })).unwrap();
      toast.success(`Monthly fees generated. Assigned to ${res.count} students.`);
      setShowGenerateMonthlyModal(false);
      dispatch(fetchFees());
    } catch (err) {
      toast.error(err.message || "Failed to generate monthly fees");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateYearly = async (e) => {
    e.preventDefault();
    if (!genAcademicYear) {
      toast.error("Please select academic year.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await dispatch(generateYearlyAMC({ academicYear: genAcademicYear })).unwrap();
      toast.success(`AMC generated. Assigned to ${res.count} students.`);
      setShowGenerateYearlyModal(false);
      dispatch(fetchFees());
    } catch (err) {
      toast.error(err.message || "Failed to generate AMC");
    } finally {
      setIsSubmitting(false);
    }
  };

  // process the fees
  const processedFees = useMemo(() => {
    return fees.map(f => {
      // Find students who have this fee
      const assignedStudents = users.filter(u => 
        u.type === 'student' && 
        !u.fee_exempted && 
        u.fees && 
        u.fees.some(uf => uf.fee?.id === f.id || uf.fee_id === f.id)
      );

      // Collect unique class ids
      const classIds = new Set();
      assignedStudents.forEach(s => {
        if (s.classes) s.classes.forEach(c => classIds.add(c));
      });

      // Map to class names
      const assignedClassNames = Array.from(classIds).map(cid => {
        const c = classes.find(cls => cls.id === cid);
        return c ? `${c.name} ${c.section || ''}`.trim() : 'Unknown';
      });

      // Determine Status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let status = "Upcoming";
      if (f.dueDate) {
        const dDate = new Date(f.dueDate);
        if (dDate < today) status = "Past Due";
        else if (dDate.getTime() === today.getTime()) status = "Due Today";
        else status = "Active";
      }

      return {
        ...f,
        assignedStudentsCount: assignedStudents.length,
        assignedStudents: assignedStudents.map(s => {
          const sf = s.fees.find(uf => uf.fee?.id === f.id || uf.fee_id === f.id);
          const totalPaid = Number(sf?.total_paid_amount || 0);
          
          let baseAmount = Number(f.amount || 0);
          let lateFee = 0;
          
          // Only compute late fee if not fully paid yet
          // To be perfectly accurate, if it was paid late, we'd need to store the late fee at time of payment.
          // For now, if balance is > 0, we add the late fee for unpaid days.
          if (f.late_fee_applicable && f.dueDate) {
            const dDate = new Date(f.dueDate);
            dDate.setHours(0, 0, 0, 0);
            if (today > dDate && totalPaid < baseAmount) {
              const diffTime = Math.abs(today - dDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              lateFee = diffDays * 10;
            }
          }
          
          const totalAmount = baseAmount + lateFee;
          const balance = Math.max(0, totalAmount - totalPaid);
          const c = classes.find(cls => s.classes?.includes(cls.id));
          return {
             id: s.id,
             name: s.name,
             admission_number: s.admission_number,
             className: c ? `${c.name} ${c.section || ''}`.trim() : 'Unknown',
             totalPaid,
             lateFee,
             totalAmount,
             balance,
             status: balance === 0 ? "Paid" : (totalPaid > 0 ? "Partial" : "Unpaid")
          };
        }),
        assignedClassNames: assignedClassNames.length > 0 ? assignedClassNames : ["Unassigned"],
        assignedClassIds: Array.from(classIds),
        status
      };
    });
  }, [fees, users, classes]);

  // Filter fees
  const filteredFees = useMemo(() => {
    return processedFees.filter(f => {
      // Search
      const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase());
      // Date Range
      let matchesDate = true;
      if (f.dueDate && (globalDateRange?.startDate || globalDateRange?.endDate)) {
        const d = new Date(f.dueDate);
        if (globalDateRange?.startDate && d < new Date(globalDateRange.startDate)) matchesDate = false;
        if (globalDateRange?.endDate && d > new Date(globalDateRange.endDate)) matchesDate = false;
      }
      // Class Filter
      let matchesClass = true;
      if (selectedClass) {
        matchesClass = f.assignedClassIds.includes(selectedClass);
      }
      return matchesSearch && matchesDate && matchesClass;
    });
  }, [processedFees, searchQuery, globalDateRange, selectedClass]);

  const { items: sortedFees, requestSort, sortConfig } = useSortableData(filteredFees);

  const renderSortIndicator = (key) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const exportColumnsList = [
    { key: "sno", label: "S.No" },
    { key: "title", label: "Fee Title" },
    { key: "amount", label: "Amount" },
    { key: "assigned_classes", label: "Classes" },
    { key: "students_count", label: "Students" },
    { key: "due_date", label: "Due Date" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions" }
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>Fee Setup</h1>
          <p style={{ color: "var(--text-secondary)" }}>Create and assign new fee structures</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          {isFinanceTeam && (
            <>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap" }}>
                <PlusCircle size={18} /> Create New Fee
              </button>
            </>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <TableFilterHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Search by fee title..."
          filters={[
            {
              label: "All Classes",
              value: selectedClass,
              options: classes.map(c => ({ value: c.id, label: `${c.name} ${c.section || ''}`.trim() })),
              onChange: setSelectedClass
            }
          ]}
          columns={exportColumnsList}
          selectedColumns={selectedColumns}
          setSelectedColumns={setSelectedColumns}
        >
        </TableFilterHeader>

        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)" }}>
                {selectedColumns.includes("sno") && <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>S.NO</th>}
                {selectedColumns.includes("title") && <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("title")}>FEE TITLE{renderSortIndicator("title")}</th>}
                {selectedColumns.includes("amount") && <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("amount")}>AMOUNT{renderSortIndicator("amount")}</th>}
                {selectedColumns.includes("assigned_classes") && <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>CLASSES</th>}
                {selectedColumns.includes("students_count") && <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("assignedStudentsCount")}>STUDENTS{renderSortIndicator("assignedStudentsCount")}</th>}
                {selectedColumns.includes("due_date") && <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("dueDate")}>DUE DATE{renderSortIndicator("dueDate")}</th>}
                {selectedColumns.includes("status") && <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }} onClick={() => requestSort("status")}>STATUS{renderSortIndicator("status")}</th>}
                {selectedColumns.includes("actions") && <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", textAlign: "right" }}>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {loadingFees ? (
                <tr><td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading fees...</td></tr>
              ) : sortedFees.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No fees match your filters.</td></tr>
              ) : (
                sortedFees.map((f, idx) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s" }} className="hover-row">
                    {selectedColumns.includes("sno") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: "500" }}>{idx + 1}</td>}
                    {selectedColumns.includes("title") && <td style={{ padding: "1rem", fontWeight: "600", color: "var(--text-primary)" }}>{f.title}</td>}
                    {selectedColumns.includes("amount") && <td style={{ padding: "1rem", fontWeight: "600", color: "#10b981" }}>₹{f.amount}</td>}
                    
                    {selectedColumns.includes("assigned_classes") && (
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", maxWidth: "250px" }}>
                          {f.assignedClassNames.map((cName, i) => (
                            <span key={i} style={{ 
                              padding: "0.25rem 0.6rem", 
                              borderRadius: "12px", 
                              fontSize: "0.75rem", 
                              fontWeight: "600", 
                              background: "rgba(99, 102, 241, 0.1)", 
                              color: "#6366f1",
                              whiteSpace: "nowrap"
                            }}>
                              {cName}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    
                    {selectedColumns.includes("students_count") && <td style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: "500" }}>{f.assignedStudentsCount}</td>}
                    
                    {selectedColumns.includes("due_date") && (
                      <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                        {f.dueDate ? new Date(f.dueDate).toLocaleDateString() : "-"}
                      </td>
                    )}
                    
                    {selectedColumns.includes("status") && (
                      <td style={{ padding: "1rem" }}>
                        <div style={{ 
                          display: "inline-flex", 
                          alignItems: "center", 
                          padding: "0.25rem 0.6rem", 
                          borderRadius: "12px", 
                          fontSize: "0.75rem", 
                          fontWeight: "700",
                          background: f.status === "Past Due" ? "rgba(239, 68, 68, 0.1)" : (f.status === "Active" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)"),
                          color: f.status === "Past Due" ? "#ef4444" : (f.status === "Active" ? "#10b981" : "#f59e0b")
                        }}>
                          {f.status}
                        </div>
                      </td>
                    )}

                    {selectedColumns.includes("actions") && (
                      <td style={{ padding: "0.5rem 1rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button onClick={() => { setViewingFee(f); setShowStudentsModal(true); }} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", borderRadius: "4px" }}>
                          <Users size={14} style={{ marginRight: "0.25rem" }}/> View Students
                        </button>
                        {isFinanceTeam && (
                          <>
                            <button onClick={() => { setEditingFee(f); setShowEditModal(true); }} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#3b82f6", background: "rgba(59, 130, 246, 0.1)", borderRadius: "4px" }}>
                              <Edit size={14} style={{ marginRight: "0.25rem" }}/> Edit
                            </button>
                            <button onClick={() => handleDelete(f.id)} className="btn-ghost" style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px" }}>
                              <Trash2 size={14} style={{ marginRight: "0.25rem" }}/> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="glass-panel modal-content animate-fade-in" style={{ width: "100%", maxWidth: "500px", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Create New Fee</h2>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Fee Title</label>
                <div style={{ position: "relative" }}>
                  <FileText size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input type="text" required placeholder="e.g. Term 1 Tuition" className="input-glass" style={{ paddingLeft: "2.5rem", width: "100%" }} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Total Amount (₹)</label>
                <div style={{ position: "relative" }}>
                  <IndianRupee size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input type="number" required min="1" placeholder="e.g. 5000" className="input-glass" style={{ paddingLeft: "2.5rem", width: "100%" }} value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Due Date</label>
                <div style={{ position: "relative" }}>
                  <Calendar size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input type="date" required className="input-glass" style={{ paddingLeft: "2.5rem", width: "100%" }} value={formData.lastDate} onChange={e => setFormData({...formData, lastDate: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Assign To Class</label>
                <select required className="input-glass" style={{ width: "100%" }} value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})}>
                  <option value="">-- Select Class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{`${c.name} ${c.section || ''}`.trim()}</option>
                  ))}
                </select>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0.5rem 0 0 0.5rem" }}>
                  This fee will be automatically assigned to all non-exempt students currently enrolled in this class.
                </p>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: "center" }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                  {isSubmitting ? "Creating..." : "Create Fee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingFee && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="glass-panel modal-content animate-fade-in" style={{ width: "100%", maxWidth: "500px", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Edit Fee</h2>
            
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Fee Title</label>
                <div style={{ position: "relative" }}>
                  <FileText size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input type="text" required placeholder="e.g. Term 1 Tuition" className="input-glass" style={{ paddingLeft: "2.5rem", width: "100%" }} value={editingFee.title} onChange={e => setEditingFee({...editingFee, title: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Total Amount (₹)</label>
                <div style={{ position: "relative" }}>
                  <IndianRupee size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input type="number" required min="1" placeholder="e.g. 5000" className="input-glass" style={{ paddingLeft: "2.5rem", width: "100%" }} value={editingFee.totalAmount} onChange={e => setEditingFee({...editingFee, totalAmount: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Due Date</label>
                <div style={{ position: "relative" }}>
                  <Calendar size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input type="date" required className="input-glass" style={{ paddingLeft: "2.5rem", width: "100%" }} value={editingFee.lastDate} onChange={e => setEditingFee({...editingFee, lastDate: e.target.value})} />
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: "center" }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStudentsModal && viewingFee && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="glass-panel modal-content animate-fade-in" style={{ width: "100%", maxWidth: "800px", padding: "2rem", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem" }}>Assigned Students - {viewingFee.title}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Total Students: {viewingFee.assignedStudentsCount} | Amount: ₹{viewingFee.amount}
            </p>
            
            <div style={{ overflowY: "auto", flex: 1, border: "1px solid var(--glass-border)", borderRadius: "12px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", whiteSpace: "nowrap" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)", position: "sticky", top: 0 }}>
                    <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>STUDENT</th>
                    <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>CLASS</th>
                    <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>LATE FEE</th>
                    <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>TOTAL DUE</th>
                    <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>TOTAL PAID</th>
                    <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>BALANCE</th>
                    <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingFee.assignedStudents.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No students assigned.</td></tr>
                  ) : (
                    viewingFee.assignedStudents.map(s => (
                      <tr key={s.id} style={{ borderBottom: "1px solid var(--glass-border)" }} className="hover-row">
                        <td style={{ padding: "1rem" }}>
                          <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{s.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Adm: {s.admission_number || "-"}</div>
                        </td>
                        <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{s.className}</td>
                        <td style={{ padding: "1rem", color: s.lateFee > 0 ? "#ef4444" : "var(--text-secondary)", fontSize: "0.875rem" }}>₹{s.lateFee}</td>
                        <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>₹{s.totalAmount}</td>
                        <td style={{ padding: "1rem", fontWeight: "600", color: "#10b981" }}>₹{s.totalPaid}</td>
                        <td style={{ padding: "1rem", fontWeight: "600", color: s.balance > 0 ? "#ef4444" : "var(--text-secondary)" }}>₹{s.balance}</td>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ 
                            display: "inline-flex", 
                            alignItems: "center", 
                            padding: "0.25rem 0.6rem", 
                            borderRadius: "12px", 
                            fontSize: "0.75rem", 
                            fontWeight: "700",
                            background: s.status === "Paid" ? "rgba(16, 185, 129, 0.1)" : (s.status === "Partial" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)"),
                            color: s.status === "Paid" ? "#10b981" : (s.status === "Partial" ? "#f59e0b" : "#ef4444")
                          }}>
                            {s.status}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button onClick={handleExportStudentsExcel} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981", border: "1px solid #10b981", padding: "0.5rem 1rem", borderRadius: "8px" }}>
                  <FileSpreadsheet size={16} /> Excel
                </button>
                <button onClick={handleExportStudentsPDF} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ef4444", border: "1px solid #ef4444", padding: "0.5rem 1rem", borderRadius: "8px" }}>
                  <FileText size={16} /> PDF
                </button>
              </div>
              <button onClick={() => setShowStudentsModal(false)} className="btn-secondary" style={{ padding: "0.5rem 1.5rem" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerateMonthlyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="glass-panel modal-content animate-fade-in" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Generate Monthly Fees</h2>
            <form onSubmit={handleGenerateMonthly} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Month</label>
                <select required className="input-glass" style={{ width: "100%" }} value={genMonth} onChange={e => setGenMonth(e.target.value)}>
                  <option value="">-- Select Month --</option>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Year</label>
                <input type="number" required className="input-glass" style={{ width: "100%" }} value={genYear} onChange={e => setGenYear(e.target.value)} />
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                This will automatically generate Tuition and Transport fees for all active students based on their structures.
              </p>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowGenerateMonthlyModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1 }}>
                  {isSubmitting ? "Generating..." : "Generate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGenerateYearlyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="glass-panel modal-content animate-fade-in" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Generate AMC</h2>
            <form onSubmit={handleGenerateYearly} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Academic Year</label>
                <input type="text" required placeholder="e.g. 2024-2025" className="input-glass" style={{ width: "100%" }} value={genAcademicYear} onChange={e => setGenAcademicYear(e.target.value)} />
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                This will automatically assign the ₹4000 Annual Maintenance Fee to all active students.
              </p>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowGenerateYearlyModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1 }}>
                  {isSubmitting ? "Generating..." : "Generate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeManagement;
