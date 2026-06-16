import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, fetchClasses, fetchInfo } from "../features/dataSlice";
import api, { uploadFile } from "../services/api";
import { toast } from "react-toastify";
import { Link2, Trophy, Image as ImageIcon, FileText, Plus, Trash2, Edit, CheckCircle } from "lucide-react";

const SchoolInfo = () => {
    const { info, users, classes } = useSelector((state) => state.data);
    const dispatch = useDispatch();

    const [modal, setModal] = useState(null);
    const [social, setNewSocial] = useState({ insta: "", whatsapp: "", linkedin: "", twitter: "" });
    const [news, setNewNews] = useState([]);
    const [champ, setNewChamp] = useState({ studentId: "", gameName: "", type: "", marks: "" });
    const [gallery, setNewGallery] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!users || users.length === 0) dispatch(fetchUsers());
        if (!info || info.length === 0) dispatch(fetchInfo());
        if (!classes || classes.length === 0) dispatch(fetchClasses());
    }, [dispatch]);

    const students = useMemo(() => users?.filter((user) => user.type === "student") || [], [users]);

    const showToast = (message, type = "success") => {
        if (type === "success") toast.success(message);
        else toast.error(message);
    };

    const handleSubmit = async (submitData) => {
        try {
            const { id, ...data } = submitData;
            let res;
            if (id) {
                res = await api.updateInfo(submitData);
            } else {
                res = await api.createInfo(data);
            }
            showToast(res.data?.message || "Success", "success");
            dispatch(fetchInfo());
            setModal(null);
            setNewChamp({ studentId: "", gameName: "", type: "", marks: "" });
            setNewGallery([]);
            setNewNews([]);
            setNewSocial({ insta: "", whatsapp: "", linkedin: "", twitter: "" });
        } catch (error) {
            showToast(error.response?.data?.message || "An error occurred", "error");
        }
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

    const deleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;
        try {
            const res = await api.deleteInfo(id);
            showToast(res.data?.message || "Deleted successfully", "success");
            dispatch(fetchInfo());
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to delete", "error");
        }
    };

    return (
        <div className="space-y-8">

            <div>
                <h1 className="text-2xl font-bold text-slate-900">School Information Manager</h1>
                <p className="text-slate-600 text-sm">Manage social links, outstanding students, gallery, and newsletters.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* SOCIAL MEDIA */}
                <section className="bg-white/80 backdrop-blur-md shadow-sm rounded-2xl p-6 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-pink-100 text-pink-600 rounded-xl"><Link2 size={20} /></div>
                            <h2 className="text-lg font-bold text-slate-800">Social Media</h2>
                        </div>
                        <button onClick={() => setModal("social")} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <Plus size={16} /> Add Links
                        </button>
                    </div>
                    <div className="space-y-3">
                        {info?.map((item) => {
                            if (!item?.social || Array.isArray(item.social)) return null;
                            return (
                                <div key={item.id} className="flex flex-col sm:flex-row justify-between sm:items-center border border-slate-200 bg-white rounded-xl p-4 hover:shadow-md transition-shadow gap-4">
                                    <div className="flex flex-wrap gap-3 text-sm">
                                        {item.social?.insta && <a href={item.social.insta} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-pink-50 text-pink-700 rounded-lg font-medium hover:bg-pink-100 transition-colors">Instagram</a>}
                                        {item.social?.whatsapp && <a href={item.social.whatsapp} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors">WhatsApp</a>}
                                        {item.social?.linkedin && <a href={item.social.linkedin} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors">LinkedIn</a>}
                                        {item.social?.twitter && <a href={item.social.twitter} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg font-medium hover:bg-sky-100 transition-colors">Twitter</a>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setModal("social"); setNewSocial(item.social); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                                        <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            );
                        })}
                        {info?.filter(i => i.social && !Array.isArray(i.social)).length === 0 && <p className="text-sm text-slate-400 p-4 text-center border border-dashed rounded-xl">No social links added yet.</p>}
                    </div>
                </section>

                {/* CHAMPION STUDENTS */}
                <section className="bg-white/80 backdrop-blur-md shadow-sm rounded-2xl p-6 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><Trophy size={20} /></div>
                            <h2 className="text-lg font-bold text-slate-800">Champion Students</h2>
                        </div>
                        <button onClick={() => setModal("champ")} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                            <Plus size={16} /> Add Champion
                        </button>
                    </div>
                    <div className="space-y-3">
                        {info?.map((item) => {
                            if (!item?.champ || Array.isArray(item.champ)) return null;
                            const student = users?.find((c) => c.id === item.champ?.studentId);
                            return (
                                <div key={item.id} className="flex justify-between items-center border border-slate-200 bg-white rounded-xl p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center font-bold text-amber-600 border border-amber-100">{student?.name?.charAt(0) || "U"}</div>
                                        <div>
                                            <p className="font-bold text-slate-900">{student?.name || "Unknown Student"}</p>
                                            <p className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-1 inline-block">{item.champ?.gameName} • <span className="text-amber-600">{item.champ?.marks} Marks</span></p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setModal("champ"); setNewChamp(item.champ); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                                        <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            );
                        })}
                        {info?.filter(i => i.champ && !Array.isArray(i.champ)).length === 0 && <p className="text-sm text-slate-400 p-4 text-center border border-dashed rounded-xl">No champions recorded yet.</p>}
                    </div>
                </section>
            </div>

            {/* GALLERY */}
            <section className="bg-white/80 backdrop-blur-md shadow-sm rounded-2xl p-6 border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl"><ImageIcon size={20} /></div>
                        <h2 className="text-lg font-bold text-slate-800">School Gallery</h2>
                    </div>
                    <button onClick={() => setModal("gallery")} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                        <Plus size={16} /> Upload Media
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {info?.map((item) =>
                        item?.gallery?.length > 0 ? item.gallery.map((glry, ind) => (
                            <div key={`${item.id}-${ind}`} className="relative rounded-xl overflow-hidden border border-slate-200 group shadow-sm bg-slate-100 aspect-square">
                                <img src={glry?.url} alt="Gallery" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={() => {
                                        const remaining = item.gallery.filter((e) => e.url !== glry?.url);
                                        handleSubmit({ ...item, gallery: remaining });
                                    }} className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        )) : null
                    )}
                </div>
                {!info?.some(i => i.gallery?.length > 0) && <p className="text-sm text-slate-400 p-8 text-center border border-dashed rounded-xl">No images in gallery.</p>}
            </section>

            {/* NEWSLETTER */}
            <section className="bg-white/80 backdrop-blur-md shadow-sm rounded-2xl p-6 border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl"><FileText size={20} /></div>
                        <h2 className="text-lg font-bold text-slate-800">Newsletters</h2>
                    </div>
                    <button onClick={() => setModal("news")} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                        <Plus size={16} /> Upload Newsletter
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {info?.map((item) =>
                        item?.news?.length > 0 ? item.news.map((news, index) => (
                            <div key={`${item.id}-${index}`} className="flex items-center gap-4 border border-slate-200 bg-white rounded-xl p-4 hover:shadow-md transition-shadow group">
                                <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <a href={news?.letter} target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-800 hover:text-emerald-600 truncate block transition-colors">
                                        Newsletter Document {index + 1}
                                    </a>
                                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">PDF / DOC</p>
                                </div>
                                <button onClick={() => {
                                    const remaining = item.news.filter((e) => e.letter !== news?.letter);
                                    handleSubmit({ ...item, news: remaining });
                                }} className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )) : null
                    )}
                </div>
                {!info?.some(i => i.news?.length > 0) && <p className="text-sm text-slate-400 p-8 text-center border border-dashed rounded-xl">No newsletters uploaded.</p>}
            </section>

            {/* MODALS */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setModal(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">
                                {modal === 'social' ? 'Social Media Links' : modal === 'champ' ? 'Champion Student' : modal === 'news' ? 'Upload Newsletter' : 'Upload Gallery Media'}
                            </h3>
                            <button onClick={() => setModal(null)} className="text-slate-400 hover:bg-white hover:text-slate-700 p-1.5 rounded-lg border border-transparent hover:border-slate-200 transition-all">✕</button>
                        </div>

                        <div className="p-6">
                            {/* SOCIAL MODAL */}
                            {modal === "social" && (
                                <div className="space-y-4">
                                    {[{ name: "Instagram", variable: "insta", color: "pink" }, { name: "Whatsapp", variable: "whatsapp", color: "green" }, { name: "Linkedin", variable: "linkedin", color: "blue" }, { name: "Twitter", variable: "twitter", color: "sky" }].map((item) => (
                                        <div key={item.variable}>
                                            <label className={`text-sm font-bold text-${item.color}-600 mb-1.5 block`}>{item.name}</label>
                                            <input type="url" placeholder={`https://${item.name.toLowerCase()}.com/...`} value={social?.[item.variable] || ""} onChange={(e) => setNewSocial({ ...social, [item.variable]: e.target.value })} className="w-full border border-slate-300 rounded-xl p-3 focus:ring-4 focus:ring-slate-100 focus:border-slate-500 outline-none transition-all shadow-sm" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* NEWSLETTER MODAL */}
                            {modal === "news" && (
                                <div className="space-y-6">
                                    <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/30 rounded-2xl p-8 text-center hover:bg-emerald-50 transition-colors">
                                        <input type="file" id="newsUpload" accept=".pdf,.doc,.docx" className="hidden" onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const url = await handleFileUpload(file);
                                            if (url) setNewNews([...news, { letter: url }]);
                                        }} />
                                        <label htmlFor="newsUpload" className="cursor-pointer flex flex-col items-center justify-center">
                                            <div className="p-4 bg-white rounded-full shadow-sm mb-4 text-emerald-600"><Plus size={24} /></div>
                                            <p className="font-bold text-slate-800">Click to upload document</p>
                                            <p className="text-xs text-slate-500 mt-1">PDF or DOCX only</p>
                                        </label>
                                    </div>
                                    {news.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-slate-700">Files to upload:</p>
                                            {news.map((item, i) => (
                                                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                                                    <span className="truncate text-blue-600 font-medium">Document {i+1} Ready</span>
                                                    <button onClick={() => { const u = [...news]; u.splice(i, 1); setNewNews(u); }} className="text-rose-500"><Trash2 size={16} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* GALLERY MODAL */}
                            {modal === "gallery" && (
                                <div className="space-y-6">
                                    <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl p-8 text-center hover:bg-indigo-50 transition-colors">
                                        <input type="file" id="galUpload" accept="image/*" className="hidden" onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const url = await handleFileUpload(file);
                                            if (url) setNewGallery([...gallery, { url }]);
                                        }} />
                                        <label htmlFor="galUpload" className="cursor-pointer flex flex-col items-center justify-center">
                                            <div className="p-4 bg-white rounded-full shadow-sm mb-4 text-indigo-600"><ImageIcon size={24} /></div>
                                            <p className="font-bold text-slate-800">Click to upload image</p>
                                            <p className="text-xs text-slate-500 mt-1">JPG, PNG, GIF</p>
                                        </label>
                                    </div>
                                    {gallery.length > 0 && (
                                        <div className="grid grid-cols-4 gap-3">
                                            {gallery.map((item, i) => (
                                                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                                                    <img src={item.url} className="w-full h-full object-cover" alt="Preview" />
                                                    <button onClick={() => { const u = [...gallery]; u.splice(i, 1); setNewGallery(u); }} className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-md shadow-sm"><Trash2 size={12}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CHAMPION MODAL */}
                            {modal === "champ" && (
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-sm font-bold text-slate-700 mb-1.5 block">Search Student</label>
                                        <input placeholder="Search by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm" />
                                    </div>
                                    <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto bg-slate-50/50">
                                        {students?.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((stud) => {
                                            const classe = classes?.find((c) => c.id == stud.classes?.[0]);
                                            const isSelected = champ?.studentId == stud.id;
                                            return (
                                                <div key={stud.id} onClick={() => setNewChamp({ ...champ, studentId: stud.id })} className={`flex justify-between items-center p-3 cursor-pointer border-b border-slate-100 transition-colors ${isSelected ? "bg-amber-50" : "hover:bg-white"}`}>
                                                    <div>
                                                        <p className={`text-sm ${isSelected ? 'font-bold text-amber-900' : 'font-medium text-slate-800'}`}>{stud.name}</p>
                                                        <p className="text-xs text-slate-500">{classe ? `Class ${classe.className}-${classe.section}` : "No Class"}</p>
                                                    </div>
                                                    {isSelected && <span className="text-amber-600"><CheckCircle size={18} /></span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-slate-700 mb-1.5 block">Achievement / Game Name</label>
                                        <input placeholder="e.g. 100m Sprint" value={champ?.gameName || ""} onChange={(e) => setNewChamp({ ...champ, gameName: e.target.value })} className="w-full border border-slate-300 rounded-xl p-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Level</label>
                                            <input placeholder="State / National" value={champ?.type || ""} onChange={(e) => setNewChamp({ ...champ, type: e.target.value })} className="w-full border border-slate-300 rounded-xl p-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Score / Detail</label>
                                            <input placeholder="e.g. Gold Medal" value={champ?.marks || ""} onChange={(e) => setNewChamp({ ...champ, marks: e.target.value })} className="w-full border border-slate-300 rounded-xl p-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setModal(null)} className="px-5 py-2.5 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-colors">Cancel</button>
                            <button onClick={() => {
                                if (modal === 'social') handleSubmit({ social });
                                else if (modal === 'champ') handleSubmit({ champ });
                                else if (modal === 'news') handleSubmit({ news });
                                else if (modal === 'gallery') handleSubmit({ gallery });
                            }} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-medium shadow-md shadow-slate-900/20 transition-all active:scale-95 flex items-center gap-2">
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
