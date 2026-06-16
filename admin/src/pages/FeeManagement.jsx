import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchClasses, fetchFees, fetchUsers } from "../features/dataSlice";
import { Search, Plus, Edit, Trash2, Users, IndianRupee } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import TableFilterHeader from "../components/TableFilterHeader";
import DateRangePicker from "../components/DateRangePicker";

const FeeManagement = () => {
  const dispatch = useDispatch();
  const { classes, users, fees, loadingFees } = useSelector((state) => state.data);

  const [viewMode, setViewMode] = useState("class"); // 'class' or 'all'
  const [selectedClassId, setSelectedClassId] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [feeIdFilter, setFeeIdFilter] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  
  // Modals
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState(null);

  const [feeForm, setFeeForm] = useState({
    title: "",
    totalAmount: "",
    lastDate: "",
    studentId: [],
  });

  const [updateForm, setUpdateForm] = useState({
    status: "pending",
    paidAmount: 0,
  });

  useEffect(() => {
    dispatch(fetchFees());
    if (classes.length === 0) dispatch(fetchClasses());
    if (users.length === 0) dispatch(fetchUsers());
  }, [dispatch, classes.length, users.length]);

  // Set default selected class once loaded
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return users.filter(u => selectedClass.student?.includes(String(u.id)));
  }, [users, selectedClass]);

  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchStudent.toLowerCase());
      
      let matchesStatus = true;
      let matchesFee = true;

      if (statusFilter) {
        if (statusFilter === "none") {
          matchesStatus = (!s.fees || s.fees.length === 0);
        } else {
          matchesStatus = s.fees?.some(f => f.status === statusFilter);
        }
      }

      if (feeIdFilter) {
        matchesFee = s.fees?.some(f => String(f.feeId) === String(feeIdFilter));
      }

      return matchesSearch && matchesStatus && matchesFee;
    });
  }, [classStudents, searchStudent, statusFilter, feeIdFilter]);

  const filteredGlobalFees = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return fees;
    return fees.filter(f => {
      const fDate = new Date(f.lastDate);
      if (dateRange.start && dateRange.end) {
        return fDate >= new Date(dateRange.start) && fDate <= new Date(dateRange.end);
      } else if (dateRange.start) {
        return fDate >= new Date(dateRange.start);
      } else if (dateRange.end) {
        return fDate <= new Date(dateRange.end);
      }
      return true;
    });
  }, [fees, dateRange]);

  // --- Handlers ---
  const handleOpenFeeModal = (fee = null) => {
    if (fee) {
      setEditingFeeId(fee.id);
      setFeeForm({ title: fee.title, totalAmount: fee.totalAmount, lastDate: fee.lastDate, studentId: fee.studentId || [] });
    } else {
      setEditingFeeId(null);
      setFeeForm({ title: "", totalAmount: "", lastDate: "", studentId: [] });
    }
    setIsFeeModalOpen(true);
  };

  const handleSaveFee = async (e) => {
    e.preventDefault();
    try {
      if (editingFeeId) {
        await api.put(`/fees/updateFee/${editingFeeId}`, { data: feeForm });
        toast.success("Fee updated");
      } else {
        await api.post("/user/createFees", { data: feeForm });
        toast.success("Fee created");
      }
      setIsFeeModalOpen(false);
      dispatch(fetchFees());
    } catch (err) {
      toast.error("Operation failed");
    }
  };

  const handleDeleteFee = async (id) => {
    if (window.confirm("Delete this fee?")) {
      try {
        await api.delete(`/fees/deleteFee/${id}`);
        toast.success("Deleted successfully");
        dispatch(fetchFees());
      } catch (err) {
        toast.error("Delete failed");
      }
    }
  };

  const handleOpenAssign = () => {
    if (!selectedClass) return toast.error("Select a class first");
    setFeeForm({ title: "", totalAmount: "", lastDate: "", studentId: selectedClass.student || [] });
    setIsAssignModalOpen(false);
    setIsFeeModalOpen(true);
  };

  const handleUpdateStudentFee = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/user/submitFees/${selectedStudentForFee.studentId}/${selectedStudentForFee.feeId}`, { 
        data: updateForm 
      });
      toast.success("Student fee updated");
      setIsUpdateModalOpen(false);
      dispatch(fetchUsers()); // Student fee statuses are inside the user object
    } catch (err) {
      toast.error("Failed to update student fee");
    }
  };

  // --- Helpers ---
  const getFeeName = (id) => fees.find((f) => f.id === id)?.title || "Unknown Fee";
  const getFeeAmount = (id) => fees.find((f) => f.id === id)?.totalAmount || 0;

  const exportColumnsList = useMemo(() => {
    if (viewMode === "class") {
      return [
        { key: "name", label: "Student Name" },
        { key: "class", label: "Class" },
        { key: "fees", label: "Assigned Fees" }
      ];
    } else {
      return [
        { key: "title", label: "Fee Title" },
        { key: "totalAmount", label: "Total Amount" },
        { key: "lastDate", label: "Last Date" },
        { key: "status", label: "Status" }
      ];
    }
  }, [viewMode]);

  const handleExportExcel = (selectedKeys) => {
    let dataToExport = [];
    if (viewMode === "class") {
      dataToExport = filteredStudents.map(s => {
        let feesStr = "None";
        if (s.fees && s.fees.length > 0) {
          feesStr = s.fees.map(f => `${getFeeName(f.feeId)} (${f.status})`).join(", ");
        }
        const row = {};
        const addIfSelected = (key, val) => {
           if (!selectedKeys || selectedKeys.includes(key)) {
             const label = exportColumnsList.find(c => c.key === key)?.label;
             if (label) row[label] = val;
           }
        };
        addIfSelected("name", s.name);
        addIfSelected("class", selectedClass ? `${selectedClass.className} - ${selectedClass.section}` : "N/A");
        addIfSelected("fees", feesStr);
        return row;
      });
      exportToExcel(dataToExport, "Class_Fees_Report");
    } else {
      dataToExport = filteredGlobalFees.map(f => {
        const row = {};
        const addIfSelected = (key, val) => {
           if (!selectedKeys || selectedKeys.includes(key)) {
             const label = exportColumnsList.find(c => c.key === key)?.label;
             if (label) row[label] = val;
           }
        };
        addIfSelected("title", f.title);
        addIfSelected("totalAmount", f.totalAmount);
        addIfSelected("lastDate", f.lastDate);
        addIfSelected("status", new Date(f.lastDate) < new Date() ? "Overdue" : "Active");
        return row;
      });
      exportToExcel(dataToExport, "Global_Fees_Report");
    }
    toast.success("Excel downloaded");
  };

  const handleExportPDF = (selectedKeys) => {
    const activeColumns = exportColumnsList.filter(c => !selectedKeys || selectedKeys.includes(c.key));
    const columnLabels = activeColumns.map(c => c.label);

    let dataToExport = [];
    if (viewMode === "class") {
      dataToExport = filteredStudents.map(s => {
        let feesStr = "None";
        if (s.fees && s.fees.length > 0) {
          feesStr = s.fees.map(f => `${getFeeName(f.feeId)} (${f.status})`).join(", ");
        }
        const row = [];
        const addIfSelected = (key, val) => {
           if (!selectedKeys || selectedKeys.includes(key)) row.push(val);
        };
        addIfSelected("name", s.name);
        addIfSelected("class", selectedClass ? `${selectedClass.className} - ${selectedClass.section}` : "N/A");
        addIfSelected("fees", feesStr);
        return row;
      });
      exportToPDF(columnLabels, dataToExport, "Class_Fees_Report", "Class Fees Report");
    } else {
      dataToExport = filteredGlobalFees.map(f => {
        const row = [];
        const addIfSelected = (key, val) => {
           if (!selectedKeys || selectedKeys.includes(key)) row.push(val);
        };
        addIfSelected("title", f.title);
        addIfSelected("totalAmount", f.totalAmount);
        addIfSelected("lastDate", f.lastDate);
        addIfSelected("status", new Date(f.lastDate) < new Date() ? "Overdue" : "Active");
        return row;
      });
      exportToPDF(columnLabels, dataToExport, "Global_Fees_Report", "Global Fees Report");
    }
    toast.success("PDF downloaded");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Fee Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage global fee structures and student payments</p>
        </div>
        
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: "8px", padding: "4px" }}>
            <button onClick={() => setViewMode("class")} className={`btn ${viewMode === "class" ? "btn-primary" : "btn-ghost"}`} style={{ padding: "6px 12px" }}>Class View</button>
            <button onClick={() => setViewMode("all")} className={`btn ${viewMode === "all" ? "btn-primary" : "btn-ghost"}`} style={{ padding: "6px 12px" }}>All Global Fees</button>
          </div>
          <button onClick={() => setIsAssignModalOpen(true)} className="btn btn-primary">
            <Plus size={18} /> Create Fee
          </button>
        </div>
      </div>

      {viewMode === "class" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <TableFilterHeader
            searchQuery={searchStudent}
            setSearchQuery={setSearchStudent}
            searchPlaceholder="Search student..."
            exportColumns={exportColumnsList}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            filters={[
              {
                label: "All Classes",
                value: selectedClassId,
                onChange: setSelectedClassId,
                options: classes.map(c => ({ value: c.id, label: `${c.className} - ${c.section}` }))
              },
              {
                label: "All Fees",
                value: feeIdFilter,
                onChange: setFeeIdFilter,
                options: fees.map(f => ({ value: String(f.id), label: f.title }))
              },
              {
                label: "All Statuses",
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: "paid", label: "Paid" },
                  { value: "partial", label: "Partial" },
                  { value: "pending", label: "Pending" },
                  { value: "none", label: "No Fees" }
                ]
              }
            ]}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1.5rem" }}>
            {filteredStudents.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No students found in this class.</div>
            ) : (
              filteredStudents.map(student => (
                <div key={student.id} className="glass-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--glass-border)", paddingBottom: "1rem", marginBottom: "1rem" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.2)", color: "#93c5fd", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>{student.name}</h3>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>ID: {student.id}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {(!student.fees || student.fees.length === 0) ? (
                      <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No fees assigned.</p>
                    ) : (
                      student.fees.map(fee => (
                        <div key={fee.feeId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "rgba(0,0,0,0.02)", borderRadius: "8px" }}>
                          <div>
                            <div style={{ fontWeight: "500" }}>{getFeeName(fee.feeId)}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>₹{fee.paidAmount || 0} / ₹{getFeeAmount(fee.feeId)} Paid</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ 
                              padding: "4px 8px", borderRadius: "12px", fontSize: "12px", textTransform: "capitalize",
                              background: fee.status === "paid" ? "rgba(16, 185, 129, 0.2)" : fee.status === "partial" ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)",
                              color: fee.status === "paid" ? "#6ee7b7" : fee.status === "partial" ? "#fcd34d" : "#fca5a5"
                            }}>
                              {fee.status}
                            </span>
                            <button onClick={() => {
                              setSelectedStudentForFee({ studentId: student.id, feeId: fee.feeId });
                              setUpdateForm({ status: fee.status, paidAmount: fee.paidAmount || 0 });
                              setIsUpdateModalOpen(true);
                            }} className="btn-ghost" style={{ padding: "4px", color: "#93c5fd" }}>
                              <Edit size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <TableFilterHeader
            exportColumns={exportColumnsList}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
          >
            <DateRangePicker onRangeChange={setDateRange} />
          </TableFilterHeader>
          {loadingFees ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>Loading...</div>
          ) : filteredGlobalFees.length === 0 ? (
            <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
              No global fees found.
            </div>
          ) : (
            filteredGlobalFees.map(fee => {
              const isOverdue = new Date(fee.lastDate) < new Date();
              return (
                <div key={fee.id} className="glass-panel" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "4px" }}>{fee.title}</h3>
                    <div style={{ display: "flex", gap: "1.5rem", fontSize: "14px", color: "var(--text-secondary)", alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#a78bfa" }}><IndianRupee size={14} /> {fee.totalAmount}</span>
                      <span>📅 {fee.lastDate}</span>
                      <span style={{ 
                        padding: "2px 8px", borderRadius: "12px", fontSize: "12px",
                        background: isOverdue ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                        color: isOverdue ? "#fca5a5" : "#6ee7b7"
                      }}>
                        {isOverdue ? "Overdue" : "Active"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => handleOpenFeeModal(fee)} className="btn btn-ghost" style={{ padding: "8px" }}><Edit size={18} /></button>
                    <button onClick={() => handleDeleteFee(fee.id)} className="btn btn-ghost" style={{ padding: "8px", color: "#ef4444" }}><Trash2 size={18} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Creation Modal */}
      {isFeeModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setIsFeeModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "500px", padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>{editingFeeId ? "Edit Fee" : "Create New Fee"}</h2>
            <form onSubmit={handleSaveFee} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div><label>Fee Title</label><input required className="input-glass" value={feeForm.title} onChange={e => setFeeForm({...feeForm, title: e.target.value})} /></div>
              <div><label>Total Amount (₹)</label><input required type="number" className="input-glass" value={feeForm.totalAmount} onChange={e => setFeeForm({...feeForm, totalAmount: e.target.value})} /></div>
              <div><label>Last Date</label><input required type="date" className="input-glass" value={feeForm.lastDate} onChange={e => setFeeForm({...feeForm, lastDate: e.target.value})} /></div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setIsFeeModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Fee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Wizard Modal */}
      {isAssignModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setIsAssignModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "450px", padding: "2rem", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "rgba(99, 102, 241, 0.2)", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", color: "#818cf8" }}><Users size={32} /></div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>Assign Fee To Class</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>You are about to assign a new fee to all {classStudents.length} students in Class {selectedClass?.className}-{selectedClass?.section}.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button onClick={handleOpenAssign} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Proceed to Fee Details</button>
              <button onClick={() => setIsAssignModalOpen(false)} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Update Student Fee Status */}
      {isUpdateModalOpen && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setIsUpdateModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Update Payment</h2>
            <form onSubmit={handleUpdateStudentFee} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label>Status</label>
                <select className="input-glass" style={{ appearance: "none" }} value={updateForm.status} onChange={e => setUpdateForm({...updateForm, status: e.target.value})}>
                  <option value="pending" style={{ color: "black" }}>Pending</option>
                  <option value="partial" style={{ color: "black" }}>Partial</option>
                  <option value="paid" style={{ color: "black" }}>Paid</option>
                </select>
              </div>
              <div>
                <label>Paid Amount (₹)</label>
                <input type="number" className="input-glass" value={updateForm.paidAmount} onChange={e => setUpdateForm({...updateForm, paidAmount: e.target.value})} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setIsUpdateModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeManagement;
