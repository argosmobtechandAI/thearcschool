import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchUsers, fetchClasses, fetchInfo } from "../features/dataSlice";
import { 
    uploadFile, updateSettings, 
    addGalleryImage, deleteGalleryImage, 
    addNewsletter, deleteNewsletter 
} from "../services/api";
import { toast } from "react-toastify";
import { Link2, Trophy, Image as ImageIcon, FileText, Plus, Trash2, Edit, CheckCircle } from "lucide-react";

const SchoolInfo = () => {
    const { infoSettings, infoGallery, infoNewsletters, users, classes } = useSelector((state) => state.data);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [modal, setModal] = useState(null);
    const [social, setNewSocial] = useState({ instagram_url: "", whatsapp_url: "", linkedin_url: "", twitter_url: "", facebook_url: "", youtube_url: "", website_url: "", late_fee_penalty: 10 });

    useEffect(() => {
        if (!users || users.length === 0) dispatch(fetchUsers());
        if (!infoSettings) dispatch(fetchInfo());
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
            if (type === 'gallery') res = await deleteGalleryImage(id);
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
                            setNewSocial(infoSettings || { instagram_url: "", whatsapp_url: "", linkedin_url: "", twitter_url: "", facebook_url: "", youtube_url: "", website_url: "", late_fee_penalty: 10 }); 
                        }} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", padding: "0.5rem 1rem" }}>
                            <Edit size={16} /> Edit Settings
                        </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {infoSettings ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", padding: "1rem", background: "var(--bg-secondary)", border: "1px solid var(--glass-border)", borderRadius: "12px" }}>
                                {infoSettings.facebook_url && <a href={infoSettings.facebook_url} target="_blank" rel="noreferrer" style={{ padding: "0.25rem 0.75rem", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>Facebook</a>}
                                {infoSettings.instagram_url && <a href={infoSettings.instagram_url} target="_blank" rel="noreferrer" style={{ padding: "0.25rem 0.75rem", background: "rgba(236, 72, 153, 0.1)", color: "#ec4899", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>Instagram</a>}
                                {infoSettings.whatsapp_url && <a href={infoSettings.whatsapp_url} target="_blank" rel="noreferrer" style={{ padding: "0.25rem 0.75rem", background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>WhatsApp</a>}
                                {infoSettings.linkedin_url && <a href={infoSettings.linkedin_url} target="_blank" rel="noreferrer" style={{ padding: "0.25rem 0.75rem", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>LinkedIn</a>}
                                {infoSettings.twitter_url && <a href={infoSettings.twitter_url} target="_blank" rel="noreferrer" style={{ padding: "0.25rem 0.75rem", background: "rgba(14, 165, 233, 0.1)", color: "#0ea5e9", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>Twitter</a>}
                                {infoSettings.youtube_url && <a href={infoSettings.youtube_url} target="_blank" rel="noreferrer" style={{ padding: "0.25rem 0.75rem", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>YouTube</a>}
                                {infoSettings.website_url && <a href={infoSettings.website_url} target="_blank" rel="noreferrer" style={{ padding: "0.25rem 0.75rem", background: "rgba(99, 102, 241, 0.1)", color: "#6366f1", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>Website</a>}
                            </div>
                        ) : (
                            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", padding: "1rem", textAlign: "center", border: "1px dashed var(--glass-border)", borderRadius: "12px" }}>No social links added yet.</p>
                        )}
                    </div>
                </section>


            </div>

            {/* GALLERY */}
            <section className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ padding: "0.5rem", background: "rgba(99, 102, 241, 0.1)", color: "#6366f1", borderRadius: "12px" }}><ImageIcon size={20} /></div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)" }}>School Gallery</h2>
                    </div>
                    <div>
                        <button onClick={() => navigate('/gallery')} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", padding: "0.5rem 1rem", cursor: "pointer" }}>
                            Manage Gallery
                        </button>
                    </div>
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "1rem", textAlign: "left" }}>
                    The school gallery is now managed centrally. Click the button above to go to the Gallery Management page.
                </p>
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
                                {modal === 'social' ? 'General Settings' : ''}
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
                                    {[{ name: "Facebook", variable: "facebook_url", color: "#3b82f6" }, { name: "Instagram", variable: "instagram_url", color: "#ec4899" }, { name: "Whatsapp", variable: "whatsapp_url", color: "#22c55e" }, { name: "Linkedin", variable: "linkedin_url", color: "#3b82f6" }, { name: "Twitter", variable: "twitter_url", color: "#0ea5e9" }, { name: "YouTube", variable: "youtube_url", color: "#ef4444" }, { name: "Website", variable: "website_url", color: "#6366f1" }].map((item) => (
                                        <div key={item.variable}>
                                            <label style={{ fontSize: "0.875rem", fontWeight: "700", color: item.color, marginBottom: "0.5rem", display: "block" }}>{item.name}</label>
                                            <input type="url" placeholder={`https://${item.name.toLowerCase()}.com/...`} value={social?.[item.variable] || ""} onChange={(e) => setNewSocial({ ...social, [item.variable]: e.target.value })} style={{ width: "100%", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.75rem", outline: "none", fontSize: "0.875rem", background: "var(--bg-primary)", color: "var(--text-primary)" }} />
                                        </div>
                                    ))}
                                </div>
                            )}


                        </div>

                        {/* Footer Action */}
                        <div style={{ padding: "1rem 1.5rem", background: "var(--bg-primary)", borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button onClick={() => { setModal(null); }} className="btn btn-ghost" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>Cancel</button>
                            <button onClick={modal === 'social' ? handleSaveSocial : null} className="btn btn-primary" style={{ padding: "0.5rem 1.5rem", fontSize: "0.875rem" }}>
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
