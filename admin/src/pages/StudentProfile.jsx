import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers } from "../features/dataSlice";
import { ArrowLeft, User, Phone, Mail, Calendar, BookOpen, GraduationCap, CreditCard, Activity, FileText } from "lucide-react";
import { toast } from "react-toastify";

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { users, classes, loadingUsers } = useSelector((state) => state.data);
  const student = useMemo(() => {
    return users.find(u => String(u.id) === String(id) && u.type === 'student') || null;
  }, [users, id]);

  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers());
  }, [dispatch, users.length]);

  const studentClass = useMemo(() => {
    if (!student || !student.classes || student.classes.length === 0) return null;
    return classes.find(c => c.id === student.classes[0]);
  }, [student, classes]);

  if (loadingUsers) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading profile...</div>;
  }

  if (!student && users.length > 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>Student Not Found</h2>
        <button onClick={() => navigate('/users/student')} className="btn btn-primary">Go Back</button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <User size={16} /> },
    { id: "academic", label: "Academic & Grades", icon: <GraduationCap size={16} /> },
    { id: "finance", label: "Fee Status", icon: <CreditCard size={16} /> },
    { id: "activity", label: "Activities & Remarks", icon: <Activity size={16} /> }
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => navigate('/users/student')} className="btn-ghost" style={{ padding: "0.5rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Student Profile</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Comprehensive view of student data</p>
        </div>
      </div>

      {student && (
        <>
          <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ width: "100px", height: "100px", borderRadius: "16px", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "3rem", fontWeight: "bold", boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.5)" }}>
              {student.name?.charAt(0)?.toUpperCase()}
            </div>
            
            <div style={{ flex: 1, minWidth: "250px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.25rem", color: "var(--text-primary)" }}>{student.name}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                    <span style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "600" }}>
                      Class: {studentClass ? `${studentClass.name} - ${studentClass.section}` : "Unassigned"}
                    </span>
                    <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "600" }}>
                      Status: {student.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn-ghost" style={{ padding: "0.5rem 1rem", border: "1px solid var(--glass-border)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                    <Mail size={16} /> Contact Parent
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Mail size={16} color="#64748b" /> {student.email}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Phone size={16} color="#64748b" /> {student.phone || "N/A"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><User size={16} color="#64748b" /> Father/Spouse: {student.father_name || "N/A"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><User size={16} color="#64748b" /> Mother: {student.mother_name || "N/A"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Calendar size={16} color="#64748b" /> DOB: {student.dob || "N/A"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><FileText size={16} color="#64748b" /> Admission No: {student.admission_number || "N/A"}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "1rem", overflowX: "auto" }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.25rem",
                  background: activeTab === tab.id ? "var(--accent-primary)" : "transparent",
                  color: activeTab === tab.id ? "white" : "var(--text-secondary)",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: activeTab === tab.id ? "600" : "500",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap"
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-content" style={{ minHeight: "400px" }}>
            {activeTab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Address & Details</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", color: "var(--text-secondary)" }}>
                    <div><strong style={{ color: "var(--text-primary)" }}>Residential Address:</strong><br/>{student.address || "No address on file."}</div>
                    <div><strong style={{ color: "var(--text-primary)" }}>Gender:</strong> {student.gender || "N/A"}</div>
                    <div><strong style={{ color: "var(--text-primary)" }}>House:</strong> {student.house || "N/A"}</div>
                    <div><strong style={{ color: "var(--text-primary)" }}>Admission Date:</strong> {student.admission_date || "N/A"}</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Documents & Certificates</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", color: "var(--text-secondary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Admission Form Submitted:</span>
                      <span style={{ color: student.form_submitted ? "#10b981" : "#ef4444", fontWeight: "600" }}>{student.form_submitted ? "Yes" : "No"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>TC Received:</span>
                      <span style={{ color: student.tc_received ? "#10b981" : "#ef4444", fontWeight: "600" }}>{student.tc_received ? `Yes (${student.tc_date})` : "No"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>SLC Received:</span>
                      <span style={{ color: student.slc_received ? "#10b981" : "#ef4444", fontWeight: "600" }}>{student.slc_received ? `Yes (${student.slc_date})` : "No"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Character Certificate:</span>
                      <span style={{ color: student.character_certificate_received ? "#10b981" : "#ef4444", fontWeight: "600" }}>{student.character_certificate_received ? `Yes (${student.character_certificate_date})` : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "academic" && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Academic Record</h3>
                {(!student.grade || student.grade.length === 0) ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                    <BookOpen size={48} style={{ opacity: 0.2, margin: "0 auto 1rem" }} />
                    <p>No grades recorded for this student yet.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {student.grade.map((g, idx) => (
                      <div key={idx} style={{ padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                        <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Exam ID: {g.exam_id}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Marks: {g.marks}</div>
                        {g.remarks && <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Remarks: {g.remarks}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "finance" && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Fee Status</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                  <div style={{ padding: "1rem", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "8px" }}>
                    <div style={{ color: "#3b82f6", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Monthly Fee</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700" }}>₹{student.monthly_fee || 0}</div>
                  </div>
                  <div style={{ padding: "1rem", background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "8px" }}>
                    <div style={{ color: "#a855f7", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Bus Fee</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700" }}>₹{student.bus_fee || 0}</div>
                  </div>
                  <div style={{ padding: "1rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px" }}>
                    <div style={{ color: "#10b981", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Total Monthly Obligation</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700" }}>₹{Number(student.monthly_fee || 0) + Number(student.bus_fee || 0)}</div>
                  </div>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Fee Exemption:</strong>
                    <span style={{ color: student.fee_exempted ? "#10b981" : "var(--text-secondary)", fontWeight: "600" }}>{student.fee_exempted ? "Yes (Exempted)" : "No"}</span>
                  </div>
                </div>

                <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Recent Transactions</h4>
                {(!student.fees || student.fees.length === 0) ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.1)", borderRadius: "8px" }}>
                    <p>No fee records found.</p>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                        <th style={{ padding: "0.5rem" }}>Receipt No</th>
                        <th style={{ padding: "0.5rem" }}>Amount</th>
                        <th style={{ padding: "0.5rem" }}>Status</th>
                        <th style={{ padding: "0.5rem" }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.fees.map((fee, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                          <td style={{ padding: "0.5rem" }}>{fee.fee?.receipt_number || "N/A"}</td>
                          <td style={{ padding: "0.5rem" }}>₹{fee.amount}</td>
                          <td style={{ padding: "0.5rem" }}>
                            <span style={{ color: fee.status === 'paid' ? '#10b981' : '#f59e0b', background: fee.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600" }}>
                              {fee.status}
                            </span>
                          </td>
                          <td style={{ padding: "0.5rem" }}>{fee.created_at ? new Date(fee.created_at).toLocaleDateString() : "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>Discipline & Remarks</h3>
                {(!student.activity || student.activity.length === 0) ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                    <Activity size={48} style={{ opacity: 0.2, margin: "0 auto 1rem" }} />
                    <p>No activities or remarks recorded for this student.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {student.activity.map((act, idx) => (
                      <div key={idx} style={{ padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px", borderLeft: "4px solid #a855f7" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: "600" }}>{act.type}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{new Date(act.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{act.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentProfile;
