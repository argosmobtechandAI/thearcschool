import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses, fetchInfo } from "../features/dataSlice";
import { 
    uploadFile, updateSettings, 
    addChampion, updateChampion, deleteChampion, 
    addGalleryImage, deleteGalleryImage, 
    addNewsletter, deleteNewsletter 
} from "../services/api";
import { toast } from "react-toastify";
import { Link2, Trophy, Image as ImageIcon, FileText, Plus, Trash2, Edit, CheckCircle } from "lucide-react";

const SchoolInfo = () => {
    const { infoSettings, infoChampions, infoGallery, infoNewsletters, users, classes } = useSelector((state) => state.data);
    const dispatch = useDispatch();

    const [modal, setModal] = useState(null);
    const [editId, setEditId] = useState(null); 
    const [social, setNewSocial] = useState({ instagram_url: "", whatsapp_url: "", linkedin_url: "", twitter_url: "", late_fee_penalty: 10 });
    const [champ, setNewChamp] = useState({ student_id: "", game_name: "", achievement_level: "", marks_score: "" });
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!users || users.length === 0) dispatch(fetchUsers());
        if (!infoSettings && !infoChampions?.length) dispatch(fetchInfo());
        if (!classes || classes.length === 0) dispatch(fetchClasses());
    }, [dispatch]);

    const students = useMemo(() => users?.filter((user) => user.type === "student") || [], [users]);

    const showToast = (message, type = "success") => {
        if (type === "success") toast.success(message);
        else toast.error(message);
    };

    const handleFileUpload = async (fileUpload, bucket = "school") => {
        if (!fileUpload) return null;
        try {
            const url = await uploadFile(fileUpload, bucket);
            return url;
        } catch (err) {
            console.error("Upload failed", err);
            showToast("Failed to upload file", "error");
            return null;
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;
        try {
            let res;
            if (type === 'champion') res = await deleteChampion(id);
            else if (type === 'gallery') res = await deleteGalleryImage(id);
            else if (type === 'newsletter') res = await deleteNewsletter(id);
            
            showToast(res.data?.message || "Deleted successfully", "success");
            dispatch(fetchInfo());
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to delete", "error");
        }
    };

    const handleSaveSocial = async () => {
        try {
            const res = await updateSettings(social);
            showToast(res.data?.message || "Settings updated", "success");
            dispatch(fetchInfo());
            setModal(null);
        } catch (error) {
            showToast(error.response?.data?.message || "Error saving settings", "error");
        }
    };

    const handleSaveChamp = async () => {
        try {
            let res;
            if (editId) res = await updateChampion(editId, champ);
            else res = await addChampion(champ);
            showToast(res.data?.message || "Champion saved", "success");
            dispatch(fetchInfo());
            setModal(null);
            setEditId(null);
        } catch (error) {
            showToast(error.response?.data?.message || "Error saving champion", "error");
        }
    };

    const handleUploadGallery = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = await handleFileUpload(file);
        if (!url) return;
        try {
            const res = await addGalleryImage({ image_url: url });
            showToast(res.data?.message || "Image added", "success");
            dispatch(fetchInfo());
        } catch (error) {
            showToast(error.response?.data?.message || "Error saving image", "error");
        }
    };

    const handleUploadNews = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = await handleFileUpload(file);
        if (!url) return;
        try {
            const res = await addNewsletter({ document_url: url });
            showToast(res.data?.message || "Newsletter added", "success");
            dispatch(fetchInfo());
        } catch (error) {
            showToast(error.response?.data?.message || "Error saving newsletter", "error");
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div>
                <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "0.5rem" }}>School Information Manager</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Manage social links, outstanding students, gallery, and newsletters.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "2rem" }}>
                {/* SOCIAL MEDIA */}
                <section className="glass-panel" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ padding: "0.5rem", background: "rgba(236, 72, 153, 0.1)", color: "#ec4899", borderRadius: "12px" }}><Link2 size={20} /></div>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)" }}>General Settings</h2>
                        </div>
                        <button onClick={() => { 
                            setModal("social"); 
                            setNewSocial(infoSettings || { instagram_url: "", whatsapp_url: "", linkedin_url: "", twitter_url: "", late_fee_penalty: 10 }); 
                        }} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", padding: "0.5rem 1rem" }}>
                            <Edit size={16} /> Edit Settings
                        </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {infoSettings ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", padding: "1rem", background: "var(--bg-secondary)", border: "1px solid var(--glass-border)", borderRadius: "12px" }}>
                                {infoSettings.instagram_url && <a href={infoSettings.instagram_url} target="_blank" rel="noreferrer" style={{ padding: "0.25rem 0.75rem", background: "rgba(236, 72, 153, 0.1)", color: "#ec4899", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>Instagram</a>}
                                {infoSettings.whatsapp_url && <a href={infoSettings.whatsapp_url} target="_blank" rel="noreferrer" style={{ padding: "0.25rem 0.75rem", background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>WhatsApp</a>}
                                {infoSettings.linkedin_url && <a href={infoSettings.linkedin_url} target="_blank" rel="noreferrer" style={{ padding: "0.25rem 0.75rem", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>LinkedIn</a>}
                                {infoSettings.twitter_url && <a href={infoSettings.twitter_url} target="_blank" rel="noreferrer" style={{ padding: "0.25rem 0.75rem", background: "rgba(14, 165, 233, 0.1)", color: "#0ea5e9", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>Twitter</a>}
                            </div>
                        ) : (
                            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", padding: "1rem", textAlign: "center", border: "1px dashed var(--glass-border)", borderRadius: "12px" }}>No social links added yet.</p>
                        )}
                    </div>
                </section>

                {/* CHAMPION STUDENTS */}
                <section className="glass-panel" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ padding: "0.5rem", background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", borderRadius: "12px" }}><Trophy size={20} /></div>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)" }}>Champion Students</h2>
                        </div>
                        <button onClick={() => { setModal("champ"); setEditId(null); setNewChamp({ student_id: "", game_name: "", achievement_level: "", marks_score: "" }); }} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", padding: "0.5rem 1rem" }}>
                            <Plus size={16} /> Add Champion
                        </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {infoChampions?.length > 0 ? infoChampions.map((champItem) => {
                            const student = users?.find((c) => c.id === champItem.student_id);
                            return (
                                <div key={champItem.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "var(--bg-secondary)", border: "1px solid var(--glass-border)", borderRadius: "12px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                        <div style={{ width: "40px", height: "40px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#f59e0b" }}>{student?.name?.charAt(0) || "U"}</div>
                                        <div>
                                            <p style={{ fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>{student?.name || "Unknown Student"}</p>
                                            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", background: "var(--bg-primary)", padding: "0.25rem 0.5rem", borderRadius: "6px", display: "inline-block" }}>{champItem.game_name} • <span style={{ color: "#f59e0b" }}>{champItem.marks_score}</span></p>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button onClick={() => { setModal("champ"); setEditId(champItem.id); setNewChamp(champItem); }} style={{ padding: "0.5rem", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer", borderRadius: "8px" }}><Edit size={16} /></button>
                                        <button onClick={() => handleDelete('champion', champItem.id)} style={{ padding: "0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", border: "none", cursor: "pointer", borderRadius: "8px" }}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", padding: "1rem", textAlign: "center", border: "1px dashed var(--glass-border)", borderRadius: "12px" }}>No champions recorded yet.</p>
                        )}
                    </div>
                </section>
            </div>

            {/* GALLERY */}
            <section className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ padding: "0.5rem", background: "rgba(99, 102, 241, 0.1)", color: "#6366f1", borderRadius: "12px" }}><ImageIcon size={20} /></div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)" }}>School Gallery</h2>
                    </div>
                    <div>
                        <input type="file" id="galUploadDirect" accept="image/*" style={{ display: "none" }} onChange={handleUploadGallery} />
                        <label htmlFor="galUploadDirect" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", padding: "0.5rem 1rem", cursor: "pointer" }}>
                            <Plus size={16} /> Upload Media
                        </label>
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
                    {infoGallery?.length > 0 && infoGallery.map((glry) => (
                        <div key={glry.id} style={{ position: "relative", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--glass-border)", background: "var(--bg-primary)", aspectRatio: "1/1" }}>
                            <img src={glry.image_url} alt="Gallery" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem" }}>
                                <button onClick={() => handleDelete('gallery', glry.id)} style={{ background: "#ef4444", color: "white", padding: "0.5rem", borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                {(!infoGallery || infoGallery.length === 0) && <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", padding: "2rem", textAlign: "center", border: "1px dashed var(--glass-border)", borderRadius: "12px" }}>No images in gallery.</p>}
            </section>

            {/* NEWSLETTER */}
            <section className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ padding: "0.5rem", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: "12px" }}><FileText size={20} /></div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)" }}>Newsletters</h2>
                    </div>
                    <div>
                        <input type="file" id="newsUploadDirect" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={handleUploadNews} />
                        <label htmlFor="newsUploadDirect" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", padding: "0.5rem 1rem", cursor: "pointer" }}>
                            <Plus size={16} /> Upload Newsletter
                        </label>
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
                    {infoNewsletters?.length > 0 && infoNewsletters.map((n, index) => (
                        <div key={n.id} style={{ display: "flex", alignItems: "center", gap: "1rem", border: "1px solid var(--glass-border)", background: "var(--bg-secondary)", borderRadius: "12px", padding: "1rem" }}>
                            <div style={{ width: "48px", height: "48px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                                <FileText size={24} />
                            </div>
                            <div style={{ flex: 1, overflow: "hidden" }}>
                                <a href={n.document_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-primary)", textDecoration: "none", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    Newsletter Document
                                </a>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>PDF / DOC</p>
                            </div>
                            <button onClick={() => handleDelete('newsletter', n.id)} style={{ padding: "0.5rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", border: "none", cursor: "pointer", borderRadius: "8px" }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
                {(!infoNewsletters || infoNewsletters.length === 0) && <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", padding: "2rem", textAlign: "center", border: "1px dashed var(--glass-border)", borderRadius: "12px" }}>No newsletters uploaded.</p>}
            </section>

            {/* MODALS */}
            {modal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)" }} onClick={() => setModal(null)}>
                    <div style={{ background: "var(--bg-secondary)", borderRadius: "16px", width: "100%", maxWidth: "500px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", border: "1px solid var(--glass-border)" }} onClick={e => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-primary)" }}>
                            <h3 style={{ fontSize: "1.125rem", fontWeight: "700", color: "var(--text-primary)" }}>
                                {modal === 'social' ? 'General Settings' : 'Champion Student'}
                            </h3>
                            <button onClick={() => { setModal(null); }} style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "var(--text-secondary)" }}>✕</button>
                        </div>

                        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {/* SOCIAL & SETTINGS MODAL */}
                            {modal === "social" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <div>
                                        <label style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.5rem", display: "block" }}>Late Fee Penalty (₹ per day)</label>
                                        <input type="number" min="0" placeholder="e.g. 10" value={social?.late_fee_penalty || 0} onChange={(e) => setNewSocial({ ...social, late_fee_penalty: Number(e.target.value) })} style={{ width: "100%", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.75rem", outline: "none", fontSize: "0.875rem", background: "var(--bg-primary)", color: "var(--text-primary)" }} />
                                    </div>
                                    <hr style={{ border: "none", borderTop: "1px solid var(--glass-border)", margin: "0.5rem 0" }} />
                                    {[{ name: "Instagram", variable: "instagram_url", color: "#ec4899" }, { name: "Whatsapp", variable: "whatsapp_url", color: "#22c55e" }, { name: "Linkedin", variable: "linkedin_url", color: "#3b82f6" }, { name: "Twitter", variable: "twitter_url", color: "#0ea5e9" }].map((item) => (
                                        <div key={item.variable}>
                                            <label style={{ fontSize: "0.875rem", fontWeight: "700", color: item.color, marginBottom: "0.5rem", display: "block" }}>{item.name}</label>
                                            <input type="url" placeholder={`https://${item.name.toLowerCase()}.com/...`} value={social?.[item.variable] || ""} onChange={(e) => setNewSocial({ ...social, [item.variable]: e.target.value })} style={{ width: "100%", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.75rem", outline: "none", fontSize: "0.875rem", background: "var(--bg-primary)", color: "var(--text-primary)" }} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* CHAMPION MODAL */}
                            {modal === "champ" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                                    <div>
                                        <label style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.5rem", display: "block" }}>Search Student</label>
                                        <input placeholder="Search by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.75rem", outline: "none", fontSize: "0.875rem", background: "var(--bg-primary)", color: "var(--text-primary)" }} />
                                    </div>
                                    <div style={{ border: "1px solid var(--glass-border)", borderRadius: "8px", maxHeight: "200px", overflowY: "auto", background: "var(--bg-primary)" }}>
                                        {students?.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((stud) => {
                                            const classe = classes?.find((c) => c.id == stud.classes?.[0]);
                                            const isSelected = champ?.student_id == stud.id;
                                            return (
                                                <div key={stud.id} onClick={() => setNewChamp({ ...champ, student_id: stud.id })} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", cursor: "pointer", borderBottom: "1px solid var(--glass-border)", background: isSelected ? "var(--accent-light)" : "transparent" }}>
                                                    <div>
                                                        <p style={{ fontSize: "0.875rem", fontWeight: isSelected ? "700" : "500", color: isSelected ? "var(--accent-primary)" : "var(--text-primary)" }}>{stud.name}</p>
                                                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{classe ? `Class ${classe.className}-${classe.section}` : "No Class"}</p>
                                                    </div>
                                                    {isSelected && <span style={{ color: "var(--accent-primary)" }}><CheckCircle size={18} /></span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div>
                                        <label style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.5rem", display: "block" }}>Achievement / Game Name</label>
                                        <input placeholder="e.g. 100m Sprint" value={champ?.game_name || ""} onChange={(e) => setNewChamp({ ...champ, game_name: e.target.value })} style={{ width: "100%", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.75rem", outline: "none", fontSize: "0.875rem", background: "var(--bg-primary)", color: "var(--text-primary)" }} />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                        <div>
                                            <label style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.5rem", display: "block" }}>Level</label>
                                            <input placeholder="State / National" value={champ?.achievement_level || ""} onChange={(e) => setNewChamp({ ...champ, achievement_level: e.target.value })} style={{ width: "100%", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.75rem", outline: "none", fontSize: "0.875rem", background: "var(--bg-primary)", color: "var(--text-primary)" }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.5rem", display: "block" }}>Score / Detail</label>
                                            <input placeholder="e.g. Gold Medal" value={champ?.marks_score || ""} onChange={(e) => setNewChamp({ ...champ, marks_score: e.target.value })} style={{ width: "100%", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.75rem", outline: "none", fontSize: "0.875rem", background: "var(--bg-primary)", color: "var(--text-primary)" }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div style={{ padding: "1rem 1.5rem", background: "var(--bg-primary)", borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button onClick={() => { setModal(null); }} className="btn btn-ghost" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>Cancel</button>
                            <button onClick={modal === 'social' ? handleSaveSocial : handleSaveChamp} className="btn btn-primary" style={{ padding: "0.5rem 1.5rem", fontSize: "0.875rem" }}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchoolInfo;
